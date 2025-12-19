# RunPod Serverless: Gemini API Proxy
# Lightweight Python image for API proxying (no GPU needed)

FROM python:3.11-slim

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir runpod requests

# Copy handler
COPY handler.py .

# RunPod serverless entry point
CMD ["python", "-u", "handler.py"]
