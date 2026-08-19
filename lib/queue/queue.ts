import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import type { MediaSourceRequest, RequestContext } from "@/lib/ingestion/types";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export interface ProcessingJobData {
  requestId: string;
  source: MediaSourceRequest;
  ctx: RequestContext;
  createdAt: string;
}

export interface ProcessingJobResult {
  downloadUrl: string;
  sizeBytes: number;
  durationSeconds?: number;
  format: string;
}

export const PROCESSING_QUEUE_NAME = "media-processing";

export const processingQueue = new Queue<ProcessingJobData, ProcessingJobResult>(
  PROCESSING_QUEUE_NAME,
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
      removeOnComplete: { age: 60 * 60 },
      removeOnFail: { age: 24 * 60 * 60 },
    },
  }
);

export const processingQueueEvents = new QueueEvents(PROCESSING_QUEUE_NAME, { connection });

export async function enqueueProcessingJob(
  data: ProcessingJobData,
  opts?: { priority?: number }
) {
  return processingQueue.add("process-media", data, {
    jobId: data.requestId,
    priority: opts?.priority,
  });
}

export async function getJobStatus(requestId: string) {
  const job = await processingQueue.getJob(requestId);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
  };
}
