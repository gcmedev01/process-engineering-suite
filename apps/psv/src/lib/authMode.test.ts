import { describe, expect, it } from "vitest";
import { getSharedAuthApiBaseUrl } from "./authMode";

describe("getSharedAuthApiBaseUrl", () => {
  it("disables shared API auth in local storage mode", () => {
    expect(getSharedAuthApiBaseUrl(true, "http://localhost:8000")).toBeUndefined();
  });

  it("uses the shared auth API outside local storage mode", () => {
    expect(getSharedAuthApiBaseUrl(false, "http://localhost:8000")).toBe("http://localhost:8000");
  });
});
