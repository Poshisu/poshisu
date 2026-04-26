import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnswerChips } from "./AnswerChips";

describe("AnswerChips", () => {
  it("renders nothing when chips list is empty", () => {
    const { container } = render(<AnswerChips chips={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one button per chip in order", () => {
    render(<AnswerChips chips={["Female", "Male", "Non-binary"]} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Female", "Male", "Non-binary"]);
  });

  it("calls onSelect with the chip label when clicked", () => {
    const onSelect = vi.fn();
    render(<AnswerChips chips={["Female", "Male"]} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Male" }));
    expect(onSelect).toHaveBeenCalledWith("Male");
  });

  it("groups chips under an aria-label", () => {
    render(<AnswerChips chips={["A", "B"]} onSelect={vi.fn()} />);
    expect(screen.getByRole("group", { name: /suggested answers/i })).toBeInTheDocument();
  });

  it("uses the custom aria-label when provided", () => {
    render(<AnswerChips chips={["A"]} onSelect={vi.fn()} ariaLabel="Quick replies" />);
    expect(screen.getByRole("group", { name: "Quick replies" })).toBeInTheDocument();
  });

  it("highlights the default chip with a primary border", () => {
    render(<AnswerChips chips={["Conservative", "Midpoint", "Liberal"]} onSelect={vi.fn()} defaultChip="Midpoint" />);
    const midpoint = screen.getByRole("button", { name: "Midpoint" });
    const conservative = screen.getByRole("button", { name: "Conservative" });
    expect(midpoint.className).toContain("border-primary");
    expect(conservative.className).not.toContain("border-primary");
  });

  it("disables all chips when disabled prop is true", () => {
    render(<AnswerChips chips={["A", "B"]} onSelect={vi.fn()} disabled />);
    screen.getAllByRole("button").forEach((b) => {
      expect(b).toBeDisabled();
    });
  });

  it("does not call onSelect when a chip is clicked while disabled", () => {
    const onSelect = vi.fn();
    render(<AnswerChips chips={["A"]} onSelect={onSelect} disabled />);
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
