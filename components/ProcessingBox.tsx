"use client";

import { useState, useCallback } from "react";

type SourceMode = "upload" | "direct-url" | "oauth-own-content";
type JobPhase = "idle" | "detecting" | "queued" | "processing" | "complete" | "error";

interface JobState {
  phase: JobPhase;
  jobId?: string;
  errorMessage?: string;
  downloadUrl?: string;
}

export function ProcessingBox() {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState<SourceMode | null>(null);
  const [job, setJob] = useState<JobState>({ phase: "idle" });

  const detectMode = useCallback((value: string) => {
    if (!value.trim()) {
      setMode(null);
      return;
    }
    setMode("direct-url");
  }, []);

  async function handleSubmit() {
    if (!url.trim()) return;
    setJob({ phase: "detecting" });

    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "direct-url", url, targetFormat: "mp4" }),
    });

    if (res.status === 422) {
      const body = await res.json();
      setJob({
        phase: "error",
        errorMessage:
          body.message ??
          "This isn't something we can process yet. Try uploading a file, or connect an account to export your own content.",
      });
      return;
    }

    if (!res.ok) {
      setJob({ phase: "error", errorMessage: "Something went wrong. Please try again." });
      return;
    }

    const { jobId } = await res.json();
    setJob({ phase: "queued", jobId });
    pollStatus(jobId);
  }

  async function pollStatus(jobId: string) {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) return;
      const status = await res.json();

      if (status.state === "completed") {
        clearInterval(interval);
        setJob({ phase: "complete", jobId, downloadUrl: status.result?.downloadUrl });
      } else if (status.state === "failed") {
        clearInterval(interval);
        setJob({ phase: "error", errorMessage: status.failedReason ?? "Processing failed." });
      } else {
        setJob((prev) => ({ ...prev, phase: "processing" }));
      }
    }, 1500);
  }

  return (
    <div className="w-full max-w-xl">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-white px-4 py-3 shadow-sm focus-within:border-[var(--ink)] transition-colors">
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            detectMode(e.target.value);
          }}
          placeholder="Paste a URL you have rights to, or upload a file below"
          aria-label="Media URL"
          className="flex-1 bg-transparent outline-none text-[15px] placeholder:text-[var(--ink-soft)]"
        />
        {mode && (
          <span className="font-mono-status text-xs text-[var(--ink-soft)] shrink-0">
            direct URL
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={!url.trim() || job.phase === "detecting" || job.phase === "queued" || job.phase === "processing"}
          className="rounded-md bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Process
        </button>
        <span className="text-sm text-[var(--ink-soft)]">or</span>
        <label className="text-sm font-medium underline decoration-[var(--line)] underline-offset-4 cursor-pointer">
          Upload a file
          <input type="file" className="sr-only" onChange={() => setMode("upload")} />
        </label>
      </div>

      <JobStatusPanel job={job} />
    </div>
  );
}

function JobStatusPanel({ job }: { job: JobState }) {
  if (job.phase === "idle") return null;

  if (job.phase === "error") {
    return (
      <div role="status" className="mt-4 rounded-md border border-[var(--line)] bg-[#FBF5EE] p-4 text-sm">
        <p className="font-medium">Can't process this yet</p>
        <p className="mt-1 text-[var(--ink-soft)]">{job.errorMessage}</p>
      </div>
    );
  }

  if (job.phase === "complete" && job.downloadUrl) {
    return (
      <div role="status" className="mt-4 rounded-md border border-[var(--line)] bg-white p-4 text-sm">
        <p className="font-medium">Ready</p>
        <a
          href={job.downloadUrl}
          className="mt-2 inline-block rounded-md bg-[var(--ink)] px-4 py-2 text-white text-sm font-medium"
        >
          Download
        </a>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className="mt-4 flex items-center gap-2 text-sm text-[var(--ink-soft)]">
      <span
        className="h-2 w-2 rounded-full bg-[var(--signal)] animate-pulse"
        aria-hidden="true"
      />
      <span className="font-mono-status">
        {job.phase === "detecting" && "checking authorization…"}
        {job.phase === "queued" && "queued…"}
        {job.phase === "processing" && "processing…"}
