import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ChatInput } from "./ChatInput";

function ControlledInput({ onSubmit, leftSlot, ...rest }: { onSubmit?: () => void; leftSlot?: React.ReactNode } = {}) {
  const [value, setValue] = useState("");
  return (
    <ChatInput
      ariaLabel="Type your answer"
      value={value}
      onChange={setValue}
      onSubmit={onSubmit ?? (() => {})}
      leftSlot={leftSlot}
      {...rest}
    />
  );
}

describe("ChatInput", () => {
  it("renders a labelled textarea and a send button", () => {
    render(<ControlledInput />);
    expect(screen.getByLabelText("Type your answer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("disables the send button when the value is empty", () => {
    render(<ControlledInput />);
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("disables the send button when the value is only whitespace", () => {
    render(<ControlledInput />);
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "    " } });
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("enables send once the user types something", () => {
    render(<ControlledInput />);
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "Aarti" } });
    expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
  });

  it("calls onSubmit when the send button is clicked", () => {
    const onSubmit = vi.fn();
    render(<ControlledInput onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Type your answer"), { target: { value: "Aarti" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("submits on Enter without Shift", () => {
    const onSubmit = vi.fn();
    render(<ControlledInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText("Type your answer");
    fireEvent.change(textarea, { target: { value: "Aarti" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does NOT submit on Shift+Enter (newline)", () => {
    const onSubmit = vi.fn();
    render(<ControlledInput onSubmit={onSubmit} />);
    const textarea = screen.getByLabelText("Type your answer");
    fireEvent.change(textarea, { target: { value: "Aarti" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit on Enter when the value is empty", () => {
    const onSubmit = vi.fn();
    render(<ControlledInput onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByLabelText("Type your answer"), { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders a leftSlot when provided", () => {
    render(<ControlledInput leftSlot={<button type="button">Mic</button>} />);
    expect(screen.getByRole("button", { name: "Mic" })).toBeInTheDocument();
  });
});
