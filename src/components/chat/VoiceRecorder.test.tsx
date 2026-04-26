import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceRecorder } from "./VoiceRecorder";

/**
 * Minimal MediaRecorder mock. We can't faithfully simulate real audio
 * capture in jsdom, but we can verify our state machine and the
 * /api/transcribe round-trip by:
 *   - calling `triggerStop()` to drive the `onstop` handler
 *   - feeding fake chunks via `triggerData()` first
 *
 * The component looks at `window.MediaRecorder` on render; we install
 * the mock on the global before each test and uninstall after.
 */
class FakeMediaRecorder {
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType = "audio/webm";

  constructor(public stream: MediaStream) {}

  start() {
    this.state = "recording";
    FakeMediaRecorder._instances.push(this);
  }

  stop() {
    this.state = "inactive";
    this.onstop?.();
  }

  triggerData(data: Blob) {
    this.ondataavailable?.({ data });
  }

  static _instances: FakeMediaRecorder[] = [];
  static lastInstance(): FakeMediaRecorder | undefined {
    return FakeMediaRecorder._instances[FakeMediaRecorder._instances.length - 1];
  }
  static reset() {
    FakeMediaRecorder._instances = [];
  }
}

const ORIGINAL_MEDIA_RECORDER = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
const ORIGINAL_NAVIGATOR = globalThis.navigator;

function installFakeMediaRecorder() {
  (globalThis as unknown as { MediaRecorder: typeof FakeMediaRecorder }).MediaRecorder =
    FakeMediaRecorder;
}

function uninstallFakeMediaRecorder() {
  if (ORIGINAL_MEDIA_RECORDER === undefined) {
    delete (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
  } else {
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = ORIGINAL_MEDIA_RECORDER;
  }
}

function stubGetUserMedia(impl: () => Promise<MediaStream>) {
  Object.defineProperty(globalThis, "navigator", {
    value: {
      ...ORIGINAL_NAVIGATOR,
      mediaDevices: { getUserMedia: impl },
    },
    configurable: true,
  });
}

function fakeStream(): MediaStream {
  return { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
}

const fetchMock = vi.fn();

describe("VoiceRecorder", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    FakeMediaRecorder.reset();
    installFakeMediaRecorder();
    stubGetUserMedia(async () => fakeStream());
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    uninstallFakeMediaRecorder();
    Object.defineProperty(globalThis, "navigator", {
      value: ORIGINAL_NAVIGATOR,
      configurable: true,
    });
    vi.unstubAllGlobals();
  });

  it("renders an idle mic button labelled 'Record voice answer'", () => {
    render(<VoiceRecorder onTranscript={vi.fn()} />);
    const button = screen.getByRole("button", { name: /record voice answer/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("disables the button and announces unavailability when MediaRecorder is missing", () => {
    uninstallFakeMediaRecorder();
    render(<VoiceRecorder onTranscript={vi.fn()} />);
    const button = screen.getByRole("button", { name: /unavailable/i });
    expect(button).toBeDisabled();
  });

  it("transitions to recording state on click and shows the timer", async () => {
    render(<VoiceRecorder onTranscript={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /record voice answer/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /stop recording/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toHaveTextContent(/0:00 \/ 1:00/);
  });

  it("calls onError with a permission-denied message when getUserMedia rejects", async () => {
    stubGetUserMedia(() => Promise.reject(Object.assign(new Error("denied"), { name: "NotAllowedError" })));
    const onError = vi.fn();
    render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByRole("button", { name: /record voice answer/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/permission/i));
    });
    // Still in idle state — user can immediately fall back to typing.
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onError with a generic message on other getUserMedia failures", async () => {
    stubGetUserMedia(() => Promise.reject(new Error("hardware not found")));
    const onError = vi.fn();
    render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByRole("button", { name: /record voice answer/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/microphone/i));
    });
  });

  it("posts the recorded audio to /api/transcribe and forwards the transcript", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: "hello world" }),
    });

    const onTranscript = vi.fn();
    render(<VoiceRecorder onTranscript={onTranscript} />);

    // Start recording
    fireEvent.click(screen.getByRole("button", { name: /record voice answer/i }));
    await waitFor(() => {
      expect(FakeMediaRecorder.lastInstance()).toBeDefined();
    });

    const recorder = FakeMediaRecorder.lastInstance()!;
    recorder.triggerData(new Blob(["chunk"], { type: "audio/webm" }));

    // Stop
    fireEvent.click(screen.getByRole("button", { name: /stop recording/i }));

    await waitFor(() => {
      expect(onTranscript).toHaveBeenCalledWith("hello world");
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/transcribe",
      expect.objectContaining({ method: "POST" }),
    );
    const fetchInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect(fetchInit.body).toBeInstanceOf(FormData);
  });

  it("calls onError with the server message when /api/transcribe responds non-OK", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many attempts. Please wait." }),
    });

    const onError = vi.fn();
    render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByRole("button", { name: /record voice answer/i }));
    await waitFor(() => expect(FakeMediaRecorder.lastInstance()).toBeDefined());
    FakeMediaRecorder.lastInstance()!.triggerData(new Blob(["x"]));
    fireEvent.click(screen.getByRole("button", { name: /stop recording/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("Too many attempts. Please wait.");
    });
  });

  it("calls onError on network failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("connection reset"));

    const onError = vi.fn();
    render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByRole("button", { name: /record voice answer/i }));
    await waitFor(() => expect(FakeMediaRecorder.lastInstance()).toBeDefined());
    FakeMediaRecorder.lastInstance()!.triggerData(new Blob(["x"]));
    fireEvent.click(screen.getByRole("button", { name: /stop recording/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/network/i));
    });
  });

  it("calls onError when the recording produced no audio", async () => {
    const onError = vi.fn();
    render(<VoiceRecorder onTranscript={vi.fn()} onError={onError} />);

    fireEvent.click(screen.getByRole("button", { name: /record voice answer/i }));
    await waitFor(() => expect(FakeMediaRecorder.lastInstance()).toBeDefined());
    // Don't trigger any data — empty recording.
    fireEvent.click(screen.getByRole("button", { name: /stop recording/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringMatching(/no audio/i));
    });
  });

  it("respects the disabled prop", () => {
    render(<VoiceRecorder onTranscript={vi.fn()} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
