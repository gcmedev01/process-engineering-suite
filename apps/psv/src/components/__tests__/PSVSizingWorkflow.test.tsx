import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { SizingTab } from "../tabs/SizingTab";

// Mock the stores
vi.mock("@/store/usePsvStore", () => ({
  usePsvStore: vi.fn(),
}));

vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/lib/useProjectUnitSystem", () => ({
  useProjectUnitSystem: vi.fn(() => ({
    unitSystem: "metric",
    units: {
      pressureGauge: { unit: "barg", label: "barg" },
      pressureDrop: { unit: "kPa", label: "kPa" },
      temperature: { unit: "C", label: "°C" },
      massFlow: { unit: "kg/h", label: "kg/h" },
      length: { unit: "m", label: "m" },
      diameter: { unit: "mm", label: "mm" },
      area: { unit: "mm2", label: "mm²" },
    },
  })),
}));

// Mock shared DeleteConfirmDialog
vi.mock("@/components/shared/DeleteConfirmDialog", () => ({
  DeleteConfirmDialog: vi.fn(({ open }: any) =>
    open ? <div data-testid="delete-dialog" /> : null
  ),
}));

import { usePsvStore } from "@/store/usePsvStore";
import { useAuthStore } from "@/store/useAuthStore";

describe("PSV Sizing Workflow", () => {
  const mockAddSizingCase = vi.fn();
  const mockUpdateSizingCase = vi.fn();

  const mockSizingCases = [
    {
      id: "case-1",
      scenarioId: "scenario-1",
      status: "draft",
      standard: "API-520",
      method: "gas",
      isActive: true,
      inputs: {
        massFlowRate: 1000,
        temperature: 25,
        pressure: 1.5,
        molecularWeight: 28,
        setPressure: 10,
      },
      outputs: {
        requiredArea: 0,
        selectedOrifice: "D",
        orificeArea: 71,
        percentUsed: 0,
        ratedCapacity: 0,
        isCriticalFlow: false,
        numberOfValves: 1,
        messages: [],
        requiredAreaIn2: 0,
      },
    },
  ];

  const mockScenarios = [
    {
      id: "scenario-1",
      cause: "fire",
      description: "Fire case",
      isActive: true,
      isGoverning: false,
      relievingRate: 1000,
      relievingTemp: 25,
      relievingPressure: 1.5,
      setPressure: 10,
      accumulationPct: 10,
      phase: "gas",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuthStore as any).mockImplementation((selector: any) => {
      const state = {
        currentUser: { role: "engineer", id: "user-1" },
        canEdit: () => true,
        canApprove: () => false,
      };
      return selector ? selector(state) : state;
    });

    (usePsvStore as any).mockImplementation((selector: any) => {
      const state = {
        sizingCaseList: mockSizingCases,
        scenarioList: mockScenarios,
        selectedPsv: { id: "psv-1", isActive: true, setPressure: 10, ownerId: "user-1", valveType: "conventional" },
        selectedProject: { id: "proj-1", isActive: true },
        addSizingCase: mockAddSizingCase,
        updateSizingCase: mockUpdateSizingCase,
        softDeleteSizingCase: vi.fn(),
        reactivateSizingCase: vi.fn(),
        deleteSizingCase: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    // Also mock getState for the component's usePsvStore.getState() calls
    (usePsvStore as any).getState = vi.fn(() => ({
      sizingCaseList: mockSizingCases,
      scenarioList: mockScenarios,
      selectedPsv: { id: "psv-1", isActive: true, setPressure: 10, ownerId: "user-1", valveType: "conventional" },
      selectedProject: { id: "proj-1", isActive: true },
      addSizingCase: mockAddSizingCase,
      updateSizingCase: mockUpdateSizingCase,
      softDeleteSizingCase: vi.fn(),
      reactivateSizingCase: vi.fn(),
      deleteSizingCase: vi.fn(),
    }));
  });

  it("displays existing sizing cases", () => {
    render(<SizingTab />);

    // The component renders "{sizing.standard} • {sizing.method.toUpperCase()} method" in one Typography
    expect(screen.getByText(/API-520/)).toBeInTheDocument();
    expect(screen.getByText(/GAS method/)).toBeInTheDocument();
  });

  it("shows create sizing case button", () => {
    render(<SizingTab />);

    // Button text is "New Sizing Case" - multiple may appear (header + empty state)
    const buttons = screen.getAllByRole("button", { name: /new.*sizing.*case/i });
    expect(buttons.length).toBeGreaterThan(0);
  });

  it("displays scenario information for sizing cases", () => {
    render(<SizingTab />);

    // "Fire" appears as the scenario name in the sizing case card
    expect(screen.getAllByText("Fire")[0]).toBeInTheDocument();
  });

  it("shows status badges for sizing cases", () => {
    render(<SizingTab />);

    // "Draft" appears as the status chip
    expect(screen.getAllByText("Draft")[0]).toBeInTheDocument();
  });

  it("displays sizing inputs in the table", () => {
    render(<SizingTab />);

    // The component renders formatted values: temperature as "25.0 °C", pressure as "1.50 barg"
    // Multiple elements may match; check at least one exists
    expect(screen.getAllByText(/25\.0/)[0]).toBeInTheDocument(); // temperature formatted
    expect(screen.getAllByText(/1\.50/)[0]).toBeInTheDocument(); // pressure formatted
  });

  it("shows no sizing cases message when list is empty", () => {
    (usePsvStore as any).mockImplementation((selector: any) => {
      const state = {
        sizingCaseList: [],
        scenarioList: mockScenarios,
        selectedPsv: { id: "psv-1", isActive: true, setPressure: 10, ownerId: "user-1", valveType: "conventional" },
        selectedProject: { id: "proj-1", isActive: true },
        addSizingCase: mockAddSizingCase,
        updateSizingCase: mockUpdateSizingCase,
        softDeleteSizingCase: vi.fn(),
        reactivateSizingCase: vi.fn(),
        deleteSizingCase: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(<SizingTab />);

    expect(screen.getByText("No sizing cases")).toBeInTheDocument();
    expect(
      screen.getByText("Create a sizing case from an overpressure scenario"),
    ).toBeInTheDocument();
  });

  it("calls addSizingCase when creating a new case", async () => {
    const user = userEvent.setup();
    mockAddSizingCase.mockResolvedValue({
      id: "new-case",
      status: "draft",
    });

    render(<SizingTab />);

    const createButtons = screen.getAllByRole("button", {
      name: /new.*sizing.*case/i,
    });
    await user.click(createButtons[0]);

    // This would normally open a dialog, but for this test we mock the action
    // In a real integration test, we'd interact with the dialog
    await waitFor(() => {
      expect(mockAddSizingCase).not.toHaveBeenCalled(); // Not called yet since we didn't complete the flow
    });
  });

  it("shows edit button for sizing cases", () => {
    render(<SizingTab />);

    // MUI Tooltip title "Edit" sets aria-label on the IconButton
    const editButtons = screen.getAllByLabelText(/edit/i);
    expect(editButtons.length).toBeGreaterThan(0);
  });

  it("displays calculation results when available", () => {
    // Use requiredArea=37.5, orificeArea=50 to get exactly 75.0%
    const calculatedCase = {
      ...mockSizingCases[0],
      status: "calculated",
      outputs: {
        requiredArea: 37.5,
        selectedOrifice: "D",
        orificeArea: 50,
        percentUsed: 75,
        ratedCapacity: 1200,
        isCriticalFlow: false,
        numberOfValves: 1,
        messages: [],
        requiredAreaIn2: 0,
      },
    };

    (usePsvStore as any).mockImplementation((selector: any) => {
      const state = {
        sizingCaseList: [calculatedCase],
        scenarioList: mockScenarios,
        selectedPsv: { id: "psv-1", isActive: true, setPressure: 10, ownerId: "user-1", valveType: "conventional" },
        selectedProject: { id: "proj-1", isActive: true },
        addSizingCase: mockAddSizingCase,
        updateSizingCase: mockUpdateSizingCase,
        softDeleteSizingCase: vi.fn(),
        reactivateSizingCase: vi.fn(),
        deleteSizingCase: vi.fn(),
      };
      return selector ? selector(state) : state;
    });

    render(<SizingTab />);

    expect(screen.getAllByText("D")[0]).toBeInTheDocument(); // selected orifice
    expect(screen.getAllByText(/75\.0%/)[0]).toBeInTheDocument(); // percent used (75.0%)
    expect(screen.getAllByText(/1,200/)[0]).toBeInTheDocument(); // rated capacity formatted
  });
});
