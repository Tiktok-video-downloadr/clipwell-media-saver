import type { Metadata } from "next";
import { PlatformPage } from "@/components/PlatformPage";

export const metadata: Metadata = {
  title: "Export your own TikTok uploads",
  description:
    "Connect your TikTok account to export and convert your own uploaded videos via TikTok's official API. No unauthorized downloading of other creators' videos.",
  alternates: { canonical: "/tiktok-downloader" },
};

export default function TikTokDownloaderPage() {
  return (
    <PlatformPage
      platform="TikTok"
      connectHref="/api/oauth/tiktok/start"
      supported={[
        "Export videos posted from your own connected TikTok account.",
        "Convert your own posts to MP4 or extract audio as MP3/M4A.",
      ]}
      notSupported={[
        "Downloading videos posted by other TikTok accounts.",
        "Removing watermarks from other creators' content.",
        "Accessing private or restricted TikTok content.",
      ]}
      faq={[
        {
          q: "Why can't I paste any TikTok link?",
          a: "TikTok's official API is scoped to your own account's content and analytics, not arbitrary public video retrieval. We only export what you've connected and authorized.",
        },
        {
          q: "Is the exported video watermarked?",
          a: "We export exactly what TikTok's API returns for your own uploads — we don't add, remove, or fabricate anything.",
        },
      ]}
    />
  );
}
