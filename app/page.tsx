import Link from "next/link";
import { ProcessingBox } from "@/components/ProcessingBox";

export default function HomePage() {
  return (
    <main id="main" className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-20 pb-24 text-center">
      <p className="font-mono-status text-xs uppercase tracking-wider text-[var(--ink-soft)]">
        Clipwell
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Process media you're authorized to use
      </h1>
      <p className="mt-3 max-w-md text-[15px] text-[var(--ink-soft)]">
        Upload a file, paste a URL you have rights to, or connect your own
        account to export your own uploads — converted to the format you
        need.
      </p>

      <div className="mt-8 flex w-full justify-center">
        <ProcessingBox />
      </div>

      <section className="mt-16 w-full text-left">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--ink-soft)]">
          Connect your own account
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { href: "/youtube-downloader", label: "YouTube" },
            { href: "/tiktok-downloader", label: "TikTok" },
            { href: "/instagram-downloader", label: "Instagram" },
            { href: "/facebook-downloader", label: "Facebook" },
          ].map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="rounded-md border border-[var(--line)] px-3 py-2 text-sm hover:border-[var(--ink)]"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 w-full text-left">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--ink-soft)]">
          What this does and doesn't do
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
          <li>✓ Converts files you upload yourself.</li>
          <li>✓ Fetches a URL you confirm you have rights to (excludes social platforms without an official export API).</li>
          <li>✓ Exports your own content from a connected account, where the platform provides an official API for it.</li>
          <li>✗ Doesn't download other people's posts, private content, or anything behind a login you don't control.</li>
        </ul>
      </section>
    </main>
  );
}
