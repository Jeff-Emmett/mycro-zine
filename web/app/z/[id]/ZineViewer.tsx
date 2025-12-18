"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Download, Plus, Share2, Copy, CheckCircle } from "lucide-react";

interface PageOutline {
  pageNumber: number;
  type: string;
  title: string;
  keyPoints: string[];
  imagePrompt: string;
}

interface ZineData {
  id: string;
  topic: string;
  style: string;
  tone: string;
  outline: PageOutline[];
  pageUrls: string[];
  printLayoutUrl: string | null;
  shareUrl: string;
  createdAt: string;
}

interface ZineViewerProps {
  zine: ZineData;
}

export default function ZineViewer({ zine }: ZineViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrevPage = () => {
    setCurrentPage((p) => (p > 0 ? p - 1 : zine.pageUrls.length - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => (p < zine.pageUrls.length - 1 ? p + 1 : 0));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="text-gray-600 hover:text-black punk-text text-sm flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            MycroZine
          </Link>
          <div className="flex gap-2">
            <button
              onClick={copyShareLink}
              className="px-3 py-1 punk-border bg-white text-sm punk-text flex items-center gap-1
                        hover:bg-gray-100"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Share
                </>
              )}
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold punk-text text-center mb-2">
          {zine.topic}
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          {zine.style} • {zine.tone}
        </p>

        {/* Main Viewer */}
        <div className="relative">
          {/* Page Display */}
          <div className="punk-border bg-white aspect-[3/4] max-w-md mx-auto overflow-hidden">
            {zine.pageUrls[currentPage] && (
              <img
                src={zine.pageUrls[currentPage]}
                alt={`Page ${currentPage + 1}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={handlePrevPage}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-12
                      p-2 sm:p-3 punk-border bg-white hover:bg-green-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextPage}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-12
                      p-2 sm:p-3 punk-border bg-white hover:bg-green-500 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Page Info */}
        <div className="text-center mt-4">
          <p className="punk-text text-sm">
            Page {currentPage + 1} of {zine.pageUrls.length}
          </p>
          {zine.outline[currentPage] && (
            <p className="text-gray-600 text-sm mt-1">{zine.outline[currentPage].title}</p>
          )}
        </div>

        {/* Thumbnail Strip */}
        <div className="flex justify-center gap-2 mt-6 overflow-x-auto pb-2">
          {zine.pageUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`flex-shrink-0 w-12 sm:w-16 aspect-[3/4] punk-border overflow-hidden
                ${currentPage === i ? "ring-2 ring-green-500" : "opacity-60 hover:opacity-100"}`}
            >
              <img src={url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
          {zine.printLayoutUrl && (
            <a
              href={zine.printLayoutUrl}
              download={`${zine.topic.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}_print.png`}
              className="punk-border bg-black text-white py-3 px-6 flex items-center justify-center gap-2
                        hover:bg-green-500 hover:text-black transition-colors punk-text"
            >
              <Download className="w-5 h-5" />
              Download Print Layout
            </a>
          )}
          <Link
            href="/"
            className="punk-border bg-white py-3 px-6 flex items-center justify-center gap-2
                      hover:bg-gray-100 transition-colors punk-text"
          >
            <Plus className="w-5 h-5" />
            Create Your Own
          </Link>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-xs text-gray-400">
          <p>
            Created with{" "}
            <Link href="/" className="underline hover:text-gray-600">
              MycroZine
            </Link>
          </p>
          <p className="mt-1">
            {new Date(zine.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
