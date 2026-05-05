import { randomUUID } from "node:crypto";

export type UploadKind = "image" | "file" | "audio";

export interface BuildUploadPathParams {
  userId: string;
  kind: UploadKind;
  extension?: string;
  now?: Date;
}

export function buildOnboardingUploadPath({ userId, kind, extension, now = new Date() }: BuildUploadPathParams): string {
  const dateKey = now.toISOString().slice(0, 10);
  const cleanExtension = extension?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const filename = cleanExtension ? `${randomUUID()}.${cleanExtension}` : randomUUID();
  return `onboarding/${userId}/${kind}/${dateKey}/${filename}`;
}
