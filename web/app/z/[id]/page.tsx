import { Metadata } from "next";
import { notFound } from "next/navigation";
import ZineViewer from "./ZineViewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getZine(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/zine/${id}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const zine = await getZine(id);

  if (!zine) {
    return {
      title: "Zine Not Found - MycroZine",
    };
  }

  return {
    title: `${zine.topic} - MycroZine`,
    description: `An 8-page mini-zine about ${zine.topic}. Created with MycroZine.`,
    openGraph: {
      title: `${zine.topic} - MycroZine`,
      description: `An 8-page mini-zine about ${zine.topic}`,
      type: "article",
      images: zine.pageUrls?.[0] ? [{ url: zine.pageUrls[0] }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: `${zine.topic} - MycroZine`,
      description: `An 8-page mini-zine about ${zine.topic}`,
    },
  };
}

export default async function SharedZinePage({ params }: PageProps) {
  const { id } = await params;
  const zine = await getZine(id);

  if (!zine) {
    notFound();
  }

  return <ZineViewer zine={zine} />;
}
