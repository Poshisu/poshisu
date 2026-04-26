import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { TranscriptionError, transcribeAudio } from "@/lib/transcription/elevenlabs";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB — covers ~60s in any browser-encoded format
const RATE_LIMIT_BUCKET = "voice:hour";
const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_PER_WINDOW = 60;

// Use Node runtime (not Edge): the ElevenLabs SDK relies on Node Buffer / streams.
export const runtime = "nodejs";

/**
 * POST /api/transcribe
 *
 * Body: `multipart/form-data` with one field `audio` containing the recording.
 *
 * Pipeline:
 *   1. Auth-gate via Supabase server cookie (returns 401 if unauthenticated).
 *   2. Rate-limit per user via the `voice:hour` bucket
 *      (60 requests / 60 minutes — see migration 0005's
 *      `increment_rate_limit` RPC).
 *   3. Validate audio: present, non-empty, under 10 MB.
 *   4. Forward to ElevenLabs Scribe via `transcribeAudio`.
 *   5. Return `{ text, languageCode? }` on success.
 *
 * Errors map to user-safe messages via `TranscriptionError.userMessage` —
 * we never leak raw provider internals to the client.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Rate limit
  const limit = await checkRateLimit({
    userId: user.id,
    bucket: RATE_LIMIT_BUCKET,
    windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
    limit: RATE_LIMIT_PER_WINDOW,
  });
  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.floor((limit.resetAt.getTime() - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a minute and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  // 3. Body validation
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const audio = formData.get("audio");
  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio file in 'audio' field" }, { status: 400 });
  }
  if (audio.size === 0) {
    return NextResponse.json({ error: "Empty audio file" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio file too large (10 MB max)" }, { status: 413 });
  }

  // 4. Transcribe
  try {
    const result = await transcribeAudio(audio);
    return NextResponse.json({
      text: result.text,
      languageCode: result.languageCode,
    });
  } catch (err) {
    if (err instanceof TranscriptionError) {
      return NextResponse.json({ error: err.userMessage }, { status: err.statusCode });
    }
    console.error("[/api/transcribe] unexpected error", err);
    return NextResponse.json(
      { error: "Couldn't transcribe — please try again, or type instead." },
      { status: 500 },
    );
  }
}
