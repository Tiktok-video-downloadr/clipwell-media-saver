import Link from "next/link";

interface PlatformPageProps {
  platform: "YouTube" | "TikTok" | "Instagram" | "Facebook";
  connectHref: string;
  supported: string[];
  notSupported: string[];
  faq: { q: string; a: string }[];
}

export function PlatformPage({ platform, connectHref, supported, notSupported, faq }: PlatformPageProps) {
  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `Clipwell ${platform} export`,
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Any (web-based)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: `${platform} export`, item: connectHref.replace("/api/oauth", "").replace("/start", "") },
    ],
  };

  const faqSchema =
    faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map(({ q, a }) => ({
            "@type": "Question",
            name: q,
            acceptedAnswer: { "@type": "Answer", text: a },
          })),
        }
      : null;

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 pt-16 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <nav aria-label="Breadcrumb" className="text-xs text-[var(--ink-soft)]">
        <Link href="/">Home</Link> <span aria-hidden="true">/</span> {platform}
      </nav>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{platform} export</h1>
      <p className="mt-2 text-[15px] text-[var(--ink-soft)]">
        Connect your {platform} account to export and convert your own uploaded content through {platform}'s official API.
      </p>

      <Link
        href={connectHref}
        className="mt-6 inline-block rounded-md bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-white"
      >
        Connect {platform} account
      </Link>

      <section className="mt-12">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--ink-soft)]">Supported today</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {supported.map((item) => (
            <li key={item}>✓ {item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--ink-soft)]">Not supported</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--ink-soft)]">
          {notSupported.map((item) => (
            <li key={item}>✗ {item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--ink-soft)]">FAQ</h2>
        <dl className="mt-3 space-y-4">
          {faq.map(({ q, a }) => (
            <div key={q}>
              <dt className="text-sm font-medium">{q}</dt>
              <dd className="mt-1 text-sm text-[var(--ink-soft)]">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
