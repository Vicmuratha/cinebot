import time
import requests
from config import TMDB_API_KEY, BASE_URL

_cache = {}
_CACHE_TTL = 300  # seconds

def _cached_get(url, params):
    key = (url, tuple(sorted((k, v) for k, v in params.items() if k != "api_key")))
    entry = _cache.get(key)
    if entry and time.time() - entry["ts"] < _CACHE_TTL:
        return entry["data"]
    r = requests.get(url, params=params)
    r.raise_for_status()
    data = r.json()
    _cache[key] = {"data": data, "ts": time.time()}
    return data

class TMDBService:
    """Service to handle all interactions with the TMDB API."""

    def __init__(self):
        self.api_key = TMDB_API_KEY
        self.base_url = BASE_URL

    def get_genres(self):
        try:
            data = _cached_get(f"{self.base_url}/genre/movie/list", {"api_key": self.api_key})
            return data.get("genres", [])
        except Exception as e:
            print(f"Error fetching genres: {e}")
            return []

    def recommend(self, genre_id, year_from, year_to, sort_by, page=1):
        try:
            params = {
                "api_key": self.api_key,
                "with_genres": genre_id if genre_id else None,
                "primary_release_date.gte": f"{year_from}-01-01" if year_from else None,
                "primary_release_date.lte": f"{year_to}-12-31" if year_to else None,
                "sort_by": sort_by if sort_by else "popularity.desc",
                "vote_count.gte": 1000 if sort_by == "vote_average.desc" else 500,
                "vote_average.gte": 6.5,
                "include_adult": "false",
                "include_video": "false",
                "page": page
            }
            params = {k: v for k, v in params.items() if v is not None}
            return _cached_get(f"{self.base_url}/discover/movie", params).get("results", [])[:20]
        except Exception as e:
            print(f"Error fetching recommendations: {e}")
            return []

    def search(self, query):
        if not query:
            return []
        try:
            data = _cached_get(
                f"{self.base_url}/search/movie",
                {"api_key": self.api_key, "query": query, "page": 1}
            )
            return data.get("results", [])[:10]
        except Exception as e:
            print(f"Error searching movies: {e}")
            return []

    def trending(self, window="day", page=1):
        try:
            data = _cached_get(
                f"{self.base_url}/trending/movie/{window}",
                {"api_key": self.api_key, "page": page}
            )
            return data.get("results", [])[:20]
        except Exception as e:
            print(f"Error fetching trending: {e}")
            return []

    def similar_movies(self, movie_id):
        try:
            data = _cached_get(
                f"{self.base_url}/movie/{movie_id}/similar",
                {"api_key": self.api_key}
            )
            return data.get("results", [])[:8]
        except Exception as e:
            print(f"Error fetching similar movies: {e}")
            return []

    def get_movie(self, movie_id):
        """Fetch detailed information for a specific movie."""
        try:
            response = requests.get(
                f"{self.base_url}/movie/{movie_id}",
                params={"api_key": self.api_key, "append_to_response": "credits,videos,release_dates"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Error fetching movie details: {e}")
            return None

    # ── TV / Series ──────────────────────────────────────────────────────────

    def get_tv_genres(self):
        try:
            return _cached_get(f"{self.base_url}/genre/tv/list", {"api_key": self.api_key}).get("genres", [])
        except Exception as e:
            print(f"Error fetching TV genres: {e}")
            return []

    def discover_tv(self, genre_id, year_from, year_to, sort_by, page=1):
        try:
            params = {
                "api_key": self.api_key,
                "with_genres": genre_id if genre_id else None,
                "first_air_date.gte": f"{year_from}-01-01" if year_from else None,
                "first_air_date.lte": f"{year_to}-12-31" if year_to else None,
                "sort_by": sort_by if sort_by else "popularity.desc",
                "vote_count.gte": 200,
                "vote_average.gte": 6.0,
                "include_adult": "false",
                "page": page,
            }
            params = {k: v for k, v in params.items() if v is not None}
            return _cached_get(f"{self.base_url}/discover/tv", params).get("results", [])[:20]
        except Exception as e:
            print(f"Error discovering TV: {e}")
            return []

    def search_tv(self, query):
        if not query:
            return []
        try:
            data = _cached_get(
                f"{self.base_url}/search/tv",
                {"api_key": self.api_key, "query": query, "page": 1}
            )
            return data.get("results", [])[:10]
        except Exception as e:
            print(f"Error searching TV: {e}")
            return []

    def trending_tv(self, window="day", page=1):
        try:
            data = _cached_get(
                f"{self.base_url}/trending/tv/{window}",
                {"api_key": self.api_key, "page": page}
            )
            return data.get("results", [])[:20]
        except Exception as e:
            print(f"Error fetching trending TV: {e}")
            return []

    def get_tv(self, tv_id):
        try:
            r = requests.get(
                f"{self.base_url}/tv/{tv_id}",
                params={"api_key": self.api_key, "append_to_response": "credits,videos,content_ratings"}
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print(f"Error fetching TV details: {e}")
            return None

    def get_season(self, tv_id, season_num):
        try:
            r = requests.get(
                f"{self.base_url}/tv/{tv_id}/season/{season_num}",
                params={"api_key": self.api_key}
            )
            r.raise_for_status()
            return r.json()
        except Exception as e:
            print(f"Error fetching season: {e}")
            return None

    def similar_tv(self, tv_id):
        try:
            data = _cached_get(f"{self.base_url}/tv/{tv_id}/similar", {"api_key": self.api_key})
            return data.get("results", [])[:8]
        except Exception as e:
            print(f"Error fetching similar TV: {e}")
            return []

    def get_person(self, person_id):
        try:
            data = _cached_get(
                f"{self.base_url}/person/{person_id}",
                {"api_key": self.api_key, "append_to_response": "movie_credits,tv_credits"}
            )
            return data
        except Exception as e:
            print(f"Error fetching person: {e}")
            return None
