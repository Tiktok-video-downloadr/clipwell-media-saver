import { ingestionRegistry } from "@/lib/ingestion/registry";
import { processingQueue } from "@/lib/queue/queue";
import { metrics } from "@/lib/observability/metrics";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [adapters, counts] = await Promise.all([
    ingestionRegistry.healthSnapshot(),
    processingQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Operations dashboard</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">
        Server-rendered on every request — not for public access (see
        deployment notes: put this behind auth/IP allowlist before shipping).
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--ink-soft)]">Queue</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {Object.entries(counts).map(([state, count]) => (
            <div key={state} className="rounded-md border border-[var(--line)] p-3">
              <dt className="font-mono-status text-xs text-[var(--ink-soft)]">{state}</dt>
              <dd className="font-mono-status text-xl">{count}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--ink-soft)]">Adapter health</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-soft)]">
              <th className="py-2 font-normal">Adapter</th>
              <th className="py-2 font-normal">Status</th>
              <th className="py-2 font-normal">Success rate</th>
              <th className="py-2 font-normal">Avg latency</th>
            </tr>
          </thead>
          <tbody>
            {adapters.map((a) => (
              <tr key={a.id} className="border-b border-[var(--line)]">
                <td className="py-2 font-mono-status">{a.id}</td>
                <td className="py-2">
                  <span className={a.healthy ? "text-green-700" : "text-red-700"}>
                    {a.healthy ? "healthy" : "degraded"}
                  </span>
                </td>
                <td className="py-2 font-mono-status">{(metrics.successRate(a.id) * 100).toFixed(1)}%</td>
                <td className="py-2 font-mono-status">{a.averageLatencyMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
