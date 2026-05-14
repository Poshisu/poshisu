import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/push", () => {
  const originalEnv = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalEnv;
  });

  it("returns the public VAPID key when push is configured", async () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public_key_1234567890abcdef";
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/push", {
      headers: { "x-request-id": "req-vapid" },
    }));

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.requestId).toBe("req-vapid");
    expect(json.data.publicKey).toBe("public_key_1234567890abcdef");
  });

  it("fails closed when the public VAPID key is missing", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const { GET } = await import("./route");

    const response = await GET(new Request("http://localhost/api/push"));

    expect(response.status).toBe(503);
    const json = await response.json();
    expect(json.error.code).toBe("PUSH_NOT_CONFIGURED");
  });
});
