import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatThread } from "./ChatThread";
import type { Message } from "./types";

const messages: Message[] = [
  { id: "m1", author: "agent", content: "Hey! What should I call you?" },
  { id: "m2", author: "user", content: "Aarti" },
  { id: "m3", author: "agent", content: "How old are you?" },
];

describe("ChatThread", () => {
  it("exposes a polite live region role", () => {
    render(<ChatThread messages={messages} />);
    const log = screen.getByRole("log", { name: /conversation/i });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveAttribute("aria-atomic", "false");
  });

  it("renders one list item per message", () => {
    render(<ChatThread messages={messages} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(messages.length);
  });

  it("renders all message contents in order", () => {
    render(<ChatThread messages={messages} />);
    const text = screen.getByRole("list").textContent ?? "";
    const callIdx = text.indexOf("What should I call you");
    const aartiIdx = text.indexOf("Aarti");
    const howOldIdx = text.indexOf("How old are you");
    expect(callIdx).toBeGreaterThan(-1);
    expect(aartiIdx).toBeGreaterThan(callIdx);
    expect(howOldIdx).toBeGreaterThan(aartiIdx);
  });

  it("appends a typing indicator when isAgentTyping is true", () => {
    render(<ChatThread messages={messages} isAgentTyping />);
    expect(screen.getByRole("status", { name: /coach is typing/i })).toBeInTheDocument();
  });

  it("does NOT render the typing indicator by default", () => {
    render(<ChatThread messages={messages} />);
    expect(screen.queryByRole("status", { name: /coach is typing/i })).not.toBeInTheDocument();
  });
});
