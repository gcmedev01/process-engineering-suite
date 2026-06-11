# PSE Web DNA
> Design & architecture reference for all `apps/` in the process-engineering-suite monorepo.
> Derived from `apps/venting-calculation`. Follow these patterns when building new apps.
> **Template:** Use `apps/calculation-template` as the foundation for all new calculator-style web apps.
> **Persistence rule:** New calculator-style web apps must use the shared `/calculations` API backed by `calculations` and `calculation_versions` for database save/load.

---

## 1. Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, `'use client'` where needed) |
| UI library | shadcn/ui (Radix primitives + Tailwind) |
| Styling | Tailwind CSS v4, CSS custom properties, utility-first |
| Forms | React Hook Form + Zod resolver |
| State | Zustand + `persist` middleware (localStorage) |
| Unit conversion | `@eng-suite/physics` → `convertUnit(value, from, to)` |
| Icons | `lucide-react` |
| Types | TypeScript strict, inferred from Zod schemas |

---

## 2. Page Layout

Every calculator app uses a **three-tier layout**:

```
┌─ TopToolbar (layout.tsx) ─────────────────────────────────────────┐
│  [Icon]  App Title                              [☀/🌙 toggle]     │
│          Subtitle                                                   │
└────────────────────────────────────────────────────────────────────┘
┌─ secondary action bar (page.tsx) ─────────────────────────────────┐
│  Descriptor Label                                      [≡ Actions ▾]│
└────────────────────────────────────────────────────────────────────┘
┌─ left panel (inputs) ────────┬─ right panel (results) ─────────────┐
│  CalculationMetadataSection  │  Empty/ValidationIssues/Results      │
│  SectionCard                 │                                      │
│  SectionCard                 │  DesignSummaryCard                   │
│  ...                         │  DetailResult1                       │
│                              │  DetailResult2                       │
└──────────────────────────────┴──────────────────────────────────────┘
```

**layout.tsx** — TopToolbar lives here, wrapped in the sticky MUI Box:
```tsx
// app/layout.tsx
import { Box } from "@mui/material"
import { Providers } from "./providers"
import { TopToolbar } from "@/components/TopToolbar"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Box
            sx={{
              position: "sticky",
              top: 0,
              zIndex: 1000,
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(4px)",
              "@media print": { display: "none" },
            }}
          >
            <TopToolbar />
          </Box>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

**page.tsx** — secondary action bar + two-column grid:
```tsx
// calculator/page.tsx
<FormProvider {...form}>
  <main className="min-h-screen bg-background">
    {/* Secondary action bar — left descriptor + Actions menu */}
    <div className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Descriptor Text</p>
        <ActionMenu ... />
      </div>
    </div>

    {/* Two-column grid */}
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <InputPanel metadata={...} onMetadataChange={...} revisionHistory={...} onRevisionHistoryChange={...} />
        <ResultsPanel calculationResult={calculationResult} />
      </div>
    </div>
  </main>
