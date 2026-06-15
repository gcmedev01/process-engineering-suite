# Database Schema

> Reflects the SQLAlchemy models as of 2026-06-12. The Alembic chain is a single
> head (`202606120003`). See **Schema Maintenance Notes** at the end.

## Core Hierarchy
- **Customer**: Root entity (e.g., "PTT", "Chevron").
- **Plant**: Physical location (e.g., "Rayong Refinery").
- **Unit**: Process unit (e.g., "CDU-1").
- **Area**: Logical area within a unit.
- **Project**: Engineering project context.

## Protective Systems (PSV)
### `protective_systems`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| area_id | uuid | FK -> areas.id (CASCADE) |
| owner_id | uuid | FK -> users.id |
| tag | varchar | e.g. "PSV-1001" |
| status | enum | draft, in_review, checked, approved, issued |
| current_revision_id | uuid | FK -> revision_history.id, nullable |
| is_active | boolean | Soft-delete flag |
| deleted_at | timestamptz | Soft-delete timestamp |
| ... | ... | (set_pressure, mawp, design_code, fluid_phase, networks — details in code) |

> **Projects link is many-to-many**, not a `project_id` FK. The join table
> `protective_system_projects(protective_system_id, project_id)` associates a
> PSV with one or more projects. The `project_ids` API field is derived from it.
>
> **Uniqueness:** `(area_id, tag)` is unique only among live rows via the
> partial unique index `uq_protective_systems_area_id_tag WHERE deleted_at IS
> NULL` (migration `202606110002`), so a tag freed by soft-delete can be reused.

### `overpressure_scenarios`
(Table name is `overpressure_scenarios`; the ORM model is `OverpressureScenario`.)

| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| protective_system_id | uuid | FK -> protective_systems.id |
| current_revision_id | uuid | FK -> revision_history.id, nullable |
| cause | varchar | blocked_outlet, fire_case, etc. |
| required_capacity | decimal | calculated required flow |
| is_active | boolean | Logical active flag |

### `sizing_cases`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| protective_system_id | uuid | FK -> protective_systems.id |
| scenario_id | uuid | FK -> overpressure_scenarios.id |
| current_revision_id | uuid | FK -> revision_history.id, nullable |
| created_by | uuid | FK -> users.id |
| approved_by | uuid | FK -> users.id, nullable |
| standard | varchar | API-520, etc. |
| status | enum | draft, calculated, verified |
| is_active | boolean | Logical active flag |

## Pipeline Configuration

> ⚠️ **Not yet implemented.** The tables below are a forward-looking design.
> There are no SQLAlchemy models or migrations for `pipelines`,
> `pipeline_segments`, `fittings_catalog`, or `pipe_schedule`. PSV inlet/outlet
> hydraulics are currently stored as JSONB on `protective_systems`
> (`inlet_network`, `outlet_network`). Keep this section as a design reference.

### `pipelines`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| sizing_case_id | uuid | FK -> sizing_cases.id |
| type | enum | inlet, outlet |
| fluids_model | jsonb | Fluid properties override (optional) |

### `pipeline_segments`
| Column | Type | Description |
|---|---|---|
| id | uuid | PK |
| pipeline_id | uuid | FK -> pipelines.id |
| sequence_order | int | 1, 2, 3... order from source to PSV (inlet) or PSV to disch (outlet) |
| type | enum | pipe, fitting, valve, reducer, expander |
| component_name | varchar | e.g. "4-inch Pipe", "90 deg Elbow" |
| nominal_size | varchar | e.g. "4", "6" |
| schedule | varchar | e.g. "40", "80", "STD" |
| length | decimal | Length in meters (for pipes) |
| elevation_change | decimal | Vertical change (+ up, - down) |
| equivalent_length | decimal | Calculated/User override Le |
| quantity | int | For fittings (e.g. 2 elbows) |

## Reference Data
- **`fittings_catalog`**: Standard Le/D or K values for fittings.
- **`pipe_schedule`**: ID, OD, Wall Thickness.

---

## Engineering Objects (Unified Object Store)
### `engineering_objects`
Single source of truth for process equipment and calculator-linked objects.

| Column | Type | Notes |
|---|---|---|
| uuid | uuid | PK (canonical object identity) |
| tag | varchar | Plant tag, normalized uppercase. Uniqueness is scoped per area among live rows (see Uniqueness note below) |
| object_type | varchar | Object discriminator, e.g. `TANK`, `VESSEL`, `PUMP`, `INSTRUMENT`, `VESSEL_CALCULATION` |
| area_id | uuid | FK → areas.id (SET NULL), nullable |
| owner_id | uuid | FK → users.id (SET NULL), nullable |
| name | varchar(255) | Display name |
| description | text | Optional free-text |
| location_ref | varchar(255) | Optional location reference |
| status | varchar | Lifecycle/status label |
| is_active | boolean | Soft-delete flag |
| deleted_at | timestamptz | Soft-delete timestamp |
| properties | jsonb | Flexible payload. Equipment details are under `properties.details` |
| project_id | uuid | FK → projects.id, nullable |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Canonical design parameters (JSONB):** `properties.design_parameters`
- `designPressure`
- `designPressureUnit`
- `mawp`
- `mawpUnit`
- `designTemperature`
- `designTempUnit`

