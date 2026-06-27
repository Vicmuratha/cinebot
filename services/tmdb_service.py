import re
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

    def now_playing(self):
        try:
            data = _cached_get(f"{self.base_url}/movie/now_playing", {"api_key": self.api_key})
            return data.get("results", [])[:12]
        except Exception as e:
            print(f"Error fetching now playing: {e}")
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

    def get_collection(self, collection_id):
        try:
            data = _cached_get(
                f"{self.base_url}/collection/{collection_id}",
                {"api_key": self.api_key}
            )
            return data
        except Exception as e:
            print(f"Error fetching collection: {e}")
            return None

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

    def get_download_links(self, tmdb_id, item_type, quality, season=1, episode=1):
        """Return a list of direct download URLs for the requested quality."""
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        links = []

        if item_type == "movie":
            # ── YTS API (indexed by IMDB ID) ─────────────────────────────────
            try:
                movie = requests.get(
                    f"{self.base_url}/movie/{tmdb_id}",
                    params={"api_key": self.api_key}, timeout=8
                ).json()
                imdb_id = movie.get("imdb_id", "")
                if imdb_id:
                    yts = requests.get(
                        "https://yts.mx/api/v2/list_movies.json",
                        params={"query_term": imdb_id, "limit": 1}, timeout=8
                    ).json()
                    torrents = yts.get("data", {}).get("movies", [{}])[0].get("torrents", [])
                    # Quality map: user picks "1080p/720p/480p", YTS has "1080p/720p/480p/2160p"
                    quality_map = {"1080p": ["1080p", "720p"], "720p": ["720p", "1080p"], "480p": ["480p", "720p"]}
                    for q in quality_map.get(quality, [quality]):
                        match = next((t for t in torrents if t.get("quality") == q), None)
                        if match:
                            links.append({"url": match["url"], "label": f"YTS {match['quality']} ({match.get('size','')}) — opens in torrent app", "direct": False})
                            break
            except Exception as e:
                print(f"YTS lookup error: {e}")

            # ── Scrape moviesapi.club for direct MP4 ─────────────────────────
            try:
                r = requests.get(f"https://moviesapi.club/movie/{tmdb_id}", headers=headers, timeout=8)
                mp4s = re.findall(r'"file"\s*:\s*"(https?://[^"]+)"', r.text)
                mp4s += re.findall(r'src=["\']([^"\']+\.mp4[^"\']*)["\']', r.text)
                for url in mp4s[:1]:
                    links.append({"url": url, "label": "Direct MP4", "direct": True})
            except Exception as e:
                print(f"moviesapi scrape error: {e}")

        else:
            # ── TV: scrape moviesapi.club ─────────────────────────────────────
            try:
                r = requests.get(f"https://moviesapi.club/tv/{tmdb_id}/{season}/{episode}", headers=headers, timeout=8)
                mp4s = re.findall(r'"file"\s*:\s*"(https?://[^"]+)"', r.text)
                mp4s += re.findall(r'src=["\']([^"\']+\.mp4[^"\']*)["\']', r.text)
                for url in mp4s[:1]:
                    links.append({"url": url, "label": "Direct MP4", "direct": True})
            except Exception as e:
                print(f"TV scrape error: {e}")

        return links