</FormProvider>
```

**Rules:**
- `TopToolbar` always in `layout.tsx`, not `page.tsx`; wrapped in the sticky MUI `Box` (see §3.0)
- Secondary action bar contains a left descriptor label and `<ActionMenu>` on the right
- Single column on mobile, two columns at `xl` (1280 px)
- `items-start` prevents stretching of shorter panel
- Inputs always left, results always right
- `CalculationMetadataSection` is always the **first** section in `InputPanel`

---

## 3. Core Components

### 3.0 `TopToolbar` — Sticky branding + theme toggle

`TopToolbar.tsx` renders `<TopFloatingToolbar />` directly — **no wrapper div**. The sticky Box lives in `layout.tsx` (see §2 above). This matches the `apps/web` pattern exactly.

`TopFloatingToolbar` (from `@eng-suite/ui-kit`) provides the visual spec built-in:
- Left — gradient icon box (40×40, `border-radius: 12px`, `linear-gradient(#00C4F9, #0076F0)`)
- Left — title (`h6`, `fontWeight: 700`) + subtitle (`caption`, `text.secondary`)
- Right — glassmorphism theme toggle button
- Bottom border + `boxShadow` + `backdropFilter: blur(10px)`

```tsx
// src/components/TopToolbar.tsx
"use client"
import { useTheme } from "@mui/material"
import { TopFloatingToolbar } from "@eng-suite/ui-kit"
import CalculateIcon from "@mui/icons-material/Calculate"  // TODO: replace per app
import { useColorMode } from "@/contexts/ColorModeContext"

export function TopToolbar() {
  const theme = useTheme()
  const { toggleColorMode } = useColorMode()
  const isDark = theme.palette.mode === "dark"

  return (
    <TopFloatingToolbar
      title="App Title"    // TODO: replace per app
      subtitle="Subtitle"  // TODO: replace per app
      icon={<CalculateIcon fontSize="medium" />}  // TODO: replace per app
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  )
}
```

**Per-app TODO:** replace icon, title, subtitle. Do **not** add a wrapper div — sticky/print/shadow are owned by the `Box` in `layout.tsx`.

---

### 3.0b `Providers` + `ColorModeContext` — Theme context

`src/app/providers.tsx` exports both `Providers` (wrap entire app) and `useColorMode` (consumed by `TopToolbar`).

- Reads/writes `"ept-pes-theme"` in localStorage (`"dark"` default)
- Syncs `.dark` class on `<html>` for Tailwind dark mode
- `ColorModeContext` exposes `{ mode, toggleColorMode }`

```tsx
// app/providers.tsx
export const ColorModeContext = React.createContext<{ mode, toggleColorMode }>({...})
export const useColorMode = () => React.useContext(ColorModeContext)

export function Providers({ children }) {
  const [mode, setMode] = React.useState<"light"|"dark">("dark")
  // useEffect: hydrate from localStorage
  // useEffect: toggle .dark on <html>
  const toggleColorMode = React.useCallback(() => {
    setMode(prev => { const next = prev === "light" ? "dark" : "light"; localStorage.setItem("ept-pes-theme", JSON.stringify(next)); return next })
  }, [])
  return (
    <ColorModeContext.Provider value={{ mode, toggleColorMode }}>
      <div className="min-h-screen bg-background text-foreground antialiased font-sans">{children}</div>
    </ColorModeContext.Provider>
  )
}
```

---

### 3.0c `CalculationMetadataSection` — Calculation header card

**Always the first section in `InputPanel`.** Lives in `calculator/components/CalculationMetadataSection.tsx`.

Displays project/document metadata and revision history. Editing happens via two dialogs ("Edit Revisions", "Edit Metadata") opened from buttons in the `SectionCard` `action` slot.

**Props:**
```ts
interface Props {
  metadata: CalculationMetadata          // { projectNumber, documentNumber, title, projectName, client }
  onMetadataChange: (m: CalculationMetadata) => void
  revisionHistory: RevisionRecord[]      // max 3, each: { rev, by, byDate, checkedBy, checkedDate, approvedBy, approvedDate }
  onRevisionHistoryChange: (r: RevisionRecord[]) => void
}
```

**State lives in `page.tsx`** (not in the form):
```tsx
const [calculationMetadata, setCalculationMetadata] = useState<CalculationMetadata>(EMPTY_METADATA)
const [revisionHistory, setRevisionHistory] = useState<RevisionRecord[]>([])
// passed down: InputPanel → CalculationMetadataSection
```

**Display layout:**
- 2-column grid: Project Number, Document Number, Title, Project Name, Client, Revision Records count
- Revision history table (Rev, By, Date, Checked, Date, Approved, Date) — read-only
- `Metadata completeness: n/5 fields` footer

**Edit Revisions dialog:** inline table editing with up/down/delete row buttons, Add Revision button (max 3), Save/Cancel footer.

**Edit Metadata dialog:** 5 labeled `<Input>` fields, Cancel + Save Metadata footer.

**`normalizeRevisionHistory`:** trims whitespace, drops blank rows, slices to 3.

---

### 3.1 `SectionCard` — Section wrapper

Every major form group and result group lives in a SectionCard.

```tsx
interface SectionCardProps {
  title: string
  children: React.ReactNode
  action?: React.ReactNode   // right-aligned element in header (Badge, button, Select…)
  className?: string
}

// Rendered structure
<Card className="shadow-sm">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between gap-2">
      <CardTitle className="text-base font-semibold">{title}</CardTitle>
      {action}
    </div>
    <Separator />
  </CardHeader>
  <CardContent className="space-y-4">
    {children}
  </CardContent>
</Card>
```

**Key:**
- `shadow-sm` always present on Cards
- `space-y-4` for content spacing
- Separator after every header

---

### 3.2 `FieldRow` — Labeled form field

Wraps every single input field. Handles label, unit badge, hint, error.

```tsx
interface FieldRowProps {
  label: string
  htmlFor?: string
  required?: boolean
  unit?: React.ReactNode      // static unit badge, e.g. "°" or "g/mol"
  hint?: string               // shown below input when no error
  error?: string              // shown below input in red
  children: React.ReactNode
  className?: string
}

// Rendered structure
<div className={cn("space-y-1", className)}>
  <Label htmlFor={htmlFor} className="text-sm font-medium leading-none">
    {label}
    {required && <span className="text-destructive ml-0.5">*</span>}
  </Label>
  <div className="flex items-center gap-2">
    <div className="flex-1">{children}</div>
    {unit && (
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{unit}</span>
    )}
  </div>
  {error  && <p className="text-xs text-destructive">{error}</p>}
  {!error && hint && <p className="text-xs text-muted-foreground">{hint}</p>}
</div>
```

---

### 3.3 `UomInput` — Unit-convertible numeric input

Use for every numeric field that has a physical unit. The form **always stores base units**; conversion is display-layer only.

```tsx
interface UomInputProps {
  name: keyof CalculationInput  // React Hook Form field name
  category: UomCategory         // 'length' | 'temperature' | etc.
  id?: string
  placeholder?: string
  disabled?: boolean
}

// Internal logic
const { units, setUnit } = useUomStore()
const displayUnit = units[category]

// On render: baseValue → convertUnit(base, baseUnit, displayUnit) → shown
// On change: rawInput → convertUnit(raw, displayUnit, baseUnit) → stored
```

```tsx
// Rendered structure
<div className="flex items-center gap-1.5">
  <Input
    className="flex-1"
    type="number"
    step="any"
    value={convertUnit(field.value, BASE_UNITS[category], displayUnit).toFixed(6)}
    onChange={e => field.onChange(convertUnit(+e.target.value, displayUnit, BASE_UNITS[category]))}
  />
  <Select value={displayUnit} onValueChange={u => setUnit(category, u)}>
    <SelectTrigger className="h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap">
      <SelectValue>{UOM_LABEL[displayUnit] ?? displayUnit}</SelectValue>
    </SelectTrigger>
    <SelectContent>
      {UOM_OPTIONS[category].map(u => (
        <SelectItem key={u} value={u} className="text-xs">
          {UOM_LABEL[u] ?? u}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

**Rules:**
- SelectTrigger: `h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap`
- SelectItem: `text-xs`
- Input precision displayed: `toFixed(6)` prevents rounding artifacts
- Changing units must NOT re-convert the stored base value

---

## 4. UoM System

### 4.1 Base units (always stored in form)

```ts
// lib/uom.ts
export const BASE_UNITS: Record<UomCategory, string> = {
  length:              'mm',
  gaugePressure:       'kPag',
  absolutePressure:    'kPa',
  temperature:         'C',
  volumeFlow:          'm3/h',
  ventRate:            'Nm3/h',
  energy:              'kJ/kg',
  thermalConductivity: 'W/(m·K)',
  heatTransferCoeff:   'W/(m²·K)',
  time:                'hour', 
  // add new categories here
}
```

### 4.2 Available units per category

```ts
export const UOM_OPTIONS: Record<UomCategory, string[]> = {
  length:              ['mm', 'in', 'm', 'cm', 'ft'],
  gaugePressure:       ['kPag', 'barg', 'psig', 'kg/cm2g'],
  absolutePressure:    ['kPa', 'bar', 'psi', 'atm'],
  temperature:         ['C', 'F', 'K'],
  volumeFlow:          ['m3/h', 'ft3/h'],
  ventRate:            ['Nm3/h', 'MSCFD', 'ft3/h'],
  energy:              ['kJ/kg', 'kcal/kg', 'Btu/lb'],
  thermalConductivity: ['W/(m·K)', 'Btu/(h·ft·°F)', 'kcal/(h·m·K)'],
  heatTransferCoeff:   ['W/(m²·K)', 'Btu/(h·ft²·°F)', 'kcal/(h·m²·K)'],
  // …add more as needed
}
```

### 4.3 Display labels (ASCII → unicode)

```ts
export const UOM_LABEL: Record<string, string> = {
  'mm': 'mm',   'in': 'in',   'm': 'm',   'cm': 'cm',   'ft': 'ft',
  'C': '°C',    'F': '°F',    'K': 'K',
  'kPag': 'kPag', 'barg': 'barg', 'psig': 'psig',
  'm3/h': 'm³/h',  'ft3/h': 'ft³/h',
  'Nm3/h': 'Nm³/h',  'MSCFD': 'MSCFD',
  'kJ/kg': 'kJ/kg', 'kcal/kg': 'kcal/kg', 'Btu/lb': 'Btu/lb',
  'W/(m·K)': 'W/(m·K)',
  'W/(m²·K)': 'W/(m²·K)',
  // …add more as needed
}
```

### 4.4 uomStore

```ts
// lib/store/uomStore.ts
export const useUomStore = create<UomState>()(
  persist(
    (set) => ({
      units: { ...BASE_UNITS },
      setUnit: (category, unit) =>
        set(s => ({ units: { ...s.units, [category]: unit } })),
    }),
    {
      name: 'APP_NAME-uom-prefs',   // ← change per app
      migrate: (persistedState: any) => {
        // always merge — adds missing categories on schema evolution
        if (persistedState?.state?.units) {
          persistedState.state.units = { ...BASE_UNITS, ...persistedState.state.units }
        }
        return persistedState
      },
    }
  )
)
```

**Critical:** always include `migrate` so new categories don't silently drop.

---

## 5. Form Architecture

### 5.1 Setup (`page.tsx`)

```tsx
const form = useForm<CalculationInput>({
  resolver: zodResolver(calculationInputSchema),
  defaultValues: createDefaultValues(),
  mode: 'onChange',
})

return (
  <FormProvider {...form}>
    <form onSubmit={...}>
      <InputPanel />
      <ResultsPanel />
    </form>
  </FormProvider>
)
```

### 5.2 Field patterns

| Scenario | Pattern |
|---|---|
| Simple text / number | `{...register("fieldName", { valueAsNumber: true })}` |
| Unit-convertible number | `<Controller name="…"> → <UomInput />` |
| Enum / select | `<Controller name="…"> → <Select />` |
| Dynamic list | `useFieldArray` + `fields.map(…)` |
| Conditional fields | `const value = watch("field")` → conditional render |

### 5.3 Validation schema (`inputSchema.ts`)

```ts
export const calculationInputSchema = z.object({
  // always in base units
  diameter: z.number().positive(),
  // NaN-tolerant optional pattern
  latentHeat: z.number().positive().optional().or(z.nan().transform(() => undefined)),
}).superRefine((data, ctx) => {
  // cross-field validations here
})
```

**Rules:**
- All numeric fields validated in **base units**
- Empty numeric inputs produce `NaN` via `valueAsNumber` — use `nanOptional*` helpers
- Cross-field logic in `.superRefine()` (e.g., insulation fields required when insulated)

---

## 6. Results / Output Display

### 6.1 Results panel state machine

```
calculationResult === null && validationIssues === null
  → <RequirementsChecklist />   (show what the user still needs to fill)

calculationResult === null && validationIssues.length > 0
  → <ValidationIssuesCard />    (schema rejected data that looked complete)

calculationResult !== null
  → <DesignSummaryCard />       (top-level KPIs)
  → <SchematicCard />           (SVG visual of the system)
  → <DetailResultCard1 />
  → <DetailResultCard2 />
```

### 6.2 Summary card (KPI metrics)

```tsx
// 3 KPIs in a row, centred
<div className="grid grid-cols-3 gap-4 text-center">
  {metrics.map(m => (
    <div key={m.label}>
      <p className="text-xs text-muted-foreground">{m.label}</p>
      <p className="text-xl font-bold font-mono tabular-nums">{m.value}</p>
      <p className="text-xs text-muted-foreground">{m.unit}</p>
    </div>
  ))}
</div>
```

Container card: `border-primary/30 bg-primary/5`

### 6.3 Schematic card (SVG with View larger)

Every schematic `SectionCard` **must** include a "View larger" button in its `action` slot that opens the same SVG in a full-viewport dialog. Extract the SVG into a local `renderSvg(className)` function to avoid duplication.

```tsx
import { useState } from "react"
import { Expand } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { SectionCard } from "./SectionCard"

export function MySchematic() {
  const [isOpen, setIsOpen] = useState(false)

  // ... compute SVG geometry from form values ...

  const renderSvg = (svgClassName: string) => (
    <svg viewBox="0 0 420 420" className={svgClassName} aria-hidden="true">
      {/* SVG content — closes over all computed geometry variables */}
    </svg>
  )

  return (
    <SectionCard
      title="System Schematic"
      action={
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Open larger schematic">
              <Expand />
              View larger
            </Button>
          </DialogTrigger>
          <DialogContent className="grid h-[78vh] w-[88vw] max-w-[88vw] grid-rows-[auto_minmax(0,1fr)] overflow-hidden p-4 sm:h-[82vh] sm:w-[84vw] sm:max-w-[84vw] xl:w-[1240px] xl:max-w-[1240px]">
            <DialogHeader>
              <DialogTitle>Expanded System Schematic</DialogTitle>
              <DialogDescription>Larger view of the live system schematic.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto rounded-xl border bg-card/40 p-3">
              {renderSvg("h-auto w-full min-w-[480px] text-foreground")}
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="flex flex-col items-center gap-3 py-2">
        {renderSvg("w-full max-w-[340px] h-auto text-foreground")}
      </div>
    </SectionCard>
  )
}
```

**Rules:**
- `useState(false)` for dialog must be placed **before** any early `return null` guards
- Normal card SVG: `w-full max-w-[340px] h-auto text-foreground`
- Dialog SVG: `h-auto w-full min-w-[480px] text-foreground` (no max-width so it fills the dialog)
- Dialog size class: `h-[78vh] w-[88vw] max-w-[88vw] ... xl:w-[1240px] xl:max-w-[1240px]`
- Button: `variant="outline" size="sm"` with `<Expand />` icon

### 6.5 Detail result rows

```tsx
// Divided rows pattern
<div className="rounded-md border overflow-hidden divide-y text-xs">
  {/* Section header */}
  <div className="px-3 py-1.5 bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
    {sectionTitle}
  </div>
  {/* Data rows */}
  <div className="flex justify-between items-center px-3 py-1.5">
    <span>{label}</span>
    <span className="font-mono tabular-nums">{value} <span className="text-muted-foreground">{unit}</span></span>
  </div>
  {/* Total / emphasis row */}
  <div className="flex justify-between items-center px-3 py-1.5 bg-muted/30 font-semibold">
    …
  </div>
</div>
```

**Rules:**
- All numeric result values: `font-mono tabular-nums`
- Units inline: `text-muted-foreground` (lighter weight than value)
- Total/design rows: `bg-muted/30 font-semibold`
- Section sub-headers: `uppercase tracking-wide text-muted-foreground text-xs`

### 6.6 Unit conversion in outputs

```tsx
const { units } = useUomStore()
const displayUnit = units.ventRate   // or whatever category

const displayValue = convertUnit(baseValue, BASE_UNITS.ventRate, displayUnit)
// render: {displayValue.toFixed(2)} {UOM_LABEL[displayUnit] ?? displayUnit}
```

---

## 7. Empty States & Loading

### 7.1 No-data placeholder (tables, lists)
```tsx
<div className="rounded-md border border-dashed py-3 text-center">
  <p className="text-xs text-muted-foreground">No items — add one if applicable</p>
</div>
```

### 7.2 Pending calculated value
```tsx
<p className="text-sm italic text-muted-foreground text-center py-4">
  Enter valid inputs to see results.
</p>
```

### 7.3 Loading / saving button states
```tsx
// Three states: idle → loading → success (auto-resets after ~1.8 s)
{isSaving ? (
  <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
) : saved ? (
  <><Check className="h-4 w-4 text-green-500" />Saved!</>
) : (
  <><Save className="h-4 w-4" />Save</>
)}
```

### 7.4 Error state
```tsx
{error && <p className="text-xs text-destructive mt-1">{error}</p>}
// auto-dismiss pattern: setTimeout(() => setError(null), 4000)
```

### 7.5 Collapsible optional section
```tsx
const [open, setOpen] = useState(false)

<button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between ...">
  <span>{title}</span>
  <span className="text-xs text-muted-foreground">{open ? 'Collapse' : 'Expand (optional)'}</span>
  <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
</button>
{open && <div className="mt-3 space-y-3">…</div>}
```

### 7.6 Status badge in section header
```tsx
// Live (has data)
<Badge variant="secondary" className="text-xs">Live</Badge>

// Pending
<Badge variant="outline" className="text-xs text-muted-foreground">Pending input</Badge>

// Error / invalid
<Badge variant="outline" className="text-xs text-orange-600">2 issues</Badge>
```

---

## 8. Action Menu & Dialogs

### 8.1 Top-bar ActionMenu pattern
```tsx
// All major actions live in a single dropdown
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className="gap-2">
      <Menu className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only">Actions</span>
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setLinkOpen(true)}>…</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => setLoadOpen(true)}>…</DropdownMenuItem>
    <DropdownMenuItem onClick={() => setSaveOpen(true)}>…</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleClear}>…</DropdownMenuItem>
    <DropdownMenuItem onClick={handleExport} disabled={!result}>…</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