**Uniqueness (migration `202606120002`):** The old global `uq_engineering_objects_tag` was replaced with two partial indexes:
- `uq_engineering_objects_area_tag_live ON (area_id, tag) WHERE deleted_at IS NULL AND area_id IS NOT NULL` — two areas may both have "V-100".
- `uq_engineering_objects_tag_global_live ON (tag) WHERE deleted_at IS NULL AND area_id IS NULL` — unassigned objects keep global uniqueness so upsert-by-tag stays unambiguous.
Soft-deleting a tag frees it for reuse in the same area.

**INSTRUMENT object_type:** Use `object_type = 'INSTRUMENT'` with a required `properties.details.instrumentType` discriminator (`pressure_transmitter`, `temperature_transmitter`, `level_transmitter`, `flow_transmitter`, `flow_meter`, `control_valve`, `analyzer`, `switch`, `gauge`, `other`). Strict 422 validation is enforced for INSTRUMENT on PUT/PATCH. Relationships to other objects use the `instrument_links` table.

**Property validation** (`app/services/object_properties.py`): INSTRUMENT payloads are always validated strictly (422 on error). Legacy types (TANK, VESSEL, PUMP) log warnings and proceed unless `EO_STRICT_PROPERTY_VALIDATION=true`.

**Indexes:** `uq_engineering_objects_area_tag_live`, `uq_engineering_objects_tag_global_live`, `ix_engineering_objects_area_id`, `ix_engineering_objects_owner_id`, `ix_engineering_objects_properties_gin`

### `instrument_links`
Directed relationship from an `INSTRUMENT` engineering_object to any other engineering object. Hard-deleted (no `deleted_at`).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| instrument_id | uuid | FK → engineering_objects.uuid (CASCADE) — must be a live INSTRUMENT |
| target_id | uuid | FK → engineering_objects.uuid (CASCADE) — any live object |
| relationship_type | varchar(32) | `measures`, `controls`, `mounted_on`, `interlocked_with` — enforced by CHECK constraint |
| protective_system_id | uuid | FK → protective_systems.id (SET NULL), optional |
| notes | text | Optional free-text |
| created_at, updated_at | timestamptz | Auto |

**Uniqueness:** `uq_instrument_links_triple ON (instrument_id, target_id, relationship_type)` — duplicate (instrument, target, relationship) → 409.
**Indexes:** `ix_instrument_links_instrument_id`, `ix_instrument_links_target_id`, `ix_instrument_links_protective_system_id`
**API:** `GET /instrument-links?instrumentId=&targetId=&relationshipType=&protectiveSystemId=`, `POST /instrument-links` (validates INSTRUMENT type → 422), `PATCH /instrument-links/{id}`, `DELETE /instrument-links/{id}`.

### Compatibility Layer
- `/legacy/equipment` is the documented compatibility path during transition.
- `/equipment` root has been removed from the API surface.
- Backend now persists equipment reads/writes in `engineering_objects`.
- `equipment.id` compatible UUIDs are preserved during backfill into `engineering_objects.uuid`.
- Existing clients can continue using `id`, `type`, `details` payload shape.
- New clients should use `/engineering-objects` directly.

### FK Changes
- `equipment_links.equipment_id` now references `engineering_objects.uuid`.
- `venting_calculations.equipment_id` now references `engineering_objects.uuid`.

---

## Shared Calculation Persistence
Saved app calculations now use a hybrid persistence model. The fast current snapshot lives in `calculations`, and immutable audit history lives in `calculation_versions`.

