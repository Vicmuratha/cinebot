import os
from dotenv import load_dotenv

# Load .env file in development (no-op in production if file doesn't exist)
load_dotenv()

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
if not TMDB_API_KEY:
    raise RuntimeError(
        "TMDB_API_KEY environment variable is not set.\n"
        "Copy .env.example to .env and add your key from https://themoviedb.org/settings/api"
    )

BASE_URL = "https://api.themoviedb.org/3"

SECRET_KEY    = os.environ.get("SECRET_KEY", os.urandom(32).hex())
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")]
DEBUG         = os.environ.get("FLASK_DEBUG", "0") == "1"