{/* Render dialogs in controlled mode outside the dropdown */}
<SaveCalculationButton controlledOpen={saveOpen} onControlledOpenChange={setSaveOpen} ... />
<LoadCalculationButton controlledOpen={loadOpen} onControlledOpenChange={setLoadOpen} ... />
```

### 8.2 Dialog sizing
```tsx
<DialogContent className="sm:max-w-md">  // narrow (save, rename)
<DialogContent className="sm:max-w-lg">  // medium (load list)
<DialogContent className="sm:max-w-2xl"> // wide (metadata, revisions)
```

### 8.3 File save/load pattern

Calculator apps must use the shared database save/load model as the primary persistence path, and may also support file-based export/import of calculation state.

**Database save/load rule:**
- Use the shared `/calculations` API as the primary save/load path
- Treat `calculations` as the latest-state projection
- Treat `calculation_versions` as immutable audit and restore history
- Do not create a new app-specific primary save/load table or endpoint set for calculator persistence
- Route file imports through the same canonical payload shape used by DB-backed save/load

**Scope of file-based save/load:**
- Restore only:
  - `inputs`
  - `metadata`
  - `revisionHistory`
- Do **not** restore equipment links from file imports
- Do **not** trust imported `results`; recompute results from restored inputs

**Preferred file envelope:**
```ts
{
  kind: 'pes-calculation-file',
  schemaVersion: 1,
  app: 'vessels-calculation' | 'pump-calculation' | 'venting-calculation' | 'calculation-template',
  savedAt: string,
  name: string,
  inputs: Record<string, unknown>,
  metadata: CalculationMetadata,
  revisionHistory: RevisionRecord[],
}
```

**Rules:**
- Add `Save to File` as a secondary action in the save flow
- Add `Load from File` in the load dialog
- Validate `kind`, `schemaVersion`, and `app` before import
- Route imported payloads through the same normalization/reset path used by DB-backed load
- Show a clear error when the file belongs to a different app or is malformed

**Testing expectations:**
- Add helper-level tests for:
  - valid envelope round-trip
  - wrong-app rejection
  - malformed JSON rejection
- Keep app suites green after wiring file import/export into dialogs

### 8.4 PDF export pattern

Calculator apps should ship PDF export as a first-class top-bar action, using `@react-pdf/renderer` and a dedicated report component under `src/app/calculator/pdf/`.

**Preferred architecture:**
- Trigger export from `ActionMenu`
- Dynamically import both `@react-pdf/renderer` and the report component inside the click handler
- Build the PDF from current form values plus calculation metadata and revision history
- Download the Blob directly with `URL.createObjectURL`, not via a print-popup route

```tsx
const handleExportPdf = async () => {
  if (!calculationResult) return

  setPdfLoading(true)
  try {
    const [{ pdf }, { CalculationReport }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../pdf/CalculationReport'),
    ])

    const input = getValues()
    const blob = await pdf(
      <CalculationReport
        input={input}
        result={calculationResult}
        metadata={calculationMetadata}
        revisions={revisionHistory}
        units={units}
      />,
    ).toBlob()

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calculation-${(input.tag?.trim() || 'report').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    setPdfLoading(false)
  }
}
```

**Report file placement:**
```text
src/app/calculator/
  components/ActionMenu.tsx
  pdf/CalculationReport.tsx
