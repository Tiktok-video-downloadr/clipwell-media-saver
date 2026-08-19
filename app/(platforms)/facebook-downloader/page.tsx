import type { Metadata } from "next";
import { PlatformPage } from "@/components/PlatformPage";

export const metadata: Metadata = {
  title: "Export your own Facebook video uploads",
  description:
    "Connect your Facebook Page to export and convert your own video uploads via Meta's official Graph API.",
  alternates: { canonical: "/facebook-downloader" },
};

export default function FacebookDownloaderPage() {
  return (
    <PlatformPage
      platform="Facebook"
      connectHref="/api/oauth/facebook/start"
      supported={[
        "Export videos and Reels from a Facebook Page you manage.",
        "Convert your own uploads to MP4 or extract audio.",
      ]}
      notSupported={[
        "Downloading videos posted by other Pages or personal profiles.",
        "Accessing private groups or friends-only content.",
      ]}
      faq={[
        {
          q: "Why does this need a Facebook Page, not a personal profile?",
          a: "Meta's Graph API for video export is scoped to Pages you administer, which is the officially supported mechanism for this operation.",
        },
      ]}
    />
  );
}
