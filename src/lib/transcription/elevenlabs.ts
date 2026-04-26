import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

let _client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!_client) {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new TranscriptionError("not_configured", "ELEVENLABS_API_KEY is not set", 503);
    }
    _client = new ElevenLabsClient({ apiKey });
  }
  return _client;
}

export function _resetTranscriptionClientForTests(): void {
  _client = null;
}

export type TranscriptionErrorCode =
  | "not_configured"
  | "invalid_audio"
  | "too_large"
  | "rate_limited"
  | "auth_failed"
  | "internal";

export class TranscriptionError extends Error {
  constructor(
    public readonly code: TranscriptionErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }

  /** A safe message we're willing to send back to the browser. */
  get userMessage(): string {
    switch (this.code) {
      case "not_configured":
        return "Voice transcription is unavailable right now. Please type instead.";
      case "invalid_audio":
        return "We couldn't read that audio. Try recording again.";
      case "too_large":
        return "That recording is too long. Try a shorter clip.";
      case "rate_limited":
        return "Too many transcriptions in a short time. Please wait a minute.";
      case "auth_failed":
        return "Voice transcription is unavailable right now. Please type instead.";
      case "internal":
        return "Couldn't transcribe — please try again, or type instead.";
    }
  }
}

export interface TranscribeOptions {
  /** ISO language code or "auto" for autodetect. Default "auto". */
  languageCode?: string;
}

export interface TranscribeResult {
  text: string;
  languageCode?: string;
}

/**
 * Transcribe an audio blob using ElevenLabs Scribe.
 *
 * Single source of truth for ElevenLabs calls — every transcribe path
 * (currently `/api/transcribe`, possibly future webhook ingestion) goes
 * through this. Wraps SDK errors in typed `TranscriptionError` so route
 * handlers can map to user-friendly responses without leaking internals.
 *
 * Note: keyterm prompting (biasing the model toward Indian food vocab
 * like "thali", "sambar", "chhole") is **not** wired here in Phase 1 —
 * Scribe v1 doesn't yet expose a stable keyword API. Tracked in
 * docs/BACKLOG.md under transcription. Auto-language-detect is good
 * enough for our beta.
 */
export async function transcribeAudio(
  audio: Blob,
  opts: TranscribeOptions = {},
): Promise<TranscribeResult> {
  const client = getClient();
  try {
    const result = await client.speechToText.convert({
      file: audio,
      modelId: "scribe_v1",
      tagAudioEvents: false,
      diarize: false,
      languageCode: opts.languageCode ?? "auto",
    });
    return {
      text: extractText(result),
      languageCode: extractLanguageCode(result),
    };
  } catch (err) {
    throw mapSdkError(err);
  }
}

function extractText(result: unknown): string {
  if (result && typeof result === "object" && "text" in result) {
    const text = (result as { text: unknown }).text;
    if (typeof text === "string") return text;
  }
  throw new TranscriptionError("internal", "ElevenLabs returned no transcript text", 502);
}

function extractLanguageCode(result: unknown): string | undefined {
  if (result && typeof result === "object" && "languageCode" in result) {
    const code = (result as { languageCode: unknown }).languageCode;
    if (typeof code === "string") return code;
  }
  if (result && typeof result === "object" && "language_code" in result) {
    const code = (result as { language_code: unknown }).language_code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function mapSdkError(err: unknown): TranscriptionError {
  if (err instanceof TranscriptionError) return err;

  const status =
    err && typeof err === "object" && "statusCode" in err
      ? Number((err as { statusCode: unknown }).statusCode)
      : err && typeof err === "object" && "status" in err
        ? Number((err as { status: unknown }).status)
        : undefined;
  const message = err instanceof Error ? err.message : String(err);

  if (status === 401 || status === 403) {
    return new TranscriptionError("auth_failed", message, 503, err);
  }
  if (status === 413) {
    return new TranscriptionError("too_large", message, 413, err);
  }
  if (status === 429) {
    return new TranscriptionError("rate_limited", message, 429, err);
  }
  if (status === 400 || status === 422) {
    return new TranscriptionError("invalid_audio", message, 400, err);
  }
  return new TranscriptionError("internal", message, 502, err);
}