```

**Report design rules:**
- Use a dedicated `CalculationReport` React PDF document, not DOM-to-image capture
- Keep PDF layout deterministic and page-size aware from the start
- Use the confirmed GCME sheet structure:
  - top report title and type/tag row
  - two-column calculation body with input sections on the left and output/result sections on the right
  - allow long input lists to continue into the right panel only when the right panel is not needed for outputs
  - full-width `SKETCH` section below the calculation body, spanning both columns
  - bottom title/revision/GCME block anchored at the page bottom
  - bottom navy ID bar with left document code and right validation/report label
- Put title block, metadata, input sections, output sections, and sketch/schematic in explicit containers
- If the app renders a live SVG schematic, share the geometry/model layer between web and PDF renderers instead of maintaining two separate calculations
- Make the PDF schematic renderer mirror the web SVG draw order:
  - same model dimensions and padding
  - same clipped fills and liquid fills
  - same guide lines, outlines, annotation arrows, labels, colors, and subtitle
  - no PDF-only sketch legend/caption unless the web schematic also has it
- Keep title/revision blocks anchored at the page bottom; center sketches inside the remaining space
- Prefer one-page output for normal calculator cases, but design overflow behavior intentionally
- Standardize the left-side GCME disclaimer strip, section headers, row alternation, page frame, and bottom blue report bar with these settings:

```ts
const NAVY = '#1f3864'
const VALUE_BG = '#dbeafe'
const DOCUMENT_CODE = 'CA-PR-1050-0101'
const DISCLAIMER =
  'This document is confidential proprietary and/or legally privileged, intended to be used within GCME Co.,Ltd. Unintended recipients are not allowed to distribute, copy, modify, retransmit, disseminate or use this document and/or information.'

