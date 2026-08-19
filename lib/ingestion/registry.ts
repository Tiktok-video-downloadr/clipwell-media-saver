import { uploadAdapter } from "./adapters/uploadAdapter";
import { directUrlAdapter } from "./adapters/directUrlAdapter";
import { createOAuthOwnContentAdapter } from "./adapters/oauthOwnContentAdapter";
import type {
  AuthorizationResult,
  IngestionAdapter,
  MediaSourceRequest,
  RequestContext,
} from "./types";

const adapters: IngestionAdapter[] = [
  uploadAdapter,
  directUrlAdapter,
  createOAuthOwnContentAdapter("youtube"),
  createOAuthOwnContentAdapter("tiktok"),
  createOAuthOwnContentAdapter("instagram"),
  createOAuthOwnContentAdapter("facebook"),
];

export class IngestionRegistry {
  resolve(source: MediaSourceRequest): IngestionAdapter | null {
    return adapters.find((a) => a.canHandle(source)) ?? null;
  }

  async authorizeAndResolve(
    source: MediaSourceRequest,
    ctx: RequestContext
  ): Promise<{ adapter: IngestionAdapter | null; result: AuthorizationResult }> {
    const adapter = this.resolve(source);

    if (!adapter) {
      return {
        adapter: null,
        result: {
          authorized: false,
          reason: "NO_AUTHORIZED_SOURCE",
          explanation:
            "This isn't something we can process yet. We only process files you upload, URLs you have rights to, or your own content via a connected account.",
        },
      };
    }

    const result = await adapter.authorize(source, ctx);
    return { adapter, result };
  }

  async healthSnapshot() {
    return Promise.all(adapters.map((a) => a.healthCheck()));
  }
}

export const ingestionRegistry = new IngestionRegistry();
