import { describe, it, expect } from "vitest";
import { assertSafeToFetch, SsrfBlockedError } from "./ssrf";

describe("assertSafeToFetch", () => {
  it("blocks loopback IP literals", async () => {
    await expect(assertSafeToFetch("http://127.0.0.1/secret")).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("blocks private RFC1918 ranges", async () => {
    await expect(assertSafeToFetch("http://10.0.0.5/")).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertSafeToFetch("http://192.168.1.1/")).rejects.toBeInstanceOf(SsrfBlockedError);
    await expect(assertSafeToFetch("http://172.16.0.1/")).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("blocks link-local addresses", async () => {
    await expect(assertSafeToFetch("http://169.254.169.254/latest/meta-data")).rejects.toBeInstanceOf(
      SsrfBlockedError
    );
  });

  it("blocks localhost hostname", async () => {
    await expect(assertSafeToFetch("http://localhost:6379/")).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("rejects non-http(s) protocols", async () => {
    await expect(assertSafeToFetch("file:///etc/passwd")).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("rejects URLs with embedded credentials", async () => {
    await expect(assertSafeToFetch("http://user:pass@example.com/")).rejects.toBeInstanceOf(SsrfBlockedError);
  });

  it("allows a public https URL", async () => {
    await expect(assertSafeToFetch("https://example.com/file.mp4")).resolves.toBeInstanceOf(URL);
  });
});
