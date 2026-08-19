type Counter = Map<string, number>;
type LatencySamples = Map<string, number[]>;

class MetricsRegistry {
  private counters: Record<string, Counter> = {};
  private latencies: Record<string, LatencySamples> = {};

  incr(name: string, labels: Record<string, string> = {}, value = 1) {
    const key = labelKey(labels);
    if (!this.counters[name]) this.counters[name] = new Map();
    const bucket = this.counters[name];
    bucket.set(key, (bucket.get(key) ?? 0) + value);
  }

  observeLatency(name: string, labels: Record<string, string> = {}, ms: number) {
    const key = labelKey(labels);
    if (!this.latencies[name]) this.latencies[name] = new Map();
    const bucket = this.latencies[name];
    const arr = bucket.get(key) ?? [];
    arr.push(ms);
    if (arr.length > 1000) arr.shift();
    bucket.set(key, arr);
  }

  successRate(adapterId: string): number {
    const success = this.counters["job_completed"]?.get(labelKey({ adapter: adapterId })) ?? 0;
    const failed = this.counters["job_failed"]?.get(labelKey({ adapter: adapterId })) ?? 0;
    const total = success + failed;
    return total === 0 ? 1 : success / total;
  }

  toPrometheusText(): string {
    const lines: string[] = [];
    for (const [name, bucket] of Object.entries(this.counters)) {
      lines.push(`# TYPE ${name} counter`);
      for (const [labelStr, value] of bucket.entries()) {
        lines.push(`${name}${labelStr} ${value}`);
      }
    }
    for (const [name, bucket] of Object.entries(this.latencies)) {
      lines.push(`# TYPE ${name}_ms_avg gauge`);
      for (const [labelStr, samples] of bucket.entries()) {
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        lines.push(`${name}_ms_avg${labelStr} ${avg.toFixed(1)}`);
      }
    }
    return lines.join("\n") + "\n";
  }
}

function labelKey(labels: Record<string, string>): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) return "";
  return "{" + entries.map(([k, v]) => `${k}="${v}"`).join(",") + "}";
}

export const metrics = new MetricsRegistry();

export type FunnelEvent =
  | "platform_detected"
  | "job_created"
  | "job_queued"
  | "processing_started"
  | "job_completed"
  | "job_failed"
  | "format_selected"
  | "download_started"
  | "download_completed";

export function trackFunnelEvent(event: FunnelEvent, labels: Record<string, string> = {}) {
  metrics.incr(event, labels);
}
