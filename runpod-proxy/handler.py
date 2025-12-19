"""
RunPod Serverless Handler: Gemini API Proxy
Routes requests through US-based RunPod to bypass geo-restrictions
"""

import runpod
import requests
import os

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

def handler(job):
    """
    Proxy requests to Gemini API for image generation.

    Input:
    {
        "model": "gemini-2.0-flash-exp",
        "contents": [...],
        "generationConfig": {...}
    }

    Output:
    Gemini API response (including base64 image data)
    """
    job_input = job.get("input", {})

    # Get API key from job input or environment
    api_key = job_input.get("api_key") or GEMINI_API_KEY
    if not api_key:
        return {"error": "GEMINI_API_KEY not provided"}

    # Extract Gemini request parameters
    model = job_input.get("model", "gemini-2.0-flash-exp")
    contents = job_input.get("contents", [])
    generation_config = job_input.get("generationConfig", {})

    # Build Gemini API URL
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    try:
        # Forward request to Gemini
        response = requests.post(
            gemini_url,
            json={
                "contents": contents,
                "generationConfig": generation_config
            },
            headers={"Content-Type": "application/json"},
            timeout=120  # Image generation can take a while
        )

        # Return Gemini response
        data = response.json()

        # Check for geo-blocking (shouldn't happen from US RunPod)
        if data.get("error", {}).get("message", "").find("not available in your country") != -1:
            return {
                "error": "geo_blocked",
                "message": "Gemini image generation blocked. RunPod may be in restricted region.",
                "raw_error": data.get("error")
            }

        return data

    except requests.exceptions.Timeout:
        return {"error": "Request to Gemini API timed out"}
    except requests.exceptions.RequestException as e:
        return {"error": f"Request failed: {str(e)}"}
    except Exception as e:
        return {"error": f"Unexpected error: {str(e)}"}


# Start the serverless handler
runpod.serverless.start({"handler": handler})
