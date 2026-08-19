import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";
import fs from "node:fs/promises";
import {
  PROCESSING_QUEUE_NAME,
  type ProcessingJobData,
  type ProcessingJobResult,
} from "@/lib/queue/queue";
import { ingestionRegistry } from "@/lib/ingestion/registry";
import { transcode, ProcessingError } from "@/lib/ffmpeg/pipeline";
import { uploadToTempStorage } from "@/lib/storage/tempStorage";
import { metrics, trackFunnelEvent } from "@/lib/observability/metrics";
import { logger } from "@/lib/observability/logger";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 4);

const worker = new Worker<ProcessingJobData, ProcessingJobResult>(
  PROCESSING_QUEUE_NAME,
  async (job: Job<ProcessingJobData>) => {
    const { requestId, source, ctx } = job.data;
    const startedAt = Date.now();
    trackFunnelEvent("processing_started", { requestId });

    const { adapter, result } = await ingestionRegistry.authorizeAndResolve(source, ctx);
    if (!adapter || !result.authorized) {
      throw new ProcessingError(
        result.reason ?? "NO_AUTHORIZED_SOURCE",
        result.explanation ?? "Source is no longer authorized."
      );
    }

    let ingestedPath: string | null = null;
    let outputPath: string | null = null;

    try {
      await job.updateProgress(10);
      const ingested = await adapter.ingest(source, ctx);
      ingestedPath = ingested.localPath;
      await job.updateProgress(40);

      const transcodeResult = await transcode(ingested.localPath, source);
      outputPath = transcodeResult.outputPath;
      await job.updateProgress(80);

      const { downloadUrl } = await uploadToTempStorage(outputPath, requestId);
      await job.updateProgress(100);

      metrics.incr("job_completed", { adapter: adapter.id });
      metrics.observeLatency("job_duration", { adapter: adapter.id }, Date.now() - startedAt);
      trackFunnelEvent("job_completed", { requestId, adapter: adapter.id });

      logger.info("job completed", { requestId, adapter: adapter.id, durationMs: Date.now() - startedAt });

      return {
        downloadUrl,
        sizeBytes: transcodeResult.sizeBytes,
        durationSeconds: transcodeResult.durationSeconds,
        format: source.targetFormat,
      };
    } catch (err) {
      metrics.incr("job_failed", { adapter: adapter.id });
      trackFunnelEvent("job_failed", { requestId, adapter: adapter.id });
      logger.error("job failed", {
        requestId,
        adapter: adapter.id,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      for (const p of [ingestedPath, outputPath]) {
        if (p) await fs.unlink(p).catch(() => {});
      }
    }
  },
  {
    connection,
    concurrency: CONCURRENCY,
    lockDuration: 15 * 60 * 1000,
  }
);

worker.on("failed", (job, err) => {
  logger.error("bullmq job failed", { jobId: job?.id, error: err.message });
});

worker.on("error", (err) => {
  logger.error("worker error", { error: err.message });
});

process.on("SIGTERM", async () => {
  logger.info("worker shutting down");
  await worker.close();
  process.exit(0);
});

logger.info("worker started", { concurrency: CONCURRENCY });