page: {
  fontFamily: 'Helvetica',
  fontSize: 7,
  padding: 0,
  color: '#000000',
  lineHeight: 1.3,
},
pageOuterFrame: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  borderWidth: 8,
  borderColor: NAVY,
},
outerBorder: {
  flex: 1,
  marginTop: 8,
  marginRight: 8,
  marginBottom: 8,
  marginLeft: 18,
  borderWidth: 1,
  borderColor: '#000000',
  flexDirection: 'column',
},

disclaimerWrap: {
  position: 'absolute',
  left: 7,
  top: 62,
  bottom: 74,
  width: 12,
  alignItems: 'center',
  justifyContent: 'center',
},
disclaimerText: {
  width: 800,
  fontSize: 5.6,
  color: '#dc2626',
  textAlign: 'center',
  transform: 'rotate(-90deg)',
},
sectionHeader: {
  backgroundColor: NAVY,
  paddingHorizontal: 5,
  paddingVertical: 2,
},
sectionHeaderText: {
  color: '#ffffff',
  fontSize: 6.5,
  fontFamily: 'Helvetica-Bold',
},
bodyRow: {
  flexDirection: 'row',
  borderBottomWidth: 1,
  borderBottomColor: '#000000',
},
leftCol: {
  flex: 1,
  borderRightWidth: 1,
  borderRightColor: '#000000',
},
rightCol: {
  flex: 1,
},
sketchSection: {
  flex: 1,
  flexDirection: 'column',
  minHeight: 245,
  borderBottomWidth: 1,
  borderBottomColor: '#000000',
},
sketchBody: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
},
bottomReportBar: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  backgroundColor: NAVY,
  paddingHorizontal: 4,
  paddingVertical: 2,
},
```

**Key differences from the old spec:**
- Input/output layout: use data panels first, then full-width sketch; do not put the sketch in the right panel
- PDF sketch source: reuse the same schematic model as the web SVG and match the web renderer as closely as React PDF supports
- Disclaimer text color: `#dc2626` red
- Section header: navy blue (`NAVY`) with white bold text — not light gray
- `DOCUMENT_CODE = 'CA-PR-1050-0101'` — GCME form number, shown in the top code and bottom navy bar
- Footer: do not add a separate floating footer; the bottom title/revision block and navy ID bar are the footer

