import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MycroZine - Create Your Own Mini-Zine",
  description: "Transform your ideas into printable 8-page mini-zines with AI. Input a concept, generate pages, refine, and print!",
  openGraph: {
    title: "MycroZine - Create Your Own Mini-Zine",
    description: "Transform your ideas into printable 8-page mini-zines with AI",
    url: "https://zine.jeffemmett.com",
    siteName: "MycroZine",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        <main className="flex min-h-screen flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
