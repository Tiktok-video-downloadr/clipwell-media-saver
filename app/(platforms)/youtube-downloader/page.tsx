import type { Metadata } from "next";
import { PlatformPage } from "@/components/PlatformPage";

export const metadata: Metadata = {
  title: "Export your own YouTube uploads",
  description:
    "Connect your YouTube account to export and convert your own uploaded videos via the official YouTube Data API. No unauthorized downloading of other creators' videos.",
  alternates: { canonical: "/youtube-downloader" },
};

export default function YouTubeDownloaderPage() {
  return (
    <PlatformPage
      platform="YouTube"
      connectHref="/api/oauth/youtube/start"
      supported={[
        "Export videos you've uploaded to your own connected channel.",
        "Convert your own uploads to MP4, WebM, or extract audio as MP3/M4A.",
        "Choose an output resolution up to your source video's resolution.",
      ]}
      notSupported={[
        "Downloading videos uploaded by other channels or creators.",
        "Bypassing age-restricted, private, or members-only video access controls.",
        "Any format or resolution that doesn't genuinely exist in the source.",
      ]}
      faq={[
        {
          q: "Why can't I paste any YouTube link?",
          a: "YouTube doesn't provide an official API for retrieving arbitrary public videos as files. We only support content from channels you've connected and authorized.",
        },
        {
          q: "What does connecting my account share?",
          a: "We request the minimum scope needed to list and export your own uploads. We never see your password, and you can revoke access at any time from your Google account settings.",
        },
      ]}
    />
  );
}
