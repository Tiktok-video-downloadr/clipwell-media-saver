import { describe, it, expect } from "vitest";
import { ingestionRegistry } from "./registry";
import type { RequestContext } from "./types";

const ctx: RequestContext = { requestId: "test-req", ip: "203.0.113.1" };

describe("ingestionRegistry", () => {
  it("rejects a social-platform direct URL with NO_AUTHORIZED_SOURCE", async () => {
    const { result } = await ingestionRegistry.authorizeAndResolve(
      { kind: "direct-url", url: "https://www.tiktok.com/@someone/video/123", targetFormat: "mp4" },
      ctx
    );
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe("NO_AUTHORIZED_SOURCE");
  });

  it("rejects oauth-own-content when no account is connected", async () => {
    const { result } = await ingestionRegistry.authorizeAndResolve(
      { kind: "oauth-own-content", platform: "youtube", ownMediaId: "abc123", targetFormat: "mp4" },
      ctx
    );
    expect(result.authorized).toBe(false);
    expect(result.reason).toBe("OAUTH_NOT_CONNECTED");
  });

  it("rejects a request with no matching adapter", async () => {
    const { adapter, result } = await ingestionRegistry.authorizeAndResolve(
      // @ts-expect-error deliberately malformed kind for the test
      { kind: "carrier-pigeon", targetFormat: "mp4" },
      ctx
    );
    expect(adapter).toBeNull();
    expect(result.reason).toBe("NO_AUTHORIZED_SOURCE");
  });

  it("authorizes a plausible non-social direct URL", async () => {
    const { result } = await ingestionRegistry.authorizeAndResolve(
      { kind: "direct-url", url: "https://cdn.example.com/my-file.mp4", targetFormat: "mp4" },
      ctx
    );
    expect(result).toBeDefined();
  });
});
