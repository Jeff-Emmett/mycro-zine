"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Sparkles, BookOpen, Printer } from "lucide-react";

const STYLES = [
  { value: "punk-zine", label: "Punk Zine", description: "Xerox texture, high contrast, DIY collage" },
  { value: "minimal", label: "Minimal", description: "Clean lines, white space, modern" },
  { value: "collage", label: "Collage", description: "Layered imagery, mixed media" },
  { value: "retro", label: "Retro", description: "1970s aesthetic, earth tones" },
  { value: "academic", label: "Academic", description: "Diagrams, annotations, infographic" },
];

const TONES = [
  { value: "rebellious", label: "Rebellious", description: "Defiant, punk attitude" },
  { value: "playful", label: "Playful", description: "Whimsical, fun, light-hearted" },
  { value: "informative", label: "Informative", description: "Educational, factual" },
  { value: "poetic", label: "Poetic", description: "Lyrical, metaphorical" },
];

export default function Home() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("punk-zine");
  const [tone, setTone] = useState("rebellious");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTopic((prev) => (prev ? prev + " " + transcript : transcript));
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);

    // Store the input in sessionStorage and navigate to create page
    sessionStorage.setItem("zineInput", JSON.stringify({ topic, style, tone }));
    router.push("/create");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-8">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12">
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight punk-text mb-4">
          MYCRO<span className="text-green-500">ZINE</span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-xl mx-auto">
          Transform your ideas into printable 8-page mini-zines with AI
        </p>
      </div>

      {/* Features */}
      <div className="flex flex-wrap justify-center gap-6 mb-8 sm:mb-12">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4" />
          <span>AI-Generated</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <BookOpen className="w-4 h-4" />
          <span>8 Pages</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Printer className="w-4 h-4" />
          <span>Print Ready</span>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-6">
        {/* Topic Input */}
        <div className="punk-border bg-white p-1">
          <div className="relative">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What's your zine about? Describe your concept..."
              className="w-full h-32 p-4 pr-12 text-lg resize-none border-0 focus:outline-none focus:ring-0 punk-text"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`absolute right-3 top-3 p-2 rounded-full transition-colors ${
                isListening
                  ? "bg-red-500 text-white animate-pulse"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
              title={isListening ? "Stop listening" : "Voice input"}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Style & Tone Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Style Select */}
          <div className="punk-border bg-white p-4">
            <label className="block text-sm font-bold punk-text mb-2">Style</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-2 border-2 border-black bg-white punk-text focus:outline-none"
              disabled={isLoading}
            >
              {STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              {STYLES.find((s) => s.value === style)?.description}
            </p>
          </div>

          {/* Tone Select */}
          <div className="punk-border bg-white p-4">
            <label className="block text-sm font-bold punk-text mb-2">Tone</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full p-2 border-2 border-black bg-white punk-text focus:outline-none"
              disabled={isLoading}
            >
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-gray-500">
              {TONES.find((t) => t.value === tone)?.description}
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!topic.trim() || isLoading}
          className="w-full py-4 px-6 bg-black text-white text-lg font-bold punk-text
                     hover:bg-green-500 hover:text-black transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     punk-border hover:shadow-[6px_6px_0_black]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">&#9881;</span>
              Generating...
            </span>
          ) : (
            "Generate Outline →"
          )}
        </button>
      </form>

      {/* Footer */}
      <footer className="mt-12 text-center text-sm text-gray-400">
        <p>
          Folds into a single 8.5&quot; x 11&quot; sheet •{" "}
          <a href="#how-it-works" className="underline hover:text-gray-600">
            How to fold
          </a>
        </p>
      </footer>
    </div>
  );
}