### `calculations`
Current, list-friendly record for each saved calculation.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| app | varchar(100) | App discriminator, e.g. `pump-calculation`, `vessels-calculation`, `venting-calculation` |
| area_id | uuid | FK → areas.id (SET NULL), nullable |
| owner_id | uuid | FK → users.id (SET NULL), nullable |
| name | varchar(255) | Human-readable calculation name |
| description | text | Optional free-text |
| status | varchar(50) | App or workflow status |
| tag | varchar(255) | Optional business tag |
| is_active | boolean | Soft-delete flag |
| deleted_at | timestamptz | Soft-delete timestamp |
| linked_equipment_id | uuid | FK → engineering_objects.uuid (SET NULL), nullable |
| linked_equipment_tag | varchar(255) | Denormalized equipment tag for list views |
| latest_version_no | integer | Current version sequence number |
| latest_version_id | uuid | FK → calculation_versions.id, nullable |
| current_input_snapshot | jsonb | Canonical saved input payload |
| current_result_snapshot | jsonb | Latest calculated results payload |
| current_metadata | jsonb | App-specific metadata |
| project_id | uuid | FK → projects.id (SET NULL), nullable — register field |
| calc_number | varchar(64) | Register document number, e.g. "PRJ-001-PR-003" — nullable |
| discipline | varchar(50) | Register discipline: process, mechanical, safety, instrumentation, electrical, civil, piping — nullable |
| current_revision_id | uuid | FK → revision_history.id (SET NULL, use_alter), nullable — pointer to current normalized revision |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

> **`current_revision_history` was dropped** (migration `202605040002`). Revision
> history is no longer denormalized onto `calculations`; the canonical copy lives
> in `calculation_versions.revision_history`. The `/calculations` API still
> returns a `revisionHistory` field, sourced from the latest version.
>
> **Register fields** (migration `202606120001`): `project_id`, `calc_number`, `discipline`, and `current_revision_id` were added for the calculation register. `calc_number` is lifted from `current_metadata.documentNumber` server-side if not explicitly supplied. Partial unique index `uq_calculations_project_calc_number_live ON (project_id, calc_number) WHERE deleted_at IS NULL AND project_id IS NOT NULL AND calc_number IS NOT NULL` enforces uniqueness per project among live rows. Duplicate → 409.

**Indexes:** `ix_calculations_app`, `ix_calculations_area_id`, `ix_calculations_owner_id`, `ix_calculations_tag`, `ix_calculations_linked_equipment_id`, `ix_calculations_project_id`, `ix_calculations_calc_number`, `ix_calculations_discipline`, `ix_calculations_current_revision_id`
**Register API:** `GET /calculations/next-number?projectId=&discipline=` returns `{nextNumber, sequence, pattern}` for sequential numbering. `GET /calculations?projectId=&discipline=&calcNumber=&status=` filters the register list.

### `calculation_versions`
Append-only version history for audit, compare, and restore.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| calculation_id | uuid | FK → calculations.id (CASCADE) |
| version_no | integer | Monotonic per-calculation version number |
| version_kind | varchar(50) | `save`, `autosave`, `restore`, `import`, `migration` |
| inputs | jsonb | Immutable input snapshot |
| results | jsonb | Immutable results snapshot |
| metadata | jsonb | Immutable metadata snapshot |
| revision_history | jsonb | Immutable revision history snapshot |
| linked_equipment_id | uuid | FK → engineering_objects.uuid (SET NULL), nullable |
| linked_equipment_tag | varchar(255) | Equipment tag at save time |
| source_version_id | uuid | Optional lineage pointer for restore/import (FK -> calculation_versions.id, SET NULL) |
| change_note | text | Optional user/system note |
| created_at | timestamptz | Auto |

**Indexes:** `ix_calculation_versions_calculation_id`, `ix_calculation_versions_source_version_id`, `ix_calculation_versions_linked_equipment_id` (last two added in migration `202606110003`), unique `(calculation_id, version_no)`

### Behavior
- Every save creates a new row in `calculation_versions` and updates the cached current snapshot in `calculations`.
- Restore does not mutate historical rows. It creates a new latest version derived from a selected old version.
- Default lists only return active calculations. Soft-deleted calculations keep their version history.
- Clients should save and load the full canonical payload instead of rebuilding forms from field-by-field mappings.

### Compatibility
- `apps/pump-calculation`, `apps/vessels-calculation`, `apps/venting-calculation`, and `apps/calculation-template` now use the shared `/calculations` API.
- Legacy `/venting` endpoints remain available and are backed by the same `calculations` / `calculation_versions` storage.

---

## App-Specific Resources
These three tables were added (migration `202602250001`) to give the stateless frontend apps persistent storage via the same centralised API.

### `venting_calculations`
Legacy compatibility table for older API 2000 tank venting flows. New save/load behavior is backed by the shared calculation store above.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| area_id | uuid | FK → areas.id (SET NULL), nullable |
| equipment_id | uuid | FK → engineering_objects.uuid (SET NULL), nullable |
| owner_id | uuid | FK → users.id, nullable (no auth in this app yet) |
| name | varchar(255) | Human-readable label, e.g. "T-101 Rev 0" |
| description | text | Optional free-text |
| status | enum | `draft` \| `in_review` \| `approved` (default `draft`) |
| inputs | jsonb | Full `CalculationInput` shape from the frontend |
| results | jsonb | Full `CalculationResult` shape (null until calculated) |
| api_edition | varchar(10) | `5TH` \| `6TH` \| `7TH` (default `7TH`) |
| is_active | boolean | Soft-delete flag (default `true`) |
| deleted_at | timestamptz | Set on soft-delete, null otherwise |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Indexes:** `ix_venting_calculations_area_id`, `ix_venting_calculations_owner_id`
**Compatibility status:** current API behavior for venting is implemented through the shared `calculations` service layer. Keep this table documented for migration/reference work only.

