import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUnitConversion } from "../useUnitConversion";
import { UnitPreferences } from "@/data/types";
import { convertUnit } from "@eng-suite/physics";

describe("useUnitConversion", () => {
  const mockPreferences: UnitPreferences = {
    pressure: "psig",
    temperature: "F",
    flow: "kg/h",
    length: "m",
    area: "mm2",
    density: "kg/m3",
    viscosity: "cP",
    backpressure: "barg",
  };

  beforeEach(() => {
    // Reset the global mock from setup.ts
    vi.mocked(convertUnit).mockImplementation((value: number) => value); // Default passthrough
  });

  it("should initialize with provided preferences", () => {
    const { result } = renderHook(() => useUnitConversion(mockPreferences));

    expect(result.current.preferences).toEqual(mockPreferences);
  });

  it("should convert to display units", () => {
    vi.mocked(convertUnit).mockReturnValue(14.5038);

    const { result } = renderHook(() => useUnitConversion(mockPreferences));

    const converted = result.current.toDisplay(1, "pressure");

    expect(convertUnit).toHaveBeenCalledWith(1, "barg", "psig");
    expect(converted).toBe(14.5038);
  });

  it("should handle decimal places in toDisplay", () => {
    vi.mocked(convertUnit).mockReturnValue(14.503773773);

    const { result } = renderHook(() => useUnitConversion(mockPreferences));

    const converted = result.current.toDisplay(1, "pressure", 2);

    expect(converted).toBe(14.5);
  });

  it("should return 0 for undefined/null values in toDisplay", () => {
    const { result } = renderHook(() => useUnitConversion(mockPreferences));

    expect(result.current.toDisplay(undefined, "pressure")).toBe(0);
    expect(result.current.toDisplay(null as any, "pressure")).toBe(0);
  });

  it("should update unit preferences", () => {
    const { result } = renderHook(() => useUnitConversion(mockPreferences));

    act(() => {
      result.current.setUnit("pressure", "bar");
    });

    expect(result.current.preferences.pressure).toBe("bar");
  });

  it("should return BASE_UNITS constant", () => {
    const { result } = renderHook(() => useUnitConversion(mockPreferences));

    expect(result.current.BASE_UNITS).toEqual({
      pressure: "barg",
      temperature: "C",
      flow: "kg/h",
      length: "m",
      area: "mm2",
      density: "kg/m3",
      viscosity: "cP",
      backpressure: "barg",
    });
  });
});
