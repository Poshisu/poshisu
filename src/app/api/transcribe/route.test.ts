import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, checkRateLimitMock, transcribeMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  transcribeMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));
vi.mock("@/lib/transcription/elevenlabs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/transcription/elevenlabs")>(
    "@/lib/transcription/elevenlabs",
  );
  return {
    ...actual,
    transcribeAudio: transcribeMock,
  };
});

import { TranscriptionError } from "@/lib/transcription/elevenlabs";
import { POST } from "./route";

/**
 * Mock a NextRequest by giving it a `formData()` that returns the passed
 * FormData directly. Avoids the Node fetch + multipart round-trip, which
 * isn't reliable in the jsdom / undici test environment for our purposes.
 */
function makeRequest(fd: FormData): Request {
  return {
    formData: async () => fd,
  } as unknown as Request;
}

function audioFormData(audio: Blob): FormData {
  const fd = new FormData();
  fd.append("audio", audio, "recording.webm");
  return fd;
}

function brokenRequest(): Request {
  return {
    formData: async () => {
      throw new Error("invalid body");
    },
  } as unknown as Request;
}

const ALLOWED_LIMIT = {
  allowed: true,
  currentCount: 1,
  resetAt: new Date(Date.now() + 60 * 60_000),
};

describe("POST /api/transcribe", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    checkRateLimitMock.mockReset();
    transcribeMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "u-1" } }, error: null });
    checkRateLimitMock.mockResolvedValue(ALLOWED_LIMIT);
    transcribeMock.mockResolvedValue({ text: "hello", languageCode: "eng" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when the user is not authenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });

    const audio = new Blob(["x"], { type: "audio/webm" });
    const res = await POST(makeRequest(audioFormData(audio)) as never);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when rate-limited", async () => {
    checkRateLimitMock.mockResolvedValueOnce({
      allowed: false,
      currentCount: 61,
      resetAt: new Date(Date.now() + 30 * 60_000),
    });

    const audio = new Blob(["x"], { type: "audio/webm" });
    const res = await POST(makeRequest(audioFormData(audio)) as never);

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it("returns 400 when no audio field is present", async () => {
    const fd = new FormData();
    const res = await POST(makeRequest(fd) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/missing audio/i);
  });

  it("returns 400 when formData parsing throws", async () => {
    const res = await POST(brokenRequest() as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/invalid request body/i);
  });

  it("returns 400 when audio is empty", async () => {
    const res = await POST(makeRequest(audioFormData(new Blob([]))) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/empty/i);
  });

  it("returns 413 when audio exceeds 10MB", async () => {
    const big = new Blob([new Uint8Array(11 * 1024 * 1024)], { type: "audio/webm" });
    const res = await POST(makeRequest(audioFormData(big)) as never);

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error).toMatch(/too large/i);
  });

  it("returns 200 with transcript text on success", async () => {
    const audio = new Blob([new Uint8Array(1024)], { type: "audio/webm" });
    const res = await POST(makeRequest(audioFormData(audio)) as never);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe("hello");
    expect(body.languageCode).toBe("eng");
  });

  it("maps TranscriptionError to its user-facing message + status", async () => {
    transcribeMock.mockRejectedValueOnce(
      new TranscriptionError("rate_limited", "upstream rate-limit", 429),
    );

    const audio = new Blob(["x"], { type: "audio/webm" });
    const res = await POST(makeRequest(audioFormData(audio)) as never);

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toMatch(/too many/i);
  });

  it("returns 500 with a safe message on unexpected errors", async () => {
    transcribeMock.mockRejectedValueOnce(new Error("network blew up"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const audio = new Blob(["x"], { type: "audio/webm" });
    const res = await POST(makeRequest(audioFormData(audio)) as never);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/try again/i);
    // The raw error message must NOT appear in the response.
    expect(body.error).not.toContain("network blew up");
    expect(consoleSpy).toHaveBeenCalled();
  });

  it("calls the rate limiter with the correct bucket", async () => {
    const audio = new Blob(["x"], { type: "audio/webm" });
    await POST(makeRequest(audioFormData(audio)) as never);

    expect(checkRateLimitMock).toHaveBeenCalledWith({
      userId: "u-1",
      bucket: "voice:hour",
      windowMinutes: 60,
      limit: 60,
    });
  });
});
