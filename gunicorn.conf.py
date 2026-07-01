# Gunicorn production config for CineBot
# Run with:  gunicorn -c gunicorn.conf.py app:app

import multiprocessing

# Workers: (2 × CPU cores) + 1 — proven formula for I/O-bound Flask apps
workers = (multiprocessing.cpu_count() * 2) + 1

# Threads per worker — each thread handles one request concurrently.
# With 9 workers × 4 threads = 36 requests handled simultaneously,
# easily covering hundreds of concurrent browsing users.
threads = 4

# Worker class — sync + threads is the right choice here.
# (gevent/async would need greenlet changes to the codebase)
worker_class = "sync"

bind = "0.0.0.0:5000"
timeout = 30          # Drop requests that take longer than 30 s
keepalive = 5         # Keep connections alive for 5 s (reduces TLS overhead)
max_requests = 1000   # Restart workers after 1000 requests (prevents memory leaks)
max_requests_jitter = 100  # Stagger restarts so not all workers cycle at once

# Logging
accesslog = "-"   # stdout
errorlog  = "-"   # stdout
loglevel  = "warning"  # only errors in production; use "info" to debug
