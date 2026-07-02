FROM python:3.12-slim

# Security: run as non-root
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install dependencies first (layer caches when only code changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 5000

# Health check so orchestrators know when the app is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/health')"

CMD ["gunicorn", "-c", "gunicorn.conf.py", "wsgi:app"]
