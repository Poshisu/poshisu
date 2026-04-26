import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "./MessageBubble";

describe("MessageBubble", () => {
  it("renders the message content", () => {
    render(<MessageBubble message={{ id: "1", author: "agent", content: "Hello there" }} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
  });

  it("preserves explicit newlines via whitespace-pre-wrap", () => {
    render(<MessageBubble message={{ id: "1", author: "agent", content: "Line 1\nLine 2" }} />);
    const bubble = screen.getByText(/Line 1/);
    expect(bubble.textContent).toContain("\n");
    expect(bubble.className).toContain("whitespace-pre-wrap");
  });

  it("applies agent styling when author is agent", () => {
    const { container } = render(<MessageBubble message={{ id: "1", author: "agent", content: "x" }} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.dataset.author).toBe("agent");
    expect(wrapper.className).toContain("justify-start");
    expect(wrapper.firstChild).toHaveClass("bg-muted");
  });

  it("applies user styling when author is user", () => {
    const { container } = render(<MessageBubble message={{ id: "1", author: "user", content: "x" }} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.dataset.author).toBe("user");
    expect(wrapper.className).toContain("justify-end");
    expect(wrapper.firstChild).toHaveClass("bg-primary");
  });
});
