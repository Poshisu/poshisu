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
 * MIME types the route accepts. These cover every format MediaRecorder
 * produces in the major browsers (WebM/Opus on Chromium, MP4/AAC on
 * Safari, OGG/Opus on Firefox) plus the common upload formats.
 */
const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "audio/webm",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
  "audio/opus",
  "audio/mpeg",
  "audio/mp3",
]);

/**
 * Magic-byte signatures for audio formats. The MIME type on a Blob is
 * client-controllable; magic bytes are not. We accept the upload only if
 * EITHER the declared type matches our allow-list OR the first bytes of
 * the file match a known audio container.
 *
 * Sources cross-checked against:
 *   - https://en.wikipedia.org/wiki/List_of_file_signatures
 *   - https://datatracker.ietf.org/doc/html/rfc8216 (MP4 / ftyp box)
 */
function looksLikeAudio(header: Uint8Array): boolean {
  if (header.length < 4) return false;

  // RIFF (WAV) — "RIFF" at 0-3, "WAVE" at 8-11
  if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    return true;
  }
  // EBML (WebM / MKV) — \x1A\x45\xDF\xA3
  if (header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) {
    return true;
  }
  // OGG — "OggS"
  if (header[0] === 0x4f && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
    return true;
  }
  // ID3 (MP3 with tag) — "ID3"
  if (header[0] === 0x49 && header[1] === 0x44 && header[2] === 0x33) {
    return true;
  }
  // MP3 frame sync — 0xFF followed by 0xFB / 0xF3 / 0xF2 / 0xFA
  if (
    header[0] === 0xff &&
    (header[1] === 0xfb || header[1] === 0xf3 || header[1] === 0xf2 || header[1] === 0xfa)
  ) {
    return true;
  }
  // ADTS AAC — 0xFF followed by 0xF1 / 0xF9
  if (header[0] === 0xff && (header[1] === 0xf1 || header[1] === 0xf9)) {
    return true;
  }
  // MP4 / M4A — bytes 4-7 are "ftyp"
  if (
    header.length >= 8 &&
    header[4] === 0x66 &&
    header[5] === 0x74 &&
    header[6] === 0x79 &&
    header[7] === 0x70
  ) {
    return true;
  }
  return false;
}

/**
 * Validate that a Blob is plausibly an audio file before forwarding to
 * ElevenLabs. Accepts if the declared MIME type is in our allow-list OR
 * the first 12 bytes match a known audio container signature.
 *
 * Throws `TranscriptionError("invalid_audio")` on rejection.
 */
async function assertAudioBlob(audio: Blob): Promise<void> {
  if (audio.type && ALLOWED_MIME_TYPES.has(audio.type)) return;

  const header = new Uint8Array(await audio.slice(0, 12).arrayBuffer());
  if (looksLikeAudio(header)) return;

  throw new TranscriptionError(
    "invalid_audio",
    `Unrecognised audio format (declared type "${audio.type || "none"}", magic bytes did not match)`,
    400,
  );
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
  await assertAudioBlob(audio);

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
