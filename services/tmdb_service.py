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
        """Try multiple sources to find a real download link for the requested quality."""
        UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        headers = {"User-Agent": UA}
        links = []

        # Preferred quality fallback order
        Q_FALLBACK = {
            "1080p": ["1080p", "720p",  "480p"],
            "720p":  ["720p",  "480p",  "1080p"],
            "480p":  ["480p",  "720p",  "1080p"],
        }

        def pick_torrent(torrents, wanted_quality):
            for q in Q_FALLBACK.get(wanted_quality, [wanted_quality]):
                candidates = [t for t in torrents if t.get("quality") == q]
                if candidates:
                    # Prefer bluray > web > hdrip > cam
                    TYPE_RANK = {"bluray": 4, "web": 3, "hdrip": 2, "cam": 0}
                    best = sorted(candidates, key=lambda t: TYPE_RANK.get(t.get("type","").lower(), 1), reverse=True)
                    return best[0], q
            return None, None

        if item_type == "movie":
            # ── 1. Get TMDB details (title + IMDB ID) ────────────────────────
            imdb_id, movie_title, movie_year = "", "", ""
            try:
                md = requests.get(f"{self.base_url}/movie/{tmdb_id}",
                                  params={"api_key": self.api_key}, timeout=8).json()
                imdb_id    = md.get("imdb_id", "")
                movie_title = md.get("title", "")
                movie_year  = (md.get("release_date") or "")[:4]
            except Exception as e:
                print(f"TMDB detail error: {e}")

            # ── 2. YTS API — try IMDB ID first, then title ───────────────────
            def yts_search(term):
                try:
                    r = requests.get("https://yts.mx/api/v2/list_movies.json",
                                     params={"query_term": term, "limit": 5, "sort_by": "seeds"},
                                     timeout=10)
                    return r.json().get("data", {}).get("movies", [])
                except:
                    return []

            yts_movies = (yts_search(imdb_id) if imdb_id else []) or \
                         yts_search(f"{movie_title} {movie_year}".strip())

            for m in yts_movies[:3]:
                torrent, matched_q = pick_torrent(m.get("torrents", []), quality)
                if torrent:
                    links.append({
                        "url":    torrent["url"],
                        "label":  f"{matched_q} · {torrent.get('size','?')} · {m.get('title','')} — YTS",
                        "direct": False,
                        "type":   "torrent",
                    })
                    break

            # ── 3. EZTV (movies sometimes listed) ───────────────────────────
            if not links and imdb_id:
                try:
                    iid = imdb_id.replace("tt", "")
                    r = requests.get("https://eztvx.to/api/get-torrents",
                                     params={"imdb_id": iid, "limit": 10}, timeout=8)
                    for t in r.json().get("torrents", []):
                        name = t.get("filename", "").upper()
                        if quality.replace("P","") in name or quality.upper() in name:
                            links.append({
                                "url":    t.get("torrent_url", ""),
                                "label":  f"{t.get('filename','')} — EZTV",
                                "direct": False, "type": "torrent",
                            })
                            break
                except Exception as e:
                    print(f"EZTV movie error: {e}")

        else:
            # ── TV: EZTV API (indexed by IMDB ID) ────────────────────────────
            imdb_id, show_name = "", ""
            try:
                ext = requests.get(f"{self.base_url}/tv/{tmdb_id}/external_ids",
                                   params={"api_key": self.api_key}, timeout=8).json()
                imdb_id = ext.get("imdb_id", "")
                sd = requests.get(f"{self.base_url}/tv/{tmdb_id}",
                                  params={"api_key": self.api_key}, timeout=8).json()
                show_name = sd.get("name", "")
            except Exception as e:
                print(f"TV TMDB error: {e}")

            ep_str = f"S{season:02d}E{episode:02d}"

            if imdb_id:
                try:
                    iid = imdb_id.replace("tt", "")
                    r = requests.get("https://eztvx.to/api/get-torrents",
                                     params={"imdb_id": iid, "limit": 100}, timeout=10)
                    torrents = r.json().get("torrents", [])
                    # First pass: match episode + quality
                    for t in torrents:
                        name = t.get("filename", "").upper()
                        if ep_str in name and quality.upper().replace("P","") in name:
                            links.append({
                                "url":    t.get("torrent_url", ""),
                                "label":  f"{t.get('filename','')} — EZTV",
                                "direct": False, "type": "torrent",
                            })
                            break
                    # Second pass: any quality for that episode
                    if not links:
                        for t in torrents:
                            if ep_str in t.get("filename", "").upper():
                                links.append({
                                    "url":    t.get("torrent_url", ""),
                                    "label":  f"{t.get('filename','')} — EZTV",
                                    "direct": False, "type": "torrent",
                                })
                                break
                except Exception as e:
                    print(f"EZTV TV error: {e}")

            # ── YTS TV fallback (rare but some shows are there) ──────────────
            if not links and show_name:
                try:
                    r = requests.get("https://yts.mx/api/v2/list_movies.json",
                                     params={"query_term": f"{show_name} S{season:02d}E{episode:02d}",
                                             "limit": 3}, timeout=8)
                    for m in r.json().get("data", {}).get("movies", []):
                        torrent, matched_q = pick_torrent(m.get("torrents", []), quality)
                        if torrent:
                            links.append({
                                "url":    torrent["url"],
                                "label":  f"{matched_q} · {torrent.get('size','?')} — YTS",
                                "direct": False, "type": "torrent",
                            })
                            break
                except Exception as e:
                    print(f"YTS TV error: {e}")

        return links
