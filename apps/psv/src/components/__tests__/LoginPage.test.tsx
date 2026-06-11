import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { LoginPage } from "../LoginPage";

// Mock the useAuthStore
vi.mock("@/store/useAuthStore", () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from "@/store/useAuthStore";

describe("LoginPage", () => {
  const mockLogin = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnContinueAsGuest = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthStore as any).mockImplementation((selector?: any) => {
      const state = { login: mockLogin };
      return selector ? selector(state) : state;
    });
  });

  it("renders login form with required fields", () => {
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    expect(screen.getAllByLabelText("Username")[0]).toBeInTheDocument();
    expect(screen.getAllByLabelText("Password")[0]).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Sign in" })[0],
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue as Guest (View Only)" }),
    ).toBeInTheDocument();
  });

  it("shows demo credentials hint", () => {
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    expect(screen.getAllByText("Demo Accounts:")[0]).toBeInTheDocument();
    expect(screen.getAllByText("engineer / engineer")[0]).toBeInTheDocument();
    expect(screen.getAllByText("lead / lead")[0]).toBeInTheDocument();
  });

  it("disables submit button when fields are empty", async () => {
    const user = userEvent.setup();
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    const submitButton = screen.getAllByRole("button", { name: "Sign in" })[0];
    expect(submitButton).toBeDisabled();

    await user.type(screen.getAllByLabelText("Username")[0], "testuser");
    expect(submitButton).toBeDisabled();

    await user.type(screen.getAllByLabelText("Password")[0], "testpass");
    expect(submitButton).not.toBeDisabled();
  });

  it("calls onSuccess when login succeeds", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(true);

    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    await user.type(screen.getAllByLabelText("Username")[0], "engineer");
    await user.type(screen.getAllByLabelText("Password")[0], "engineer");
    await user.click(screen.getAllByRole("button", { name: "Sign in" })[0]);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("engineer", "engineer");
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("shows error message when login fails", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(false);

    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    await user.type(screen.getAllByLabelText("Username")[0], "invalid");
    await user.type(screen.getAllByLabelText("Password")[0], "invalid");
    await user.click(screen.getAllByRole("button", { name: "Sign in" })[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Invalid username or password"),
      ).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it("disables form during loading", async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(false), 100)),
    );

    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    await user.type(screen.getAllByLabelText("Username")[0], "user");
    await user.type(screen.getAllByLabelText("Password")[0], "pass");
    await user.click(screen.getAllByRole("button", { name: "Sign in" })[0]);

    expect(
      screen.getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();
    expect(screen.getAllByLabelText("Username")[0]).toBeDisabled();
    expect(screen.getAllByLabelText("Password")[0]).toBeDisabled();
  });

  it("calls onContinueAsGuest when guest button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Continue as Guest (View Only)" }),
    );

    expect(mockOnContinueAsGuest).toHaveBeenCalled();
  });

  it("validates form submission requires both fields", async () => {
    const user = userEvent.setup();
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    const submitButton = screen.getAllByRole("button", { name: "Sign in" })[0];
    expect(submitButton).toBeDisabled();

    await user.type(screen.getAllByLabelText("Username")[0], "user");
    expect(submitButton).toBeDisabled();

    await user.clear(screen.getAllByLabelText("Username")[0]);
    await user.type(screen.getAllByLabelText("Password")[0], "pass");
    expect(submitButton).toBeDisabled();
  });

  it("shows demo credentials hint", () => {
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    expect(screen.getByText("Demo Accounts:")).toBeInTheDocument();
    expect(screen.getByText("engineer / engineer")).toBeInTheDocument();
    expect(screen.getByText("lead / lead")).toBeInTheDocument();
  });

  it("disables submit button when fields are empty", async () => {
    const user = userEvent.setup();
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    const loginForm = screen.getByRole("form");
    const submitButton = within(loginForm).getByRole("button", {
      name: "Sign in",
    });
    expect(submitButton).toBeDisabled();

    await user.type(within(loginForm).getByLabelText("Username"), "testuser");
    expect(submitButton).toBeDisabled();

    await user.type(within(loginForm).getByLabelText("Password"), "testpass");
    expect(submitButton).not.toBeDisabled();
  });

  it("calls onSuccess when login succeeds", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(true);

    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    const loginForm = screen.getByRole("form");
    await user.type(within(loginForm).getByLabelText("Username"), "engineer");
    await user.type(within(loginForm).getByLabelText("Password"), "engineer");
    await user.click(
      within(loginForm).getByRole("button", { name: "Sign in" }),
    );

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("engineer", "engineer");
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it("shows error message when login fails", async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(false);

    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    const loginForm = screen.getByRole("form");
    await user.type(within(loginForm).getByLabelText("Username"), "invalid");
    await user.type(within(loginForm).getByLabelText("Password"), "invalid");
    await user.click(
      within(loginForm).getByRole("button", { name: "Sign in" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Invalid username or password"),
      ).toBeInTheDocument();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  it("disables form during loading", async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(false), 100)),
    );

    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    const loginForm = screen.getByRole("form");
    await user.type(within(loginForm).getByLabelText("Username"), "user");
    await user.type(within(loginForm).getByLabelText("Password"), "pass");
    await user.click(
      within(loginForm).getByRole("button", { name: "Sign in" }),
    );

    expect(
      within(loginForm).getByRole("button", { name: "Signing in..." }),
    ).toBeDisabled();
    expect(within(loginForm).getByLabelText("Username")).toBeDisabled();
    expect(within(loginForm).getByLabelText("Password")).toBeDisabled();
  });

  it("calls onContinueAsGuest when guest button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Continue as Guest (View Only)" }),
    );

    expect(mockOnContinueAsGuest).toHaveBeenCalled();
  });

  it("validates form submission requires both fields", async () => {
    const user = userEvent.setup();
    render(
      <LoginPage
        onSuccess={mockOnSuccess}
        onContinueAsGuest={mockOnContinueAsGuest}
      />,
    );

    const loginForm = screen.getByRole("form");
    const submitButton = within(loginForm).getByRole("button", {
      name: "Sign in",
    });
    expect(submitButton).toBeDisabled();

    await user.type(within(loginForm).getByLabelText("Username"), "user");
    expect(submitButton).toBeDisabled();

    await user.clear(within(loginForm).getByLabelText("Username"));
    await user.type(within(loginForm).getByLabelText("Password"), "pass");
    expect(submitButton).toBeDisabled();
  });
});
