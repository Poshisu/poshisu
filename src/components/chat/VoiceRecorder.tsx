"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEFAULT_MAX_SECONDS = 60;
const POLL_INTERVAL_MS = 250;

type RecordingState = "idle" | "recording" | "transcribing";

export interface VoiceRecorderProps {
  /** Called with the transcribed text on a successful round-trip. */
  onTranscript: (text: string) => void;
  /** Called with a user-safe message on any failure (permission, network, transcription). */
  onError?: (message: string) => void;
  /** Disable the button (e.g. while the parent is processing). */
  disabled?: boolean;
  /** Maximum recording length in seconds. Default 60. */
  maxDurationSeconds?: number;
}

/**
 * Push-to-record mic button. One tap starts recording, second tap (or the
 * max-duration timeout) stops and sends the audio to /api/transcribe.
 *
 * State machine:
 *   idle         — mic icon, tap to start
 *   recording    — stop icon, "0:08 / 1:00" timer, pulsing red ring
 *   transcribing — spinner (button disabled)
 *
 * Browser support:
 *   - MediaRecorder absent (older browsers): renders a disabled button
 *     with a sr-only "Voice unavailable" note. Caller can detect this
 *     visually-and-via-aria but doesn't have to handle it.
 *   - Mic permission denied: surfaces via onError + falls back to idle
 *     so the user can immediately type instead.
 *
 * Output:
 *   - Calls `onTranscript(text)` once per successful recording.
 *   - Calls `onError(msg)` on any failure with a message safe for display.
 *
 * Accessibility:
 *   - aria-label flips between "Record voice answer" and "Stop recording"
 *     depending on state.
 *   - aria-pressed mirrors the recording state so screen readers know
 *     the button is "on" while a recording is in progress.
 *   - Timer is announced via role="status" so SR users hear "0:30 of 1:00".
 *   - 44x44 px tap target.
 */
export function VoiceRecorder({
  onTranscript,
  onError,
  disabled = false,
  maxDurationSeconds = DEFAULT_MAX_SECONDS,
}: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supported = typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined";

  const cleanupStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  }, []);

  // Tear everything down if the component unmounts mid-recording.
  useEffect(() => {
    return () => cleanupStream();
  }, [cleanupStream]);

  const transcribe = useCallback(
    async (blob: Blob) => {
      setState("transcribing");
      try {
        const formData = new FormData();
        formData.append("audio", blob, "recording.webm");
        const response = await fetch("/api/transcribe", { method: "POST", body: formData });
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          const message =
            body.error || "Couldn't transcribe — please try again, or type instead.";
          onError?.(message);
          return;
        }
        const data = (await response.json()) as { text: string };
        if (data.text) onTranscript(data.text);
      } catch {
        onError?.("Network problem while transcribing. Please type instead.");
      } finally {
        setState("idle");
        setElapsedSeconds(0);
      }
    },
    [onError, onTranscript],
  );

  const startRecording = useCallback(async () => {
    if (!supported) {
      onError?.("Voice input isn't supported in this browser. Please type instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        cleanupStream();
        if (blob.size === 0) {
          setState("idle");
          setElapsedSeconds(0);
          onError?.("No audio captured. Try recording again.");
          return;
        }
        void transcribe(blob);
      };

      recorder.start();
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsedSeconds(seconds);
        if (seconds >= maxDurationSeconds && recorderRef.current?.state === "recording") {
          recorderRef.current.stop();
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      cleanupStream();
      setState("idle");
      // The most common cause is mic permission denied. We don't try to
      // distinguish — any failure here means voice is unavailable for
      // this attempt.
      const message =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone permission denied. You can grant access in your browser settings, or type instead."
          : "Couldn't access the microphone. Please type instead.";
      onError?.(message);
    }
  }, [cleanupStream, maxDurationSeconds, onError, supported, transcribe]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  }, []);

  const handleClick = () => {
    if (state === "idle") void startRecording();
    else if (state === "recording") stopRecording();
  };

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const isRecording = state === "recording";
  const isTranscribing = state === "transcribing";
  const buttonDisabled = disabled || isTranscribing || !supported;

  const ariaLabel =
    !supported
      ? "Voice input unavailable in this browser"
      : isRecording
        ? "Stop recording"
        : isTranscribing
          ? "Transcribing your recording"
          : "Record voice answer";

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant={isRecording ? "destructive" : "outline"}
        onClick={handleClick}
        disabled={buttonDisabled}
        aria-label={ariaLabel}
        aria-pressed={isRecording}
        className={cn(
          "size-11 shrink-0 rounded-full",
          isRecording && "ring-2 ring-destructive ring-offset-2 ring-offset-background",
        )}
      >
        {isTranscribing ? (
          <Loader2 aria-hidden="true" className="size-5 animate-spin" />
        ) : isRecording ? (
          <Square aria-hidden="true" className="size-4 fill-current" />
        ) : (
          <Mic aria-hidden="true" className="size-5" />
        )}
      </Button>

      {isRecording ? (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="text-xs font-mono tabular-nums text-muted-foreground"
        >
          {formatTime(elapsedSeconds)} / {formatTime(maxDurationSeconds)}
        </span>
      ) : null}

      {!supported ? (
        <span className="sr-only">Voice input is not available in this browser.</span>
      ) : null}
    </div>
  );
}
