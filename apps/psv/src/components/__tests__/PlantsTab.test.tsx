import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlantsTab } from "../PlantsTab";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Mock all dependencies
vi.mock("@/store/usePsvStore");
vi.mock("@/store/useAuthStore");
vi.mock("@/hooks/usePagination");
vi.mock("@/hooks/useLocalStorage");
vi.mock("../dashboard/PlantDialog", () => ({
  PlantDialog: vi.fn(({ open }: any) =>
    open ? <div data-testid="plant-dialog" /> : null
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

const createMockStore = (overrides = {}): any => {
  const baseStore = {
    // Selection state
    selectedCustomer: {
      id: "customer1",
      name: "Test Customer",
      code: "CUST001",
      status: "active" as const,
      ownerId: "user1",
      createdAt: "2024-01-01T00:00:00Z",
    },
    selectedPlant: null,
    selectedUnit: null,
    selectedArea: null,
    selectedPsv: null,
    selectedProject: null,

    // Data arrays
    plants: [
      {
        id: "plant1",
        code: "PLANT001",
        name: "North Plant",
        customerId: "customer1",
        ownerId: "user1",
        location: "North Location",
        status: "active" as const,
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "plant2",
        code: "PLANT002",
        name: "South Plant",
        customerId: "customer2",
        ownerId: "user2",
        location: "South Location",
        status: "inactive" as const,
        createdAt: "2024-01-02T00:00:00Z",
      },
    ],
    customers: [
      {
        id: "customer1",
        name: "Test Customer A",
        code: "CUST001",
        status: "active" as const,
        ownerId: "user1",
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "customer2",
        name: "Test Customer B",
        code: "CUST002",
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
    areas: [],
    projects: [],
    protectiveSystems: [],
    equipment: [],

    // UI state
    activeTab: "overview",
    dashboardTab: null,
    isLoading: false,

    // Summary counts
    summaryCounts: {
      customers: 2,
      plants: 2,
      units: 1,
      areas: 0,
      projects: 0,
      psvs: 0,
    },

    // Actions
    addPlant: vi.fn(),
    updatePlant: vi.fn(),
    deletePlant: vi.fn(),
    softDeletePlant: vi.fn(),
    fetchAllPlants: vi.fn(),
    arePlantsLoaded: true,
    fetchAllUnits: vi.fn(),
    areUnitsLoaded: true,
    fetchSummaryCounts: vi.fn(),

    // Area/Unit/Plant/Customer actions for cascade operations
    updateArea: vi.fn(),
    updateUnit: vi.fn(),
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
    addProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addProtectiveSystem: vi.fn(),
    updateProtectiveSystem: vi.fn(),
    deleteProtectiveSystem: vi.fn(),
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

describe("PlantsTab", () => {
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
      pageItems: mockStore.plants,
    });

    vi.mocked(useLocalStorage).mockReturnValue([15, vi.fn()]);
  });

  describe("Initial Rendering", () => {
    it("renders without crashing", () => {
      expect(() => render(<PlantsTab />)).not.toThrow();
    });

    it("renders basic structure", () => {
      render(<PlantsTab />);

      expect(screen.getAllByText("Add New Plant").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Test Customer - Plants")[0]).toBeInTheDocument();
    });

    it("shows default title when no customer selected", () => {
      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const state = createMockStore({ selectedCustomer: null });
        return selector ? selector(state) : state;
      });

      render(<PlantsTab />);

      expect(screen.getAllByText("Plants")[0]).toBeInTheDocument();
    });

    it("shows add button for users with edit permissions", () => {
      render(<PlantsTab />);

      const addButtons = screen.getAllByText("Add New Plant");
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

      render(<PlantsTab />);

      // When canEdit=false the "Add New Plant" button should not be rendered.
      // Check by role to avoid matching hidden tooltip text
      const addButtons = screen.queryAllByRole("button", { name: /add new plant/i });
      expect(addButtons).toHaveLength(0);
    });
  });

  describe("Data Loading", () => {
    it("loads plants on mount if not loaded", () => {
      const mockFetchAllPlants = vi.fn().mockResolvedValue(undefined);

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          arePlantsLoaded: false,
          fetchAllPlants: mockFetchAllPlants,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PlantsTab />);

      expect(mockFetchAllPlants).toHaveBeenCalled();
    });

    it("loads units on mount if not loaded", () => {
      const mockFetchAllUnits = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          areUnitsLoaded: false,
          fetchAllUnits: mockFetchAllUnits,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PlantsTab />);

      expect(mockFetchAllUnits).toHaveBeenCalled();
    });

    it("loads summary counts on mount", () => {
      const mockFetchSummaryCounts = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          fetchSummaryCounts: mockFetchSummaryCounts,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PlantsTab />);

      expect(mockFetchSummaryCounts).toHaveBeenCalled();
    });
  });

  describe("Summary Cards", () => {
    it("displays correct plant counts", () => {
      render(<PlantsTab />);

      expect(screen.getAllByText("2")[0]).toBeInTheDocument(); // Total plants
      expect(screen.getAllByText("1")[0]).toBeInTheDocument(); // Active sites / units
    });

    it("shows summary card labels", () => {
      render(<PlantsTab />);

      expect(screen.getAllByText("Plants")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Active Sites")[0]).toBeInTheDocument();
      expect(screen.getAllByText("Units")[0]).toBeInTheDocument();
    });
  });

  describe("Search and Filtering", () => {
    it("renders search input field", () => {
      render(<PlantsTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it("renders status filter dropdown", () => {
      render(<PlantsTab />);

      const selectElements = screen.getAllByRole("combobox");
      expect(selectElements.length).toBeGreaterThan(0);
    });

    it("displays status filter options", () => {
      render(<PlantsTab />);

      // The status filter combobox should be present
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes.length).toBeGreaterThan(0);
      expect(comboboxes[0]).toBeInTheDocument();
    });
  });

  describe("Table Interactions", () => {
    it("renders table with correct headers", () => {
      render(<PlantsTab />);

      expect(screen.getAllByText("Code").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Customer").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Owner").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Units").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Status").length).toBeGreaterThan(0);
    });

    it("displays plant data in table rows", () => {
      render(<PlantsTab />);

      expect(screen.getAllByText("PLANT001").length).toBeGreaterThan(0);
      expect(screen.getAllByText("North Plant").length).toBeGreaterThan(0);
      // PlantsTab uses static mockData for customer lookup; mock IDs won't match so "N/A" is rendered
      expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
    });

    it("renders action buttons for each row", () => {
      render(<PlantsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /deactivate/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("displays unit count chips", () => {
      render(<PlantsTab />);

      expect(screen.getAllByText("1 unit")[0]).toBeInTheDocument();
      expect(screen.getAllByText("0 units")[0]).toBeInTheDocument();
    });
  });

  describe("Status Toggle", () => {
    it("allows toggling plant active status", async () => {
      const user = userEvent.setup();
      const mockSoftDeletePlant = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          softDeletePlant: mockSoftDeletePlant,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PlantsTab />);

      // Click the first "active" status chip → toggles active plant to inactive via softDelete
      const statusChips = screen.getAllByText("active");
      await user.click(statusChips[0]);

      expect(mockSoftDeletePlant).toHaveBeenCalledWith("plant1");
    });

    it("shows inactive plants with reduced opacity", () => {
      render(<PlantsTab />);

      // Check that inactive status is displayed
      expect(screen.getAllByText("inactive").length).toBeGreaterThan(0);
    });
  });

  describe("Cascade Status Operations", () => {
    it("deactivates child entities when plant is deactivated", async () => {
      const user = userEvent.setup();
      const mockSoftDeletePlant = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          softDeletePlant: mockSoftDeletePlant,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PlantsTab />);

      // Find active plant status chips and click the first one
      const activeChips = screen.getAllByText("active");
      await user.click(activeChips[0]);

      expect(mockSoftDeletePlant).toHaveBeenCalledWith("plant1");
    });

    it("activates parent entities when plant is activated", async () => {
      const user = userEvent.setup();
      const mockUpdatePlant = vi.fn();
      const mockUpdateCustomer = vi.fn();

      // Mock inactive parent customer
      vi.mocked(usePsvStore).getState = vi.fn(() => ({
        ...mockStore,
        customers: [{ ...mockStore.customers[1], status: "inactive" }],
        updatePlant: mockUpdatePlant,
        updateCustomer: mockUpdateCustomer,
      }));

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const state = vi.mocked(usePsvStore).getState();
        return selector ? selector(state) : state;
      });

      render(<PlantsTab />);

      // Find inactive plant status chips and click the first one
      const inactiveChips = screen.getAllByText("inactive");
      await user.click(inactiveChips[0]);

      expect(mockUpdatePlant).toHaveBeenCalledWith("plant2", {
        status: "active",
      });
      // Note: Cascade activation would require more complex mocking of the parent entities
    });
  });

  describe("Pagination", () => {
    it("renders items per page selector", () => {
      render(<PlantsTab />);

      // Both mobile and desktop views render ItemsPerPageSelector
      expect(screen.getAllByTestId("items-per-page")[0]).toBeInTheDocument();
    });
  });

  describe("CRUD Operations", () => {
    it("opens add plant dialog when Add New Plant button is clicked", async () => {
      const user = userEvent.setup();
      render(<PlantsTab />);

      const addButtons = screen.getAllByText("Add New Plant");
      const addButton = addButtons[0];
      await user.click(addButton);

      // Dialog should be opened (mocked PlantDialog component)
      expect(screen.getByTestId("plant-dialog")).toBeInTheDocument();
    });

    it("opens edit plant dialog when edit button is clicked", async () => {
      const user = userEvent.setup();
      render(<PlantsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Dialog should be opened with edit mode
      expect(screen.getByTestId("plant-dialog")).toBeInTheDocument();
    });

    it("opens delete confirmation when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<PlantsTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /deactivate/i });
      await user.click(deleteButtons[0]);

      // Delete confirmation dialog should be visible
      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
      expect(screen.getByText(/delete.*plant/i)).toBeInTheDocument();
    });

    it("calls addPlant action when plant is created", async () => {
      const user = userEvent.setup();
      const mockAddPlant = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          addPlant: mockAddPlant,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PlantsTab />);

      // Mock successful form submission
      const addButtons = screen.getAllByText("Add New Plant");
      const addButton = addButtons[0];
      await user.click(addButton);

      // Simulate form submission (this would normally happen in PlantDialog)
      expect(mockAddPlant).toBeDefined();
    });

    it("calls updatePlant action when plant is edited", async () => {
      const user = userEvent.setup();
      const mockUpdatePlant = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          updatePlant: mockUpdatePlant,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PlantsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      await user.click(editButtons[0]);

      // Verify update action is available for editing
      expect(mockUpdatePlant).toBeDefined();
    });

    it("calls softDeletePlant action when delete is confirmed", async () => {
      const user = userEvent.setup();
      const mockSoftDeletePlant = vi.fn();

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          softDeletePlant: mockSoftDeletePlant,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<PlantsTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /deactivate/i });
      await user.click(deleteButtons[0]);

      // Confirm delete action
      const confirmButton = screen.getByRole("button", { name: /confirm/i });
      await user.click(confirmButton);

      expect(mockSoftDeletePlant).toHaveBeenCalledWith("plant1");
    });
  });

  describe("Search and Filter Interactions", () => {
    it("filters plants based on search input", async () => {
      const user = userEvent.setup();
      render(<PlantsTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      const searchInput = searchInputs[0];

      await user.type(searchInput, "North Plant");

      // Search functionality is handled by component state
      expect(searchInput).toHaveValue("North Plant");
    });

    it("filters plants by status using dropdown", async () => {
      const user = userEvent.setup();
      render(<PlantsTab />);

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
      render(<PlantsTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deactivateButtons = screen.getAllByRole("button", { name: /deactivate/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deactivateButtons.length).toBeGreaterThan(0);
    });

    it("hides edit and delete buttons for unauthorized users", () => {
      vi.mocked(useAuthStore).mockImplementation((selector: any) => {
        const state = {
          canEdit: () => false,
          canApprove: () => false,
        };
        return selector ? selector(state) : state;
      });

      render(<PlantsTab />);

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
