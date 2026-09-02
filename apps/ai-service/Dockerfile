FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN useradd -m -u 1001 careerforge

COPY apps/ai-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/ai-service/ ./apps/ai-service/

RUN chown -R careerforge:careerforge /app

USER careerforge

WORKDIR /app/apps/ai-service

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