---

### `network_designs`
Stores saved hydraulic network editor designs from `apps/network-editor` (port 3002).

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| area_id | uuid | FK → areas.id (SET NULL), nullable |
| owner_id | uuid | FK → users.id, nullable |
| name | varchar(255) | Human-readable label |
| description | text | Optional free-text |
| network_data | jsonb | Full `NetworkState` (nodes + pipes + fluid + project details) |
| node_count | int | Cached count for list display (default 0) |
| pipe_count | int | Cached count for list display (default 0) |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Indexes:** `ix_network_designs_area_id`, `ix_network_designs_owner_id`
**Delete:** Hard delete only (no soft-delete).

---

### `design_agent_sessions`
Stores saved workflow sessions for `apps/design-agents`.

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| owner_id | uuid | FK → users.id, nullable |
| name | varchar(255) | Human-readable session name |
| description | text | Optional free-text |
| state_data | jsonb | Full `DesignState` from the Zustand store |
| active_step_id | varchar(100) | Current active workflow step ID, nullable |
| completed_steps | text[] | Array of completed step IDs |
| status | enum | `active` \| `completed` \| `archived` (default `active`) |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

**Indexes:** `ix_design_agent_sessions_owner_id`
**Delete:** Hard delete only.

---

## Schema Maintenance Notes

### Migration chain
- **Single head, single root.** The DAG has exactly one root (`202412120001`)
  and one head (`202606120003`), so `alembic upgrade head` is unambiguous and
  safe. (Verify any time with `alembic heads` — it should print one revision.)
- The chain forks and re-merges twice, but both forks are reconciled by merge
  nodes, so there are no dangling heads:
  - `add_project_notes` and `add_case_consideration` both branch off
    `202412120001` and are **reconciled by the 3-way merge node
    `add_rev_and_equip_details` (`202512150001`)** — they are not orphan heads.
  - The two long-lived branches that forked around `202412150001` re-merge at
    `202606110001` (see below).
  - All branch migrations use `IF [NOT] EXISTS` guards, so applying any
    previously-unapplied branch migration is idempotent-safe.
- `202606110001` — merge node reconciling two branches that forked at
  `202412150001`. No schema ops; each branch's migrations applied individually
  with `IF [NOT] EXISTS` guards.
- `202606110002` — replaces `uq_protective_systems_area_id_tag` with a partial
  unique index (`WHERE deleted_at IS NULL`).
- `202606110003` — adds 33 FK indexes. Idempotent (`IF NOT EXISTS`).
- `202606120001` — calculation register: `project_id`, `calc_number`,
  `discipline`, `current_revision_id` on `calculations`; `*_by_name` columns on
  `revision_history`; backfill from JSONB; partial unique on `(project_id, calc_number)`.
- `202606120002` — `engineering_objects.tag` scoped per area: drops global
  unique, creates two partial unique indexes. **Downgrade fails** if cross-area
  duplicate live tags were created after the upgrade.
- `202606120003` — adds `instrument_links` table.

### Foreign-key indexing
FK columns are indexed either by `index=True` on the model column or by being
the leading column of a composite index/constraint. After `202606110003`,
every FK column has a covering index.

### Legacy equipment tables — deprecation notice
The following tables are kept for backward compatibility but **read-only going forward**. New equipment data should use `engineering_objects` directly.

| Table | Notes |
|---|---|
| `equipment` | Legacy equipment master. Dual-written by API for non-INSTRUMENT objects during the transition period. **Not written for `object_type = INSTRUMENT`**. |
| `equipment_vessels`, `equipment_tanks`, `equipment_pumps`, `equipment_compressors`, `equipment_columns`, `equipment_vendor_packages` | Subtype detail tables. Mirrored from `engineering_objects.properties.details` during dual-write. |

Dropping these tables is deferred to a future migration once frontends are confirmed to read exclusively from `engineering_objects`.

### Known model/migration drift (pre-existing, low impact)
A few indexes created by older migrations are not declared on their models, so
`alembic revision --autogenerate` may report spurious diffs:
`ix_protective_systems_deleted_at`, `ix_revision_history_entity`,
`ix_audit_logs_action`. The old `uq_engineering_objects_tag` is now replaced by
partial indexes — autogenerate may still report a diff if the DB was migrated
from a version that declared both. Reconcile when next touching those models.
