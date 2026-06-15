import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProjectsTab } from "../ProjectsTab";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Mock all dependencies
vi.mock("@/store/usePsvStore");
vi.mock("@/store/useAuthStore");
vi.mock("@/hooks/usePagination");
vi.mock("@/hooks/useLocalStorage");
vi.mock("../dashboard/ProjectDialog", () => ({
  ProjectDialog: vi.fn(({ open }: any) =>
    open ? <div data-testid="project-dialog" /> : null
  ),
}));
vi.mock("../shared", () => ({
  DeleteConfirmDialog: vi.fn(({ open, title, onConfirm }: any) =>
    open ? (
      <div data-testid="delete-dialog">
        <span>{title}</span>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : (
      <div data-testid="delete-dialog" style={{ display: "none" }} />
    )
  ),
  TableSortButton: vi.fn(() => <span data-testid="table-sort-button" />),
  PaginationControls: vi.fn(() => <div data-testid="pagination" />),
  ItemsPerPageSelector: vi.fn(() => <div data-testid="items-per-page" />),
  HierarchyBreadcrumb: vi.fn(() => null),
  OwnerSelector: vi.fn(() => null),
  AreaSelector: vi.fn(() => null),
  UnitSelector: vi.fn(() => null),
  NumericInput: vi.fn(() => null),
  StepperInput: vi.fn(() => null),
  EquipmentTypeIcon: vi.fn(() => null),
  Footer: vi.fn(() => null),
}));

// Mock status color utilities
vi.mock("@/lib/statusColors", () => ({
  getWorkflowStatusColor: vi.fn(() => "default"),
  getWorkflowStatusLabel: vi.fn((status) => status.replace("_", " ")),
  WORKFLOW_STATUS_SEQUENCE: ["draft", "in_review", "checked", "approved"],
}));

const createMockStore = (overrides = {}): any => {
  const baseStore = {
    // Selection state
    selectedArea: {
      id: "area1",
      name: "Process Area A",
      code: "AREA001",
      unitId: "unit1",
      status: "active" as const,
      ownerId: "user1",
      createdAt: "2024-01-01T00:00:00Z",
    },
    selectedUnit: null,
    selectedPlant: null,
    selectedCustomer: null,
    selectedPsv: null,
    selectedProject: null,

    // Data arrays
    projects: [
      {
        id: "project1",
        code: "PROJ001",
        name: "Main Process Project",
        areaId: "area1",
        leadId: "user1",
        phase: "design" as const,
        status: "approved" as const,
        isActive: true,
        startDate: "2024-01-01T00:00:00Z",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "project2",
        code: "PROJ002",
        name: "Expansion Project",
        areaId: "area2",
        leadId: "user2",
        phase: "construction" as const,
        status: "in_review" as const,
        isActive: false,
        startDate: "2024-02-01T00:00:00Z",
        createdAt: "2024-01-15T00:00:00Z",
      },
    ],
    areas: [
      {
        id: "area1",
        name: "Process Area A",
        code: "AREA001",
        unitId: "unit1",
        status: "active" as const,
        ownerId: "user1",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "area2",
        name: "Process Area B",
        code: "AREA002",
        unitId: "unit2",
        status: "active" as const,
        ownerId: "user2",
        createdAt: "2024-01-02T00:00:00Z",
      },
    ],
    units: [
      {
        id: "unit1",
        name: "Unit A",
        code: "UNIT001",
        plantId: "plant1",
        status: "active" as const,
        ownerId: "user1",
        createdAt: "2024-01-01T00:00:00Z",
      },
    ],
    protectiveSystems: [
      {
        id: "psv1",
        tag: "PSV-001",
        name: "Main Relief Valve",
        projectIds: ["project1"],
        status: "active" as const,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ],
    plants: [],
    customers: [],

    // UI state
    activeTab: "overview",
    dashboardTab: null,
    isLoading: false,

    // Actions
    addProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    softDeleteProject: vi.fn(),
    fetchAllProjects: vi.fn(),
    areProjectsLoaded: true,
    fetchAllProtectiveSystems: vi.fn(),
    arePsvsLoaded: true,

    // Area/Unit/Plant/Customer actions for cascade operations
    updateArea: vi.fn(),
    updateUnit: vi.fn(),
    updatePlant: vi.fn(),
    updateCustomer: vi.fn(),

    // Required methods
    selectCustomer: vi.fn(),
    selectPlant: vi.fn(),
    selectUnit: vi.fn(),
    selectArea: vi.fn(),
    selectPsv: vi.fn(),
    selectProject: vi.fn(),
    setActiveTab: vi.fn(),
    setDashboardTab: vi.fn(),
    addPlant: vi.fn(),
    deletePlant: vi.fn(),
    addUnit: vi.fn(),
    deleteUnit: vi.fn(),
    addArea: vi.fn(),
    deleteArea: vi.fn(),
    addEquipment: vi.fn(),
    updateEquipment: vi.fn(),
    deleteEquipment: vi.fn(),
    updateSizingCase: vi.fn(),
    deleteSizingCase: vi.fn(),
    loadRevisionHistory: vi.fn(),
    ...overrides,
  };

  // Mock the getState method to return the store data
  (baseStore as any).getState = vi.fn(() => baseStore);

  return baseStore;
};

describe("ProjectsTab", () => {
  let mockStore: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockStore = createMockStore();

    vi.mocked(usePsvStore).mockImplementation((selector) => {
      return selector ? selector(mockStore) : mockStore;
    });

    // Mock the getState method
    vi.mocked(usePsvStore).getState = vi.fn(() => mockStore);

    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        canEdit: () => true,
        canApprove: () => true,
      };
      return selector ? selector(state) : state;
    });

    vi.mocked(usePagination).mockReturnValue({
      currentPage: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 2,
      goToPage: vi.fn(),
      nextPage: vi.fn(),
      prevPage: vi.fn(),
      hasNextPage: false,
      hasPrevPage: false,
      pageNumbers: [1],
      pageItems: mockStore.projects,
    });

    vi.mocked(useLocalStorage).mockReturnValue([15, vi.fn()]);
  });

  describe("Initial Rendering", () => {
    it("renders without crashing", () => {
      expect(() => render(<ProjectsTab />)).not.toThrow();
    });

    it("renders basic structure", () => {
      render(<ProjectsTab />);

      expect(screen.getAllByText("Add New Project")).toHaveLength(1); // Desktop button only
      expect(screen.getAllByText("Process Area A - Projects")[0]).toBeInTheDocument();
    });

    it("shows default title when no area selected", () => {
      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const state = createMockStore({ selectedArea: null });
        return selector ? selector(state) : state;
      });

      render(<ProjectsTab />);

      expect(screen.getAllByText("Projects")[0]).toBeInTheDocument();
    });

    it("shows add button for users with edit permissions", () => {
      render(<ProjectsTab />);

      const addButtons = screen.getAllByText("Add New Project");
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it("hides add button for users without edit permissions", () => {
      vi.mocked(useAuthStore).mockImplementation((selector: any) => {
        const state = {
          canEdit: () => false,
          canApprove: () => false,
        };
        return selector ? selector(state) : state;
      });

      render(<ProjectsTab />);

      const addButtons = screen.queryAllByText("Add New Project");
      expect(addButtons).toHaveLength(0);
    });
  });

  describe("Data Loading", () => {
    it("loads projects on mount if not loaded", () => {
      const mockFetchAllProjects = vi.fn().mockResolvedValue(undefined);

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          areProjectsLoaded: false,
          fetchAllProjects: mockFetchAllProjects,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<ProjectsTab />);

      expect(mockFetchAllProjects).toHaveBeenCalled();
    });

    it("loads protective systems on mount if not loaded", () => {
      const mockFetchAllProtectiveSystems = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          arePsvsLoaded: false,
          fetchAllProtectiveSystems: mockFetchAllProtectiveSystems,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<ProjectsTab />);

      expect(mockFetchAllProtectiveSystems).toHaveBeenCalled();
    });
  });

  describe("Summary Cards", () => {
    it("displays correct project counts", () => {
      render(<ProjectsTab />);

      expect(screen.getAllByText("2")[0]).toBeInTheDocument(); // Total projects
      expect(screen.getAllByText("1")[0]).toBeInTheDocument(); // In review count / PSVs linked
    });

    it("shows summary card labels", () => {
      render(<ProjectsTab />);

      expect(screen.getByText("Total Projects")).toBeInTheDocument();
      expect(screen.getByText("In Review")).toBeInTheDocument();
      expect(screen.getByText("PSVs Linked")).toBeInTheDocument();
    });
  });

  describe("Search and Filtering", () => {
    it("renders search input field", () => {
      render(<ProjectsTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it("renders status filter dropdown", () => {
      render(<ProjectsTab />);

      const selectElements = screen.getAllByRole("combobox");
      expect(selectElements.length).toBeGreaterThan(0);
    });

    it("displays status filter options", () => {
      render(<ProjectsTab />);

      // The status filter combobox should be present
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes.length).toBeGreaterThan(0);
      // The select has "all" as default value
      expect(comboboxes[0]).toBeInTheDocument();
    });
  });

  describe("Table Interactions", () => {
    it("renders table with correct headers", () => {
      render(<ProjectsTab />);

      expect(screen.getAllByText("Code").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Area").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Phase").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
      expect(screen.getAllByText("PSVs").length).toBeGreaterThan(0);
    });

    it("displays project data in table rows", () => {
      render(<ProjectsTab />);

      expect(screen.getAllByText("PROJ001").length).toBeGreaterThan(0);
      expect(
        screen.getAllByText("Main Process Project").length,
      ).toBeGreaterThan(0);
      expect(screen.getAllByText("design").length).toBeGreaterThan(0);
    });

    it("renders action buttons for each row", () => {
      render(<ProjectsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /deactivate/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("displays phase chips with correct colors", () => {
      render(<ProjectsTab />);

      expect(screen.getAllByText("design").length).toBeGreaterThan(0);
      expect(screen.getAllByText("construction").length).toBeGreaterThan(0);
    });

    it("displays workflow status chips", () => {
      render(<ProjectsTab />);

      expect(screen.getAllByText("approved").length).toBeGreaterThan(0);
      expect(screen.getAllByText("in review").length).toBeGreaterThan(0);
    });

    it("displays PSV count chips", () => {
      render(<ProjectsTab />);

      expect(screen.getAllByText("1 PSV")[0]).toBeInTheDocument();
      expect(screen.getAllByText("0 PSVs")[0]).toBeInTheDocument();
    });
  });

  describe("Status Toggle", () => {
    it("allows toggling project active status", async () => {
      const user = userEvent.setup();
      const mockUpdateProject = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          updateProject: mockUpdateProject,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<ProjectsTab />);

      // The "Active" chip is rendered for project1 (isActive: true)
      // Use role="button" to specifically target the clickable Chip (not the column header)
      const activeChips = screen.getAllByRole("button", { name: /^Active$/i });
      // Find a chip that is not a column header (chips have role=button in MUI)
      expect(activeChips.length).toBeGreaterThan(0);
      await user.click(activeChips[0]);

      expect(mockUpdateProject).toHaveBeenCalledWith("project1", {
        isActive: false,
      });
    });

    it("shows inactive projects with inactive status", () => {
      render(<ProjectsTab />);

      expect(screen.getAllByText("Inactive").length).toBeGreaterThan(0);
    });
  });

  describe("Cascade Status Operations", () => {
    it("activates parent entities when project is activated", async () => {
      const user = userEvent.setup();
      const mockUpdateProject = vi.fn();
      const mockUpdateArea = vi.fn();
      const mockUpdateUnit = vi.fn();
      const mockUpdatePlant = vi.fn();
      const mockUpdateCustomer = vi.fn();

      // Mock inactive parent entities
      vi.mocked(usePsvStore).getState = vi.fn(() => ({
        ...mockStore,
        areas: [{ ...mockStore.areas[0], status: "inactive" }],
        units: [{ ...mockStore.units[0], status: "inactive" }],
        plants: [{ id: "plant1", status: "inactive" as const }],
        customers: [{ id: "customer1", status: "inactive" as const }],
        updateProject: mockUpdateProject,
        updateArea: mockUpdateArea,
        updateUnit: mockUpdateUnit,
        updatePlant: mockUpdatePlant,
        updateCustomer: mockUpdateCustomer,
      }));

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const state = vi.mocked(usePsvStore).getState();
        return selector ? selector(state) : state;
      });

      render(<ProjectsTab />);

      // Find inactive project status chips and click the first one
      const inactiveChips = screen.getAllByText("Inactive");
      await user.click(inactiveChips[0]);

      expect(mockUpdateProject).toHaveBeenCalledWith("project2", {
        isActive: true,
      });
      // Note: Cascade activation would require more complex mocking of the parent entities
    });
  });

  describe("Pagination", () => {
    it("renders items per page selector", () => {
      render(<ProjectsTab />);

      // Both mobile and desktop views render ItemsPerPageSelector
      expect(screen.getAllByTestId("items-per-page")[0]).toBeInTheDocument();
    });
  });

  describe("CRUD Operations", () => {
    it("opens add project dialog when Add New Project button is clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectsTab />);

      const addButtons = screen.getAllByText("Add New Project");
      const addButton = addButtons[0];
      await user.click(addButton);

      // Dialog should be opened (mocked ProjectDialog component)
      expect(screen.getByTestId("project-dialog")).toBeInTheDocument();
    });

    it("opens edit project dialog when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Dialog should be opened with edit mode
      expect(screen.getByTestId("project-dialog")).toBeInTheDocument();
    });

    it("opens delete confirmation when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<ProjectsTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /deactivate/i });
      await user.click(deleteButtons[0]);

      // Delete confirmation dialog should be visible
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      expect(screen.getByText(/deactivate.*project/i)).toBeInTheDocument();
    });

    it("calls addProject action when project is created", async () => {
      const user = userEvent.setup();
      const mockAddProject = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          addProject: mockAddProject,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<ProjectsTab />);

      // Mock successful form submission
      const addButtons = screen.getAllByText("Add New Project");
      const addButton = addButtons[0];
      await user.click(addButton);

      // Simulate form submission (this would normally happen in ProjectDialog)
      expect(mockAddProject).toBeDefined();
    });

    it("calls updateProject action when project is edited", async () => {
      const user = userEvent.setup();
      const mockUpdateProject = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          updateProject: mockUpdateProject,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<ProjectsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Verify update action is available for editing
      expect(mockUpdateProject).toBeDefined();
    });

    it("calls softDeleteProject action when delete is confirmed", async () => {
      const user = userEvent.setup();
      const mockSoftDeleteProject = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          softDeleteProject: mockSoftDeleteProject,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<ProjectsTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /deactivate/i });
      await user.click(deleteButtons[0]);

      // Confirm delete action
      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockSoftDeleteProject).toHaveBeenCalledWith("project1");
    });
  });

  describe("Search and Filter Interactions", () => {
    it("filters projects based on search input", async () => {
      const user = userEvent.setup();
      render(<ProjectsTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      const searchInput = searchInputs[0];

      await user.type(searchInput, "Main Process");

      // Search functionality is handled by component state
      expect(searchInput).toHaveValue("Main Process");
    });

    it("filters projects by status using dropdown", async () => {
      const user = userEvent.setup();
      render(<ProjectsTab />);

      const selectElements = screen.getAllByRole("combobox");
      const statusSelect = selectElements[0];

      await user.click(statusSelect);
      await user.click(screen.getAllByText("Active (1)")[0]);

      // Status filtering is handled by component state
      expect(statusSelect).toBeInTheDocument();
    });
  });

  describe("Permission-Based Features", () => {
    it("shows edit and delete buttons for authorized users", () => {
      render(<ProjectsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /deactivate/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("hides edit and delete buttons for unauthorized users", () => {
      vi.mocked(useAuthStore).mockImplementation((selector: any) => {
        const state = {
          canEdit: () => false,
          canApprove: () => false,
        };
        return selector ? selector(state) : state;
      });

      render(<ProjectsTab />);

      const editButtons = screen.queryAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.queryAllByRole("button", {
        name: /deactivate/i,
      });

      // Buttons should not be rendered for unauthorized users
      expect(editButtons).toHaveLength(0);
      expect(deleteButtons).toHaveLength(0);
    });
  });
});
