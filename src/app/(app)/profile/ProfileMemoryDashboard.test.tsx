import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileMemoryDashboard } from "./ProfileMemoryDashboard";
import type { ProfileMemoryInspectorViewModel } from "@/lib/memory/inspector";

const viewModel: ProfileMemoryInspectorViewModel = {
  user: { id: "user-1", email: "aarti@example.com", firstName: "Aarti" },
  memories: [
    {
      id: "mem-profile",
      layer: "profile",
      key: "main",
      title: "Profile",
      description: "Stable profile and goals",
      content: "# Profile\n- Goal: maintain\n- Dietary pattern: vegetarian",
      version: 3,
      editable: true,
      expiresAt: null,
      createdAt: "2026-05-10T08:00:00.000Z",
      updatedAt: "2026-05-14T08:00:00.000Z",
    },
    {
      id: "mem-patterns",
      layer: "patterns",
      key: "main",
      title: "Patterns",
      description: "Eating and behavior patterns",
      content: "- Usually logs dinner late",
      version: 1,
      editable: true,
      expiresAt: null,
      createdAt: "2026-05-12T08:00:00.000Z",
      updatedAt: "2026-05-12T08:00:00.000Z",
    },
    {
      id: "mem-context",
      layer: "context",
      key: "2026-05-14",
      title: "Context",
      description: "Short-lived context",
      content: "Dinner was high sodium.",
      version: 1,
      editable: false,
      expiresAt: "2026-05-15T00:00:00.000Z",
      createdAt: "2026-05-14T08:00:00.000Z",
      updatedAt: "2026-05-14T08:00:00.000Z",
    },
  ],
  auditHistory: [
    {
      id: "hist-1",
      memoryId: "mem-profile",
      layer: "profile",
      key: "main",
      version: 2,
      changedAt: "2026-05-14T07:30:00.000Z",
      changedBy: "onboarding",
    },
  ],
};

describe("ProfileMemoryDashboard", () => {
  it("renders memory layers with safe edit affordances and audit context", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    render(<ProfileMemoryDashboard data={viewModel} />);

    expect(screen.getByRole("heading", { name: "Memory inspector" })).toBeInTheDocument();
    expect(screen.getByText("Signed in as aarti@example.com")).toBeInTheDocument();
    expect(screen.getByText("3 memory layers")).toBeInTheDocument();
    expect(screen.getByText("1 audit snapshot")).toBeInTheDocument();

    const profile = screen.getByRole("article", { name: /profile memory/i });
    expect(within(profile).getByText("Version 3")).toBeInTheDocument();
    const profileEditor = within(profile).getByRole("textbox", { name: "Edit Profile memory" });
    expect(profileEditor).toHaveValue("# Profile\n- Goal: maintain\n- Dietary pattern: vegetarian");
    fireEvent.change(profileEditor, { target: { value: "# Profile\n- Goal: maintain\n- Dietary pattern: mostly vegetarian" } });
    fireEvent.click(within(profile).getByRole("button", { name: "Save Profile" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/memory", expect.objectContaining({ method: "PUT" })));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      layer: "profile",
      key: "main",
      content: "# Profile\n- Goal: maintain\n- Dietary pattern: mostly vegetarian",
    });
    expect(await within(profile).findByText(/Memory saved/)).toBeInTheDocument();

    const context = screen.getByRole("article", { name: /context memory/i });
    expect(within(context).getByText("Read-only")).toBeInTheDocument();
    expect(within(context).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(context).getByText(/Expires/)).toBeInTheDocument();

    const audit = screen.getByRole("list", { name: "Memory audit history" });
    expect(within(audit).getByText(/profile\/main/)).toBeInTheDocument();
    expect(within(audit).getByText(/version 2/)).toBeInTheDocument();
    expect(within(audit).getByText(/onboarding/)).toBeInTheDocument();

    fetchMock.mockRestore();
  });

  it("renders an empty state when no memory has been created", () => {
    render(<ProfileMemoryDashboard data={{ user: viewModel.user, memories: [], auditHistory: [] }} />);

    expect(screen.getByText("No memory saved yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Chat" })).toHaveAttribute("href", "/chat");
  });

  it("renders privacy export and guarded account deletion controls", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    render(<ProfileMemoryDashboard data={viewModel} />);

    expect(screen.getByRole("heading", { name: "Privacy & data controls" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Download my data export/i })).toHaveAttribute("href", "/api/privacy/export");

    const deleteButton = screen.getByRole("button", { name: "Permanently delete my account" });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Type DELETE to confirm account deletion"), { target: { value: "DELETE" } });
    expect(deleteButton).toBeEnabled();
    fireEvent.click(deleteButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/privacy/delete-account", expect.objectContaining({ method: "POST" })));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ confirmation: "DELETE" });
    expect(await screen.findByText("Account deletion started. You will be signed out once it completes.")).toBeInTheDocument();

    fetchMock.mockRestore();
  });

  it("surfaces account deletion failure without exposing backend details", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: false, error: { code: "ACCOUNT_DELETE_FAILED", message: "Could not delete your account. Please try again." } }), { status: 500 }));

    render(<ProfileMemoryDashboard data={viewModel} />);

    fireEvent.change(screen.getByLabelText("Type DELETE to confirm account deletion"), { target: { value: "DELETE" } });
    fireEvent.click(screen.getByRole("button", { name: "Permanently delete my account" }));

    expect(await screen.findByText("Could not delete your account. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/service role|raw/i)).not.toBeInTheDocument();

    fetchMock.mockRestore();
  });
});
