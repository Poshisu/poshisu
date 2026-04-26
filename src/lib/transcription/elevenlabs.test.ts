import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { convertMock } = vi.hoisted(() => ({ convertMock: vi.fn() }));
vi.mock("@elevenlabs/elevenlabs-js", () => {
  class MockElevenLabsClient {
    speechToText = { convert: convertMock };
    constructor(_opts?: unknown) {}
  }
  return { ElevenLabsClient: MockElevenLabsClient };
});

import {
  TranscriptionError,
  _resetTranscriptionClientForTests,
  transcribeAudio,
  type TranscriptionErrorCode,
} from "./elevenlabs";

const ORIGINAL_KEY = process.env.ELEVENLABS_API_KEY;

describe("transcribeAudio", () => {
  beforeEach(() => {
    convertMock.mockReset();
    _resetTranscriptionClientForTests();
    process.env.ELEVENLABS_API_KEY = "test-key-not-real";
  });

  afterEach(() => {
    if (ORIGINAL_KEY === undefined) delete process.env.ELEVENLABS_API_KEY;
    else process.env.ELEVENLABS_API_KEY = ORIGINAL_KEY;
    vi.restoreAllMocks();
  });

  it("returns the transcribed text from a successful call", async () => {
    convertMock.mockResolvedValueOnce({ text: "hello world", languageCode: "eng" });
    const audio = new Blob(["fake-audio"], { type: "audio/webm" });

    const result = await transcribeAudio(audio);

    expect(result.text).toBe("hello world");
    expect(result.languageCode).toBe("eng");
  });

  it("falls back to language_code when SDK returns snake_case", async () => {
    convertMock.mockResolvedValueOnce({ text: "hi", language_code: "hin" });
    const audio = new Blob(["x"]);

    const result = await transcribeAudio(audio);

    expect(result.languageCode).toBe("hin");
  });

  it("forwards the audio blob and default options to the SDK", async () => {
    convertMock.mockResolvedValueOnce({ text: "ok" });
    const audio = new Blob(["a"], { type: "audio/webm" });

    await transcribeAudio(audio);

    expect(convertMock).toHaveBeenCalledWith({
      file: audio,
      modelId: "scribe_v1",
      tagAudioEvents: false,
      diarize: false,
      languageCode: "auto",
    });
  });

  it("forwards a custom languageCode when provided", async () => {
    convertMock.mockResolvedValueOnce({ text: "ok" });
    const audio = new Blob(["a"]);

    await transcribeAudio(audio, { languageCode: "eng" });

    expect(convertMock.mock.calls[0][0].languageCode).toBe("eng");
  });

  it("throws not_configured when ELEVENLABS_API_KEY is missing", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    _resetTranscriptionClientForTests();

    await expect(transcribeAudio(new Blob(["a"]))).rejects.toMatchObject({
      name: "TranscriptionError",
      code: "not_configured",
      statusCode: 503,
    });
  });

  it("maps SDK 401/403 to auth_failed (503 to user)", async () => {
    convertMock.mockRejectedValueOnce(Object.assign(new Error("forbidden"), { statusCode: 403 }));

    await expect(transcribeAudio(new Blob(["a"]))).rejects.toMatchObject({
      code: "auth_failed",
      statusCode: 503,
    });
  });

  it("maps SDK 413 to too_large", async () => {
    convertMock.mockRejectedValueOnce(Object.assign(new Error("payload"), { statusCode: 413 }));

    await expect(transcribeAudio(new Blob(["a"]))).rejects.toMatchObject({
      code: "too_large",
      statusCode: 413,
    });
  });

  it("maps SDK 429 to rate_limited", async () => {
    convertMock.mockRejectedValueOnce(Object.assign(new Error("slow"), { statusCode: 429 }));

    await expect(transcribeAudio(new Blob(["a"]))).rejects.toMatchObject({
      code: "rate_limited",
      statusCode: 429,
    });
  });

  it("maps SDK 400/422 to invalid_audio", async () => {
    convertMock.mockRejectedValueOnce(Object.assign(new Error("bad audio"), { statusCode: 400 }));

    await expect(transcribeAudio(new Blob(["a"]))).rejects.toMatchObject({
      code: "invalid_audio",
      statusCode: 400,
    });
  });

  it("falls back to internal for unknown SDK errors", async () => {
    convertMock.mockRejectedValueOnce(new Error("network down"));

    await expect(transcribeAudio(new Blob(["a"]))).rejects.toMatchObject({
      code: "internal",
      statusCode: 502,
    });
  });

  it("throws internal when the SDK returns no text", async () => {
    convertMock.mockResolvedValueOnce({});

    await expect(transcribeAudio(new Blob(["a"]))).rejects.toMatchObject({
      code: "internal",
    });
  });

  it("TranscriptionError exposes safe userMessage strings per code", () => {
    const cases: Array<[TranscriptionErrorCode, RegExp]> = [
      ["not_configured", /unavailable/i],
      ["invalid_audio", /couldn't read/i],
      ["too_large", /too long/i],
      ["rate_limited", /too many/i],
      ["auth_failed", /unavailable/i],
      ["internal", /try again/i],
    ];
    for (const [code, expected] of cases) {
      const err = new TranscriptionError(code, "x");
      expect(err.userMessage).toMatch(expected);
    }
  });
});
