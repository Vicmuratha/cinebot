import os

# Store TMDB API Key and Base URL
# You can override TMDB_API_KEY using environment variables
TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "da161f4b608ff2e65d2305865b36772e")
BASE_URL = "https://api.themoviedb.org/3"
