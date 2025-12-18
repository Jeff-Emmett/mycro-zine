"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Edit2,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Share2,
  Copy,
  CheckCircle,
} from "lucide-react";

interface PageOutline {
  pageNumber: number;
  type: string;
  title: string;
  keyPoints: string[];
  imagePrompt: string;
}

interface ZineState {
  id: string;
  topic: string;
  style: string;
  tone: string;
  outline: PageOutline[];
  pages: string[];
  currentStep: "outline" | "generate" | "refine" | "download";
  generatingPage: number | null;
  printLayoutUrl: string | null;
}

const STEPS = ["outline", "generate", "refine", "download"] as const;
const STEP_LABELS = {
  outline: "Review Outline",
  generate: "Generate Pages",
  refine: "Refine Pages",
  download: "Download & Share",
};

export default function CreatePage() {
  const router = useRouter();
  const [state, setState] = useState<ZineState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [feedback, setFeedback] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize from session storage
  useEffect(() => {
    const input = sessionStorage.getItem("zineInput");
    if (!input) {
      router.push("/");
      return;
    }

    const { topic, style, tone } = JSON.parse(input);
    generateOutline(topic, style, tone);
  }, [router]);

  const generateOutline = async (topic: string, style: string, tone: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, style, tone }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate outline");
      }

      const data = await response.json();

      setState({
        id: data.id,
        topic,
        style,
        tone,
        outline: data.outline,
        pages: new Array(8).fill(""),
        currentStep: "outline",
        generatingPage: null,
        printLayoutUrl: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const generatePages = async () => {
    if (!state) return;

    setState((s) => (s ? { ...s, currentStep: "generate" } : s));

    for (let i = 1; i <= 8; i++) {
      if (state.pages[i - 1]) continue; // Skip already generated pages

      setState((s) => (s ? { ...s, generatingPage: i } : s));

      try {
        const response = await fetch("/api/generate-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            zineId: state.id,
            pageNumber: i,
            outline: state.outline[i - 1],
            style: state.style,
            tone: state.tone,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to generate page ${i}`);
        }

        const data = await response.json();

        setState((s) => {
          if (!s) return s;
          const newPages = [...s.pages];
          newPages[i - 1] = data.imageUrl;
          return { ...s, pages: newPages };
        });
      } catch (err) {
        console.error(`Error generating page ${i}:`, err);
        setError(`Failed to generate page ${i}`);
        return;
      }
    }

    setState((s) => (s ? { ...s, generatingPage: null, currentStep: "refine" } : s));
  };

  const regeneratePage = async () => {
    if (!state || !feedback.trim()) return;

    setState((s) => (s ? { ...s, generatingPage: currentPage } : s));

    try {
      const response = await fetch("/api/regenerate-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zineId: state.id,
          pageNumber: currentPage,
          currentOutline: state.outline[currentPage - 1],
          feedback: feedback.trim(),
          style: state.style,
          tone: state.tone,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to regenerate page");
      }

      const data = await response.json();

      setState((s) => {
        if (!s) return s;
        const newPages = [...s.pages];
        newPages[currentPage - 1] = data.imageUrl;
        const newOutline = [...s.outline];
        newOutline[currentPage - 1] = data.updatedOutline;
        return { ...s, pages: newPages, outline: newOutline, generatingPage: null };
      });

      setFeedback("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate");
      setState((s) => (s ? { ...s, generatingPage: null } : s));
    }
  };

  const createPrintLayout = async () => {
    if (!state) return;

    setLoading(true);

    try {
      const response = await fetch("/api/print-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zineId: state.id,
          zineName: state.topic.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_"),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create print layout");
      }

      const data = await response.json();

      setState((s) =>
        s ? { ...s, printLayoutUrl: data.printLayoutUrl, currentStep: "download" } : s
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create print layout");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceInput = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input not supported");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setFeedback((prev) => (prev ? prev + " " + transcript : transcript));
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [isListening]);

  const copyShareLink = async () => {
    if (!state) return;
    const shareUrl = `${window.location.origin}/z/${state.id}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !state) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto animate-spin mb-4" />
          <p className="text-lg punk-text">Generating your outline...</p>
        </div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="punk-border bg-white p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold punk-text mb-4">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-black text-white punk-text hover:bg-green-500 hover:text-black"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!state) return null;

  return (
    <div className="min-h-screen p-4 sm:p-8">
      {/* Header with Progress */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-black"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="punk-text text-sm">Back</span>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold punk-text truncate max-w-md">
            {state.topic}
          </h1>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${
                    STEPS.indexOf(state.currentStep) >= i
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
              >
                {STEPS.indexOf(state.currentStep) > i ? (
                  <Check className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-24 h-1 mx-2 ${
                    STEPS.indexOf(state.currentStep) > i ? "bg-black" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {STEPS.map((step) => (
            <span
              key={step}
              className={`text-xs punk-text ${
                state.currentStep === step ? "text-black" : "text-gray-400"
              }`}
            >
              {STEP_LABELS[step]}
            </span>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-4xl mx-auto mb-4 p-4 bg-red-100 border border-red-400 text-red-700 punk-text text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="max-w-4xl mx-auto">
        {/* Step 1: Outline Review */}
        {state.currentStep === "outline" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold punk-text mb-4">Your 8-Page Outline</h2>
            <div className="grid gap-4">
              {state.outline.map((page, i) => (
                <div key={i} className="punk-border bg-white p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs text-gray-500 punk-text">
                        Page {page.pageNumber} • {page.type}
                      </span>
                      <h3 className="font-bold text-lg">{page.title}</h3>
                      <ul className="mt-2 text-sm text-gray-600">
                        {page.keyPoints.map((point, j) => (
                          <li key={j}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={generatePages}
                className="px-6 py-3 bg-black text-white punk-text flex items-center gap-2
                          hover:bg-green-500 hover:text-black transition-colors punk-border"
              >
                Generate Pages
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Page Generation */}
        {state.currentStep === "generate" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold punk-text">
              Generating Pages... {state.pages.filter((p) => p).length}/8
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {state.outline.map((page, i) => (
                <div
                  key={i}
                  className={`aspect-[3/4] punk-border flex items-center justify-center
                    ${state.pages[i] ? "bg-white" : "bg-gray-100"}`}
                >
                  {state.pages[i] ? (
                    <img
                      src={state.pages[i]}
                      alt={`Page ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : state.generatingPage === i + 1 ? (
                    <div className="text-center p-2">
                      <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                      <span className="text-xs punk-text">Page {i + 1}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 punk-text">P{i + 1}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Page Refinement */}
        {state.currentStep === "refine" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold punk-text">
                Page {currentPage} of 8
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 punk-border disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(8, p + 1))}
                  disabled={currentPage === 8}
                  className="p-2 punk-border disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Current Page Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-[3/4] punk-border bg-white">
                {state.generatingPage === currentPage ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-12 h-12 animate-spin" />
                  </div>
                ) : (
                  <img
                    src={state.pages[currentPage - 1]}
                    alt={`Page ${currentPage}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="punk-border bg-white p-4">
                  <h3 className="font-bold punk-text">{state.outline[currentPage - 1].title}</h3>
                  <p className="text-sm text-gray-600 mt-2">
                    {state.outline[currentPage - 1].keyPoints.join(" • ")}
                  </p>
                </div>

                <div className="punk-border bg-white p-4">
                  <label className="block text-sm font-bold punk-text mb-2">
                    Feedback for refinement
                  </label>
                  <div className="relative">
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Make it more punk... Add more contrast... Change the layout..."
                      className="w-full h-24 p-3 pr-12 border-2 border-black resize-none punk-text text-sm"
                      disabled={state.generatingPage !== null}
                    />
                    <button
                      type="button"
                      onClick={handleVoiceInput}
                      className={`absolute right-2 top-2 p-2 rounded-full ${
                        isListening ? "bg-red-500 text-white" : "bg-gray-100"
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={regeneratePage}
                    disabled={!feedback.trim() || state.generatingPage !== null}
                    className="mt-3 w-full py-2 bg-black text-white punk-text flex items-center justify-center gap-2
                              hover:bg-green-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${state.generatingPage ? "animate-spin" : ""}`} />
                    Regenerate Page
                  </button>
                </div>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {state.pages.map((page, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`flex-shrink-0 w-16 aspect-[3/4] punk-border overflow-hidden
                    ${currentPage === i + 1 ? "ring-2 ring-green-500" : ""}`}
                >
                  <img src={page} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={createPrintLayout}
                className="px-6 py-3 bg-black text-white punk-text flex items-center gap-2
                          hover:bg-green-500 hover:text-black transition-colors punk-border"
              >
                Create Print Layout
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Download & Share */}
        {state.currentStep === "download" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold punk-text text-center">Your Zine is Ready!</h2>

            {/* Print Layout Preview */}
            <div className="punk-border bg-white p-4">
              <img
                src={state.printLayoutUrl || ""}
                alt="Print Layout"
                className="w-full"
              />
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={state.printLayoutUrl || "#"}
                download={`${state.topic.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}_print.png`}
                className="punk-border bg-black text-white py-4 px-6 flex items-center justify-center gap-2
                          hover:bg-green-500 hover:text-black transition-colors punk-text"
              >
                <Download className="w-5 h-5" />
                Download PNG (300 DPI)
              </a>
              <button
                onClick={copyShareLink}
                className="punk-border bg-white py-4 px-6 flex items-center justify-center gap-2
                          hover:bg-gray-100 transition-colors punk-text"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    Copy Share Link
                  </>
                )}
              </button>
            </div>

            {/* Folding Instructions */}
            <div className="punk-border bg-gray-50 p-6">
              <h3 className="font-bold punk-text mb-4">How to Fold Your Zine</h3>
              <ol className="text-sm space-y-2">
                <li>1. Print the layout on 8.5&quot; x 11&quot; paper (landscape)</li>
                <li>2. Fold in half along the long edge (hotdog fold)</li>
                <li>3. Fold in half again along the short edge</li>
                <li>4. Fold once more to create a booklet</li>
                <li>5. Unfold completely and lay flat</li>
                <li>6. Cut the center slit between pages 3-6 and 4-5</li>
                <li>7. Refold hotdog style and push ends together</li>
                <li>8. Flatten - pages should now be in order 1-8!</li>
              </ol>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  sessionStorage.removeItem("zineInput");
                  router.push("/");
                }}
                className="text-gray-600 hover:text-black punk-text underline"
              >
                Create Another Zine
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