**Testing expectations:**
- Mock `@react-pdf/renderer` in `ActionMenu` tests
- Assert blob download behavior, not popup-window behavior
- Add targeted report layout tests for any print/PDF helper views
- Add regression tests for shared schematic models when dimensions or annotation placement matter
- For schematic-heavy reports, render at least one temporary PDF during development and rasterize it to verify clipping, labels, arrows, and page count

---

## 9. Styling Reference

### 9.1 Color tokens (CSS variables)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | Slate 50 | Slate 900 | Page background |
| `--foreground` | Slate 900 | Slate 100 | Body text |
| `--card` | White 80% | Slate 800 70% | Card surfaces (glass) |
| `--primary` | Sky 600 | Sky 400 | Actions, links, focus rings |
| `--secondary` | Amber 500 | Amber 400 | Accent badges |
| `--muted` | Slate 100 | Slate 800 | Subtle backgrounds |
| `--muted-foreground` | Slate 600 | Slate 400 | Labels, hints, captions |
| `--destructive` | Red 500 | Red 400 | Errors, delete actions |
| `--border` | Black 8% | White 8% | All borders & dividers |

### 9.2 Typography

| Class | Size | Usage |
|---|---|---|
| `text-xs` | 12 px | Field hints, table headers, badges, unit labels |
| `text-sm` | 14 px | Descriptions, secondary text, dialog body |
| `text-base` | 16 px | Section titles (`CardTitle`), form labels |
| `text-xl` | 20 px | KPI values in summary cards |
| `font-medium` | 500 | Field labels, FieldRow labels |
| `font-semibold` | 600 | Section headings, total rows |
| `font-bold` | 700 | Large KPI numbers |
| `font-mono tabular-nums` | mono | All numeric result values |

