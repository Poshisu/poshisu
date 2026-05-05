import type { MultimodalMessageEvent } from "@/lib/onboarding/message-events";

export interface AudioTranscriptionResult {
  transcript: string;
  sourceAttachmentIds: string[];
  placeholder: true;
}

export async function transcribeOnboardingAudio(event: MultimodalMessageEvent): Promise<AudioTranscriptionResult | null> {
  if (event.audio.length === 0) return null;

  const sourceAttachmentIds = event.audio.map((clip) => clip.attachmentId);
  return {
    transcript: "",
    sourceAttachmentIds,
    placeholder: true,
  };
}
