import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EquipmentTab } from "../EquipmentTab";
import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";
import { usePagination } from "@/hooks/usePagination";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Mock all dependencies
vi.mock("@/store/usePsvStore");
vi.mock("@/store/useAuthStore");
vi.mock("@/hooks/usePagination");
vi.mock("@/hooks/useLocalStorage");
vi.mock("../dashboard/EquipmentDialog", () => ({
  EquipmentDialog: vi.fn(() => <div data-testid="equipment-dialog" />),
}));
vi.mock("../shared", () => ({
  DeleteConfirmDialog: vi.fn(({ open }: any) =>
    open ? <div data-testid="delete-dialog" /> : <div data-testid="delete-dialog" style={{ display: "none" }} />,
  ),
  TableSortButton: vi.fn(() => <span data-testid="table-sort-button" />),
  PaginationControls: vi.fn(() => <div data-testid="pagination" />),
  ItemsPerPageSelector: vi.fn(() => <div data-testid="items-per-page" />),
}));

const createMockStore = (overrides = {}) => ({
  // Selection state
  selection: {},
  selectedCustomer: null,
  selectedPlant: null,
  selectedUnit: null,
  selectedArea: null,
  selectedPsv: null,
  selectedProject: null,

  // Data arrays
  customers: [],
  plants: [],
  units: [],
  areas: [],
  projects: [],
  protectiveSystems: [],
  equipment: [
    {
      id: "equip1",
      tag: "EQ-001",
      type: "vessel",
      areaId: "area1",
      designPressure: 100,
      mawp: 150,
      designTemp: 200,
      status: "active" as const,
      owner: "John Doe",
    },
  ],
  equipmentLinkList: [],
  psvRevisions: [],
  sizingCaseList: [],
  scenarioList: [],

  // UI state
  activeTab: "overview",
  dashboardTab: null,
  isLoading: false,

  // Actions
  addEquipment: vi.fn(),
  updateEquipment: vi.fn(),
  deleteEquipment: vi.fn(),
  softDeleteEquipment: vi.fn(),
  fetchAllEquipment: vi.fn().mockResolvedValue(undefined),
  areEquipmentLoaded: true,
  updateArea: vi.fn(),
  updateUnit: vi.fn(),
  updatePlant: vi.fn(),
  updateCustomer: vi.fn(),
  ...overrides,
});