### 9.3 Spacing

| Pattern | Class | Use |
|---|---|---|
| Form field internal | `space-y-1` | Label → input → hint/error |
| Form grid columns | `gap-3` | Side-by-side fields |
| Section content | `space-y-4` | Rows within a SectionCard |
| Inter-section | `space-y-4` | Between SectionCards in InputPanel |
| Page columns | `gap-6` | Between left and right panels |
| Inline icon+text | `gap-2` | Buttons, badges, row labels |
| Compact inline | `gap-1.5` | UomInput gap between field and selector |

### 9.4 Component-specific classes

```
Card:            shadow-sm rounded-lg border
SectionCard:     + CardHeader pb-3, Separator, CardContent space-y-4
Input:           h-9 (default), h-7 (table rows), h-8 (compact forms)
Button:          size="sm" (actions), size="icon" (icon-only), gap-2 (icon+text)
Badge:           text-xs, variant="outline" | "secondary"
SelectTrigger:   h-8 min-w-fit px-2 border-muted bg-muted/40 text-xs whitespace-nowrap
UomInput:        flex items-center gap-1.5 (wrapper)
Table header:    bg-muted/50 border-b text-xs font-medium text-muted-foreground px-3 py-1.5
Table row:       border-b last:border-b-0 px-3 py-2 items-center
Table total row: bg-muted/30 font-semibold
Warning banner:  flex items-center gap-2 rounded-md border px-3 py-2 text-xs
```

### 9.5 Dark mode

Dark mode is handled entirely through CSS variables — no `dark:` utility classes required on individual elements. The `.dark` class on `<html>` switches all `--*` tokens.

Exception: glass panel overlay shadow uses:
```css
.dark .glass-panel { box-shadow: 0 4px 24px 0 rgba(0,0,0,0.4); }
```

---

## 10. Save / Load Architecture

### 10.1 Persistence model (engineering objects)

Calculator apps should persist saved cases through `engineering-objects` using `@eng-suite/api-client`:

```ts
const items = await apiClient.engineeringObjects.list({
  objectType: 'VESSEL_CALCULATION',
  includeInactive: false,
})

await apiClient.engineeringObjects.upsert(tag, {
  object_type: 'VESSEL_CALCULATION',
  status: 'In-Design',
  properties: {
    inputs,
    result,
    linkedEquipmentId,
    calculationMetadata,
    revisionHistory,
    meta: {
      app: 'vessel',
      name,
      description,
      isActive: true,
      deletedAt: null,
      updatedAt: new Date().toISOString(),
    },
  },
})
```

For new apps, define an app-specific `object_type` constant and keep the same `properties.meta` shape.

### 10.2 What is saved

`getValues()` from React Hook Form captures the current form state. Since all fields store **base units**, the persisted JSON is always unit-agnostic.

```ts
const inputs = getValues()
await save({
  name,
  inputs,
  results: calculationResult,
  equipmentId,
  calculationMetadata,
  revisionHistory,
})
```

UoM preferences are not saved with calculations. They stay in the app UoM store (`persist` localStorage key).

### 10.3 What is loaded

```ts
for (const key of NUMERIC_KEYS) {
  mutable[key] = toNumberOrUndefined(source[key])
}

reset(normalizedInputs)
```

Loaders should restore:
- form inputs
- calculation metadata
- revision history
- linked equipment id/tag (when present)

### 10.4 Soft delete / restore

Saved calculations are soft-deleted by toggling:
- `properties.meta.isActive = false`
- `properties.meta.deletedAt = <ISO timestamp>`

Restore resets:
- `isActive = true`
- `deletedAt = null`

List views should default to active records and expose a `Show deleted` toggle via `include_inactive=true`.

### 10.5 Schema evolution

When adding fields to `CalculationInput`, the load normalizer must handle missing keys gracefully:

```ts
mutable[newField] = toNumberOrUndefined(source[newField]) ?? DEFAULT_VALUE
```

When adding UoM categories, the `migrate` function in `uomStore` fills them in automatically.

---

## 11. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase `.tsx` | `UomInput.tsx`, `SectionCard.tsx` |
| Utility / lib file | camelCase `.ts` | `uomStore.ts`, `inputSchema.ts` |
| Directory | kebab-case | `sections/`, `results/`, `lib/store/` |
| React component | PascalCase function | `function DesignSummaryCard()` |
| Props interface | `${Name}Props` | `interface SectionCardProps` |
| Event handler | `handle*` | `handleClear`, `handleExport` |
| Boolean check | `is*` / `has*` | `isInsulated`, `hasError` |
| Derived display value | `*Display` | `inTotalDisplay`, `displayUnit` |
| Store | `use*Store` | `useUomStore`, `useCalculatorStore` |
| Zod schema | `*Schema` | `calculationInputSchema`, `streamSchema` |
| TypeScript type/interface | PascalCase | `CalculationInput`, `UomCategory` |
| Enum | PascalCase | `TankConfiguration`, `ApiEdition` |
| Constant object | UPPER_SNAKE | `BASE_UNITS`, `UOM_OPTIONS` |
| CSS variable | `--kebab-case` | `--muted-foreground`, `--primary` |
| Unit string (internal) | ASCII | `'m3/h'`, `'kPag'`, `'W/(m·K)'` |
| localStorage key | `app-name-purpose` | `vent-uom-prefs`, `ept-pes-theme` |

