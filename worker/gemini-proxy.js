/**
 * Cloudflare Worker: Gemini API Proxy
 * Routes requests through US region to bypass geo-restrictions
 */

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

      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig,
        }),
      });

      const data = await geminiResponse.json();

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
