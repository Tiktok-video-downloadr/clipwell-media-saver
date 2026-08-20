"use client";

import { useState, useCallback } from "react";

type SourceMode = "upload" | "direct-url" | "oauth-own-content";
type JobPhase = "idle" | "detecting" | "queued" | "processing" | "complete" | "error";

interface JobState {
  phase: JobPhase;
  jobId?: string;
  errorMessage?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
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

  async function handleFileSelected(file: File) {
    setMode("upload");
    setJob({ phase: "detecting" });

    const form = new FormData();
    form.append("file", file);

    const uploadRes = await fetch("/api/uploads", { method: "POST", body: form });
    if (!uploadRes.ok) {
      const body = await uploadRes.json().catch(() => ({}));
      setJob({
        phase: "error",
        errorMessage: body.message ?? "Upload failed. Please try a different file.",
      });
      return;
    }
    const { uploadRef } = await uploadRes.json();

    const jobRes = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type