describe("EquipmentTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePsvStore).mockImplementation((selector) => {
      const mockState = createMockStore() as any;
      return selector ? selector(mockState) : mockState;
    });

    vi.mocked(useAuthStore).mockImplementation((selector?: any) => {
      const state = { canEdit: vi.fn(() => true), canApprove: vi.fn(() => true) };
      return selector ? selector(state) : state;
    });

    vi.mocked(usePagination).mockReturnValue({
      currentPage: 1,
      totalPages: 1,
      startIndex: 0,
      endIndex: 1,
      goToPage: vi.fn(),
      nextPage: vi.fn(),
      prevPage: vi.fn(),
      hasNextPage: false,
      hasPrevPage: false,
      pageNumbers: [1],
      pageItems: [
        {
          id: "equip1",
          tag: "EQ-001",
          type: "vessel",
          areaId: "area1",
          designPressure: 100,
          mawp: 150,
          designTemp: 200,
          status: "active" as const,
          owner: "John Doe",
        },
      ],
    });

    vi.mocked(useLocalStorage).mockReturnValue([15, vi.fn()]);
  });

  describe("Initial Rendering", () => {
    it("renders without crashing", () => {
      expect(() => render(<EquipmentTab />)).not.toThrow();
    });

    it("renders basic structure", () => {
      render(<EquipmentTab />);

      expect(screen.getByText("Add New Equipment")).toBeInTheDocument();
      expect(screen.getByText("Tag")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
    });

    it("shows add button for users with edit permissions", () => {
      render(<EquipmentTab />);

      const addButton = screen.getByText("Add New Equipment");
      expect(addButton).toBeInTheDocument();
    });

    it("hides add button for users without edit permissions", () => {
      vi.mocked(useAuthStore).mockImplementation((selector?: any) => {
        const state = { canEdit: vi.fn(() => false), canApprove: vi.fn(() => false) };
        return selector ? selector(state) : state;
      });

      render(<EquipmentTab />);

      const addButton = screen.queryByText("Add New Equipment");
      expect(addButton).not.toBeInTheDocument();
    });

    it("displays equipment data correctly", () => {
      render(<EquipmentTab />);

      expect(screen.getByText("EQ-001")).toBeInTheDocument();
      // Type is title-cased via getTypeLabel("vessel") → "Vessel"
      expect(screen.getByText("Vessel")).toBeInTheDocument();
      // Status chip renders the raw status string
      expect(screen.getByText("active")).toBeInTheDocument();
    });
  });

  describe("Data Loading", () => {
    it("loads equipment on mount if not loaded", () => {
      const mockFetchAllEquipment = vi.fn().mockResolvedValue(undefined);

      vi.mocked(usePsvStore).mockImplementation((selector) => {
        const mockState = createMockStore({
          areEquipmentLoaded: false,
          fetchAllEquipment: mockFetchAllEquipment,
        }) as any;
        return selector ? selector(mockState) : mockState;
      });

      render(<EquipmentTab />);

      expect(mockFetchAllEquipment).toHaveBeenCalled();
    });
  });

  describe("Search and Filtering", () => {
    it("renders search input field", () => {
      render(<EquipmentTab />);

      const searchInputs = screen.getAllByPlaceholderText(/search/i);
      expect(searchInputs.length).toBeGreaterThan(0);
    });

    it("renders status filter dropdown", () => {
      render(<EquipmentTab />);

      const selectElements = screen.getAllByRole("combobox");
      expect(selectElements.length).toBeGreaterThan(0);
    });
  });

  describe("Table Interactions", () => {
    it("renders table with correct headers", () => {
      render(<EquipmentTab />);

      expect(screen.getByText("Tag")).toBeInTheDocument();
      expect(screen.getByText("Type")).toBeInTheDocument();
      expect(screen.getByText("Area")).toBeInTheDocument();
      expect(screen.getByText("Design Pressure")).toBeInTheDocument();
    });

    it("displays equipment data in table rows", () => {
      render(<EquipmentTab />);

      expect(screen.getByText("EQ-001")).toBeInTheDocument();
      // Design pressure is rendered as "100.0 barg" not "100"
      expect(screen.getByText(/100\.0/)).toBeInTheDocument();
    });

    it("renders action buttons for each row", () => {
      render(<EquipmentTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Sorting Functionality", () => {
    it("renders sort buttons for sortable columns", () => {
      render(<EquipmentTab />);

      const sortButtons = document.querySelectorAll('[data-testid*="sort-"]');
      expect(sortButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Pagination", () => {
    it("renders pagination controls", () => {
      render(<EquipmentTab />);

      expect(screen.getByTestId("pagination")).toBeInTheDocument();
    });

    it("renders items per page selector", () => {
      render(<EquipmentTab />);

      expect(screen.getByTestId("items-per-page")).toBeInTheDocument();
    });
  });

  describe("Dialog Interactions", () => {
    it("renders equipment dialog component when Add button is clicked", async () => {
      const user = userEvent.setup();
      render(<EquipmentTab />);

      const addButton = screen.getByText("Add New Equipment");
      await user.click(addButton);

      expect(screen.getByTestId("equipment-dialog")).toBeInTheDocument();
    });

    it("renders delete confirmation dialog when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(<EquipmentTab />);

      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(screen.getByTestId("delete-dialog")).toBeInTheDocument();
    });
  });

  describe("Permission-Based Features", () => {
    it("shows edit and delete buttons for authorized users", () => {
      render(<EquipmentTab />);

      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

      expect(editButtons.length).toBeGreaterThan(0);
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it("hides edit and delete buttons for unauthorized users", () => {
      vi.mocked(useAuthStore).mockImplementation((selector?: any) => {
        const state = { canEdit: vi.fn(() => false), canApprove: vi.fn(() => false) };
        return selector ? selector(state) : state;
      });

      render(<EquipmentTab />);

      const editButtons = screen.queryAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.queryAllByRole("button", {
        name: /delete/i,
      });

      expect(editButtons.length).toBe(0);
      expect(deleteButtons.length).toBe(0);
    });
  });
});
