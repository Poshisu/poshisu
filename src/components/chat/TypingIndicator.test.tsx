import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TypingIndicator } from "./TypingIndicator";

describe("TypingIndicator", () => {
  it("exposes a status role with an aria-label", () => {
    render(<TypingIndicator />);
    expect(screen.getByRole("status", { name: /coach is typing/i })).toBeInTheDocument();
  });

  it("renders three decorative dots hidden from screen readers", () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('[aria-hidden="true"]');
    expect(dots.length).toBe(3);
  });
});