---

## 12. File Structure Template

```
apps/{app-name}/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # root layout: Providers + TopToolbar
│   │   ├── providers.tsx         # ColorModeContext + Providers wrapper
│   │   └── calculator/
│   │       ├── page.tsx          # form setup, secondary action bar, two-column grid
│   │       ├── components/
│   │       │   ├── SectionCard.tsx
│   │       │   ├── FieldRow.tsx
│   │       │   ├── UomInput.tsx
│   │       │   ├── ActionMenu.tsx
│   │       │   ├── InputPanel.tsx
│   │       │   ├── ResultsPanel.tsx
│   │       │   ├── CalculationMetadataSection.tsx   # always first in InputPanel
│   │       │   ├── SaveCalculationButton.tsx
│   │       │   ├── LoadCalculationButton.tsx
│   │       │   └── ExportButton.tsx
│   │       ├── sections/         # form input sections (one per SectionCard)
│   │       │   ├── DetailsSection.tsx
│   │       │   ├── FluidPropertiesSection.tsx
│   │       │   └── ...
│   │       └── results/          # result display components
│   │           ├── SummaryResult.tsx
│   │           └── ...
│   ├── components/
│   │   └── TopToolbar.tsx        # sticky top bar with icon, title, theme toggle
│   ├── lib/
│   │   ├── uom.ts                # BASE_UNITS, UOM_OPTIONS, UOM_LABEL, UomCategory
│   │   ├── calculations/         # pure calculation functions (no React)
│   │   ├── validation/
│   │   │   └── inputSchema.ts    # Zod schema, always validates in base units
│   │   ├── store/
│   │   │   ├── uomStore.ts       # Zustand + persist
│   │   │   └── calculatorStore.ts
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts              # CalculationInput, CalculationResult, etc.
│   └── api/
│       └── {feature}/
│           └── calculate/
│               └── route.ts      # Next.js route handler
└── ...
```

---

## 13. Checklist — New App Setup

- [ ] Start from `apps/calculation-template` (already has TopToolbar, CalculationMetadataSection)
- [ ] **CRITICAL — basePath in `next.config.ts`:** Replace `/venting-calculation` with your actual app name (e.g., `/heat-transfer-calculation`, `/pipe-sizer`). This is the #1 cause of broken Vercel deployments. The template ships with a placeholder — always verify before deploying.
- [ ] Update `TopToolbar`: replace icon (lucide), title, subtitle
- [ ] Update `layout.tsx` metadata: `title`, `description`
- [ ] Update `uomStore` localStorage key to `{app-name}-uom-prefs`
- [ ] Define `BASE_UNITS` for the new app's unit categories
- [ ] Build Zod input schema with base-unit validation
- [ ] Implement `createDefaultValues()` for form initialization
- [ ] Wire up `FormProvider` + `zodResolver` in `page.tsx`
- [ ] Add `migrate` to uomStore for any schema evolution
- [ ] Implement `normalizeLoadedInput()` in LoadCalculationButton
- [ ] Use `font-mono tabular-nums` for all numeric result values
- [ ] Verify save/load round-trips in base units (no conversion on load)
- [ ] Test dark mode (toggle button in TopToolbar)
- [ ] Test at `xl` breakpoint for two-column layout

## 14. Vercel Deployment — Critical basePath Rule

**Every new app MUST set `basePath` in `next.config.ts` to match its Vercel project URL path.**

The `basePath` in Next.js controls URL routing inside the deployed app. If it doesn't match the Vercel subdomain/path, every route will 404.

**Example — correct for an app deployed at `https://pes-heat-transfer-calculation.vercel.app`:**
```ts
// next.config.ts — CORRECT
const nextConfig: NextConfig = {
  basePath: "/heat-transfer-calculation",
  env: { NEXT_PUBLIC_BASE_PATH: "/heat-transfer-calculation" },
  async redirects() {
    return [{ source: "/", destination: "/heat-transfer-calculation", permanent: false, basePath: false }];
  },
}
```

**The template (`apps/calculation-template`) ships with a placeholder `basePath: "/[your-app-name]"`. You MUST replace this before deploying.**

**How to verify before deploying:**
1. Open Vercel project dashboard → Domains → note the deployed URL
2. If URL is `https://pes-heat-transfer-calculation.vercel.app`, `basePath` must be `/heat-transfer-calculation`
3. If URL is `https://my-custom-domain.com/`, `basePath` must be `/` (empty string, omit entirely)
4. Run `bun run build` locally — if build succeeds with no basePath errors, it's likely correct

**Do not copy `next.config.ts` from another app without changing the `basePath` value.**

**`apps/web/vercel.json`** manages redirects from the root dashboard (`pes-web`) to sub-apps. Sub-apps own their own `next.config.ts` `basePath`. Both must be correct for navigation to work.
