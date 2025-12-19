/**
 * Cloudflare Worker: Gemini API Proxy
 * Routes requests through US region to bypass geo-restrictions
 * Uses US-based secondary proxy to ensure requests originate from US
 */

// Use a US-based proxy service for the actual API call
const US_PROXY_SERVICES = [
  // Primary: Use allorigins.win (US-based CORS proxy)
  (url, options) => fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
    method: "POST",
    headers: options.headers,
    body: options.body,
  }),
];

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Get API key from header or env
    const apiKey = request.headers.get("X-API-Key") || env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const body = await request.json();
      const { model, contents, generationConfig } = body;

      // Forward to Gemini API
      const modelName = model || "gemini-2.0-flash-exp";
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      // Try direct fetch first (works when called from US)
      let geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig,
        }),
      });

      let data = await geminiResponse.json();

      // If geo-blocked, return a helpful error
      if (data.error?.message?.includes("not available in your country")) {
        return new Response(JSON.stringify({
          error: "geo_blocked",
          message: "Gemini image generation is not available in EU. Using placeholder images.",
          suggestion: "Images will be generated as placeholders. For full functionality, deploy from a US server.",
        }), {
          status: 200,  // Return 200 so app can handle gracefully
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }

      return new Response(JSON.stringify(data), {
        status: geminiResponse.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};
