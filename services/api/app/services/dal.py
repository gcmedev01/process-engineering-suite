"""Abstract Data Access Layer interface."""
from abc import ABC, abstractmethod
from typing import List, Optional


class DataAccessLayer(ABC):
    """Abstract base class for data access.
    
    This defines the interface that both DatabaseService and MockService must implement.
    The application uses this interface, allowing seamless switching between
    PostgreSQL and mock data.
    """
    
    # --- Users & Auth ---
    
    @abstractmethod
    async def get_users(self) -> List[dict]:
        """Get all users."""
        pass
    
    @abstractmethod
    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID."""
        pass
    
    @abstractmethod
    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Get user by email."""
        pass
    
    @abstractmethod
    async def get_credential_by_username(self, username: str) -> Optional[dict]:
        """Get credential by username for authentication."""
        pass
    
    @abstractmethod
    async def update_credential_login(self, credential_id: str, success: bool) -> None:
        """Update credential after login attempt."""
        pass

    # --- Calculations ---

    @abstractmethod
    async def get_calculations(
        self,
        include_inactive: bool = False,
        app: Optional[str] = None,
        *,
        project_id: Optional[str] = None,
        discipline: Optional[str] = None,
        status: Optional[str] = None,
        calc_number: Optional[str] = None,
    ) -> List[dict]:
        """Get saved calculations, optionally filtered by app and register fields."""
        pass

    @abstractmethod
    async def get_next_calc_number(
        self,
        project_id: str,
        discipline: Optional[str] = None,
    ) -> Optional[dict]:
        """Suggest the next register number for a project (+ optional discipline).

        Returns None when the project doesn't exist.
        """
        pass

    @abstractmethod
    async def get_calculation_by_id(self, calculation_id: str) -> Optional[dict]:
        """Get a saved calculation by ID."""
        pass

    @abstractmethod
    async def create_calculation(self, data: dict) -> dict:
        """Create a saved calculation and its initial version."""
        pass

    @abstractmethod
    async def update_calculation(self, calculation_id: str, data: dict) -> dict:
        """Append a new version to an existing saved calculation."""
        pass

    @abstractmethod
    async def delete_calculation(self, calculation_id: str) -> bool:
        """Soft delete a saved calculation."""
        pass

    @abstractmethod
    async def get_calculation_versions(self, calculation_id: str) -> List[dict]:
        """Get the version history for a saved calculation."""
        pass

    @abstractmethod
    async def get_calculation_version_by_id(
        self,
        calculation_id: str,
        version_id: str,
    ) -> Optional[dict]:
        """Get a specific version for a calculation."""
        pass

    @abstractmethod
    async def restore_calculation(
        self,
        calculation_id: str,
        version_id: str,
        change_note: Optional[str] = None,
    ) -> dict:
        """Restore a historical version by creating a new latest version."""
        pass
    
    # --- Hierarchy ---
    
    @abstractmethod
    async def get_customers(self) -> List[dict]:
        """Get all customers."""
        pass
    
    @abstractmethod
    async def get_plants_by_customer(self, customer_id: str) -> List[dict]:
        """Get plants for a customer."""
        pass
    
    @abstractmethod
    async def get_units_by_plant(self, plant_id: str) -> List[dict]:
        """Get units for a plant."""
        pass
    
    @abstractmethod
    async def get_areas_by_unit(self, unit_id: str) -> List[dict]:
        """Get areas for a unit."""
        pass
    
    @abstractmethod
    async def get_projects_by_area(self, area_id: str) -> List[dict]:
        """Get projects for an area."""
        pass

    @abstractmethod
    async def get_area_by_id(self, area_id: str) -> Optional[dict]:
        """Get area by ID."""
        pass

    @abstractmethod
    async def get_unit_by_id(self, unit_id: str) -> Optional[dict]:
        """Get unit by ID."""
        pass

    @abstractmethod
    async def get_plant_by_id(self, plant_id: str) -> Optional[dict]:
        """Get plant by ID."""
        pass

    @abstractmethod
    async def get_customer_by_id(self, customer_id: str) -> Optional[dict]:
        """Get customer by ID."""
        pass
    
    # --- Protective Systems (PSV) ---
    
    @abstractmethod
    async def get_protective_systems(
        self, area_id: Optional[str] = None, include_deleted: bool = False
    ) -> List[dict]:
        """Get all protective systems, optionally filtered by area."""
        pass
    
    @abstractmethod
    async def get_protective_system_by_id(
        self, psv_id: str, include_deleted: bool = False
    ) -> Optional[dict]:
        """Get protective system by ID with all relations."""
        pass
    
    @abstractmethod
    async def create_protective_system(self, data: dict) -> dict:
        """Create a new protective system."""
        pass
    
    @abstractmethod
    async def update_protective_system(self, psv_id: str, data: dict) -> dict:
        """Update a protective system."""
        pass
    
    @abstractmethod
    async def delete_protective_system(self, psv_id: str) -> bool:
        """Soft delete a protective system."""
        pass

    @abstractmethod
    async def restore_protective_system(self, psv_id: str) -> dict:
        """Restore a soft-deleted protective system."""
        pass

    @abstractmethod
    async def purge_protective_system(self, psv_id: str) -> bool:
        """Permanently delete a soft-deleted protective system."""
        pass
    
    # --- Scenarios ---
    
    @abstractmethod
    async def get_scenarios_by_psv(self, psv_id: str) -> List[dict]:
        """Get scenarios for a protective system."""
        pass
    
    @abstractmethod
    async def create_scenario(self, data: dict) -> dict:
        """Create a new scenario."""
        pass
    
    @abstractmethod
    async def update_scenario(self, scenario_id: str, data: dict) -> dict:
        """Update a scenario."""
        pass
    
    @abstractmethod
    async def delete_scenario(self, scenario_id: str) -> bool:
        """Soft delete a scenario."""
        pass
    
    # --- Sizing Cases ---
    
    @abstractmethod
    async def get_sizing_cases_by_psv(self, psv_id: str) -> List[dict]:
        """Get sizing cases for a protective system."""
        pass
    
    @abstractmethod
    async def create_sizing_case(self, data: dict) -> dict:
        """Create a new sizing case."""
        pass
    
    @abstractmethod
    async def update_sizing_case(self, case_id: str, data: dict) -> dict:
        """Update a sizing case."""
        pass
    
    @abstractmethod
    async def delete_sizing_case(self, case_id: str) -> bool:
        """Soft delete a sizing case."""
        pass
    
    # --- Equipment ---
    
    @abstractmethod
    async def get_equipment(self, area_id: Optional[str] = None, type: Optional[str] = None) -> List[dict]:
        """Get all equipment, optionally filtered by area and/or type."""
        pass

    @abstractmethod
    async def get_equipment_by_id(self, equipment_id: str) -> Optional[dict]:
        """Get equipment by ID."""
        pass
    
    @abstractmethod
    async def get_equipment_links_by_psv(self, psv_id: str) -> List[dict]:
        """Get equipment links for a protective system."""
        pass

    @abstractmethod
    async def create_equipment_link(self, data: dict) -> dict:
        """Create a new equipment link."""
        pass

    @abstractmethod
    async def delete_equipment_link(self, link_id: str) -> bool:
        """Delete an equipment link."""
        pass
    
    @abstractmethod
    async def create_equipment(self, data: dict) -> dict:
        """Create a new equipment."""
        pass
    
    @abstractmethod
    async def update_equipment(self, equipment_id: str, data: dict) -> dict:
        """Update an equipment."""
        pass
    
    @abstractmethod
    async def delete_equipment(self, equipment_id: str) -> bool:
        """Soft delete an equipment."""
        pass
    
    # --- Attachments ---
    
    @abstractmethod
    async def get_attachments_by_psv(self, psv_id: str) -> List[dict]:
        """Get attachments for a protective system."""
        pass
    
    @abstractmethod
    async def create_attachment(self, data: dict) -> dict:
        """Create a new attachment."""
        pass
    
    @abstractmethod
    async def delete_attachment(self, attachment_id: str) -> bool:
        """Delete an attachment."""
        pass

    # --- Notes ---

    @abstractmethod
    async def get_notes_by_psv(self, psv_id: str) -> List[dict]:
        """Get notes for a protective system."""
        pass

    @abstractmethod
    async def create_note(self, data: dict) -> dict:
        """Create a new note."""
        pass

    @abstractmethod
    async def update_note(self, note_id: str, data: dict) -> dict:
        """Update a note."""
        pass

    @abstractmethod
    async def delete_note(self, note_id: str) -> bool:
        """Soft delete a note."""
        pass
    
    # --- Comments ---
    
    @abstractmethod
    async def get_comments_by_psv(self, psv_id: str) -> List[dict]:
        """Get comments for a protective system."""
        pass
    
    @abstractmethod
    async def create_comment(self, data: dict) -> dict:
        """Create a new comment."""
        pass

    @abstractmethod
    async def update_comment(self, comment_id: str, data: dict) -> dict:
        """Update an existing comment."""
        pass

    @abstractmethod
    async def delete_comment(self, comment_id: str) -> bool:
        """Soft delete a comment."""
        pass
    
    # --- Todos ---
    
    @abstractmethod
    async def get_todos_by_psv(self, psv_id: str) -> List[dict]:
        """Get todos for a protective system."""
        pass
    
    @abstractmethod
    async def create_todo(self, data: dict) -> dict:
        """Create a new todo."""
        pass
    
    @abstractmethod
    async def update_todo(self, todo_id: str, data: dict) -> dict:
        """Update a todo."""
        pass

    @abstractmethod
    async def delete_todo(self, todo_id: str) -> bool:
        """Soft delete a todo."""
        pass
    
    # --- Revision History ---
    
    @abstractmethod
    async def get_revisions_by_entity(self, entity_type: str, entity_id: str) -> List[dict]:
        """Get revisions for an entity (PSV, scenario, sizing case)."""
        pass
    
    @abstractmethod
    async def get_revision_by_id(self, revision_id: str) -> Optional[dict]:
        """Get a single revision by ID."""
        pass
    
    @abstractmethod
    async def create_revision(self, data: dict) -> dict:
        """Create a new revision."""
        pass
    
    @abstractmethod
    async def update_revision(self, revision_id: str, data: dict) -> dict:
        """Update a revision (lifecycle fields)."""
        pass

    @abstractmethod
    async def delete_revision(self, revision_id: str) -> bool:
        """Delete a revision."""
        pass

    # --- Audit Logs ---
    
    @abstractmethod
    async def get_audit_logs(self, filters: dict, limit: int, offset: int) -> tuple[List[dict], int]:
        """Get audit logs with filters, returns (logs, total_count)."""
        pass
    
    @abstractmethod
    async def get_audit_log_by_id(self, log_id: str) -> Optional[dict]:
        """Get a single audit log by ID."""
        pass
    
    @abstractmethod
    async def create_audit_log(self, data: dict) -> dict:
        """Create a new audit log entry."""
        pass
    
    @abstractmethod
    async def clear_audit_logs(self) -> int:
        """Clear all audit logs. Returns count of deleted logs."""
        pass

    # --- Venting Calculations ---

    @abstractmethod
    async def get_venting_calculations(
        self, area_id: Optional[str] = None, equipment_id: Optional[str] = None,
        include_deleted: bool = False
    ) -> List[dict]:
        """Get venting calculations, optionally filtered by area or equipment."""
        pass

    @abstractmethod
    async def get_venting_calculation_by_id(self, calc_id: str) -> Optional[dict]:
        """Get a venting calculation by ID."""
        pass

    @abstractmethod
    async def create_venting_calculation(self, data: dict) -> dict:
        """Create a new venting calculation."""
        pass

    @abstractmethod
    async def update_venting_calculation(self, calc_id: str, data: dict) -> dict:
        """Update a venting calculation."""
        pass

    @abstractmethod
    async def delete_venting_calculation(self, calc_id: str) -> bool:
        """Soft-delete a venting calculation."""
        pass

    @abstractmethod
    async def restore_venting_calculation(self, calc_id: str) -> dict:
        """Restore a soft-deleted venting calculation."""
        pass

    # --- Network Designs ---

    @abstractmethod
    async def get_network_designs(self, area_id: Optional[str] = None) -> List[dict]:
        """Get network designs, optionally filtered by area."""
        pass

    @abstractmethod
    async def get_network_design_by_id(self, design_id: str) -> Optional[dict]:
        """Get a network design by ID."""
        pass

    @abstractmethod
    async def create_network_design(self, data: dict) -> dict:
        """Create a new network design."""
        pass

    @abstractmethod
    async def update_network_design(self, design_id: str, data: dict) -> dict:
        """Update a network design."""
        pass

    @abstractmethod
    async def delete_network_design(self, design_id: str) -> bool:
        """Hard-delete a network design."""
        pass

    # --- Instrument Links ---

    @abstractmethod
    async def list_instrument_links(
        self,
        *,
        instrument_id: Optional[str] = None,
        target_id: Optional[str] = None,
        relationship_type: Optional[str] = None,
        protective_system_id: Optional[str] = None,
    ) -> List[dict]:
        """List instrument links, optionally filtered."""
        pass

    @abstractmethod
    async def create_instrument_link(self, data: dict) -> dict:
        """Create an instrument link. Raises TypeError on wrong object_type, ValueError on missing target."""
        pass

    @abstractmethod
    async def update_instrument_link(self, link_id: str, data: dict) -> Optional[dict]:
        """Partial update of an instrument link. Returns None when not found."""
        pass

    @abstractmethod
    async def delete_instrument_link(self, link_id: str) -> bool:
        """Hard-delete an instrument link. Returns False when not found."""
        pass

    # --- Design Agent Sessions ---

    @abstractmethod
    async def get_design_agent_sessions(self, owner_id: Optional[str] = None) -> List[dict]:
        """Get design agent sessions, optionally filtered by owner."""
        pass

    @abstractmethod
    async def get_design_agent_session_by_id(self, session_id: str) -> Optional[dict]:
        """Get a design agent session by ID."""
        pass

    @abstractmethod
    async def create_design_agent_session(self, data: dict) -> dict:
        """Create a new design agent session."""
        pass

    @abstractmethod
    async def update_design_agent_session(self, session_id: str, data: dict) -> dict:
        """Update a design agent session."""
        pass

    @abstractmethod
    async def delete_design_agent_session(self, session_id: str) -> bool:
        """Hard-delete a design agent session."""
        pass
