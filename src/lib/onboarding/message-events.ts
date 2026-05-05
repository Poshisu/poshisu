import { z } from "zod";

const MAX_TEXT_LENGTH = 4_000;

const uploadMetadataSchema = z
  .object({
    originalName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(3).max(120),
    sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024),
    sha256: z.string().trim().regex(/^[a-f0-9]{64}$/i, "sha256 must be a 64-char hex digest").optional(),
  })
  .strict();

const baseAttachmentSchema = z
  .object({
    attachmentId: z.string().uuid(),
    storagePath: z.string().trim().min(3).max(512),
    publicUrl: z.string().url().optional(),
    metadata: uploadMetadataSchema,
  })
  .strict();

export const imageAttachmentSchema = baseAttachmentSchema.extend({ type: z.literal("image") }).strict();
export const fileAttachmentSchema = baseAttachmentSchema.extend({ type: z.literal("file") }).strict();
export const audioAttachmentSchema = baseAttachmentSchema.extend({ type: z.literal("audio") }).strict();

export const multimodalMessageEventSchema = z
  .object({
    text: z.string().trim().max(MAX_TEXT_LENGTH).optional(),
    images: z.array(imageAttachmentSchema).default([]),
    files: z.array(fileAttachmentSchema).default([]),
    audio: z.array(audioAttachmentSchema).default([]),
  })
  .superRefine((value, ctx) => {
    const hasText = Boolean(value.text && value.text.length > 0);
    const hasAttachment = value.images.length > 0 || value.files.length > 0 || value.audio.length > 0;
    if (!hasText && !hasAttachment) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["text"],
        message: "Message event must contain text or at least one attachment.",
      });
    }
  })
  .strict();

export type MultimodalMessageEvent = z.infer<typeof multimodalMessageEventSchema>;

export function parseMultimodalMessageEvent(input: unknown): MultimodalMessageEvent {
  return multimodalMessageEventSchema.parse(input);
}
