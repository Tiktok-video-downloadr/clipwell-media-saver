import type { Metadata } from "next";
import { PlatformPage } from "@/components/PlatformPage";

export const metadata: Metadata = {
  title: "Export your own Instagram uploads",
  description:
    "Connect your Instagram account to export and convert your own Reels and video posts via Meta's official Graph API.",
  alternates: { canonical: "/instagram-downloader" },
};

export default function InstagramDownloaderPage() {
  return (
    <PlatformPage
      platform="Instagram"
      connectHref="/api/oauth/instagram/start"
      supported={[
        "Export Reels and video posts from your own connected Instagram account.",
        "Convert your own posts to MP4 or extract audio.",
      ]}
      notSupported={[
        "Downloading posts, Reels, or Stories from other accounts.",
        "Accessing private accounts you don't manage.",
        "Carousel or Story content outside what the Graph API exposes for your own account.",
      ]}
      faq={[
        {
          q: "Why can't I paste any Instagram link?",
          a: "Meta's Graph API scopes access to accounts and pages you manage, not arbitrary public posts. We only export your own connected content.",
        },
      ]}
    />
  );
}
