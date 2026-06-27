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
        """Search Pirate Bay + YTS + EZTV for the best torrent download link."""
        from urllib.parse import quote
        UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
              "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36")
        headers = {"User-Agent": UA}

        TRACKERS = [
            "udp://tracker.opentrackr.org:1337/announce",
            "udp://tracker.leechers-paradise.org:6969/announce",
            "udp://tracker.coppersurfer.tk:6969/announce",
            "udp://9.rarbg.to:2920/announce",
            "udp://p4p.arenabg.com:1337/announce",
        ]

        def make_magnet(info_hash, name):
            tr = "&tr=".join(quote(t) for t in TRACKERS)
            return f"magnet:?xt=urn:btih:{info_hash.lower()}&dn={quote(name)}&tr={tr}"

        def fmt_size(b):
            b = int(b or 0)
            if b >= 1024**3: return f"{b/1024**3:.1f} GB"
            if b >= 1024**2: return f"{b/1024**2:.0f} MB"
            return f"{b/1024:.0f} KB"

        # ── The Pirate Bay API (apibay.org) ──────────────────────────────────
        def tpb_search(query):
            for base in ["https://apibay.org", "https://apibay.org"]:
                try:
                    r = requests.get(f"{base}/q.php",
                                     params={"q": query, "cat": "0"},
                                     headers=headers, timeout=12)
                    data = r.json()
                    if data and not (len(data) == 1 and data[0].get("name") == "No results"):
                        return data
                except Exception as e:
                    print(f"TPB error [{query}]: {e}")
            return []

        def best_tpb_result(results, wanted_quality):
            """Score and return the best torrent for the requested quality."""
            Q_TERMS = {
                "1080p": ["2160p","4k","uhd","1080p","1080","bluray","blu-ray","bdrip","remux"],
                "720p":  ["720p","720","hdrip","webrip","web-dl","hdtv"],
                "480p":  ["480p","480","dvdrip","dvdscr","sdtv"],
            }
            priority = Q_TERMS.get(wanted_quality, ["1080p"])

            def score(t):
                name     = t.get("name","").lower()
                seeders  = int(t.get("seeders", 0))
                q_score  = next((len(priority)-i for i,term in enumerate(priority) if term in name), 0)
                return (q_score, seeders)

            return max(results, key=score) if results else None

        def tpb_to_link(t):
            h   = t.get("info_hash","").upper()
            n   = t.get("name","Unknown")
            s   = int(t.get("seeders", 0))
            sz  = fmt_size(t.get("size", 0))
            return {
                "url":       f"https://itorrents.org/torrent/{h}.torrent",
                "magnet":    make_magnet(h, n),
                "label":     f"{n} · {sz} · {s} seeds — PirateBay",
                "direct":    False,
                "type":      "torrent",
                "info_hash": h,
                "seeders":   s,
            }

        # ── YTS (movies — very clean 1080p/720p encodes) ──────────────────────
        def yts_best(term, wanted_quality):
            try:
                movies = requests.get(
                    "https://yts.mx/api/v2/list_movies.json",
                    params={"query_term": term, "limit": 5, "sort_by": "seeds"},
                    headers=headers, timeout=10
                ).json().get("data",{}).get("movies",[])
            except:
                return None
            ORDER = {"1080p":["2160p","1080p","720p","480p"],
                     "720p": ["720p","1080p","480p"],
                     "480p": ["480p","720p","1080p"]}
            TYPE_R = {"bluray":4,"web":3,"hdrip":2}
            for m in movies:
                for q in ORDER.get(wanted_quality, [wanted_quality]):
                    cands = [t for t in m.get("torrents",[]) if t.get("quality")==q]
                    if cands:
                        best = max(cands, key=lambda t: TYPE_R.get(t.get("type","").lower(),1))
                        return {
                            "url":    best["url"],
                            "magnet": None,
                            "label":  f"{m.get('title','')} {best['quality']} · {best.get('size','?')} — YTS",
                            "direct": False, "type": "torrent",
                        }
            return None

        # ── EZTV (TV shows by IMDB ID) ────────────────────────────────────────
        def eztv_best(imdb_id, ep_str, wanted_quality):
            try:
                iid = imdb_id.replace("tt","")
                torrents = requests.get(
                    "https://eztvx.to/api/get-torrents",
                    params={"imdb_id": iid, "limit": 100},
                    headers=headers, timeout=10
                ).json().get("torrents",[])
            except Exception as e:
                print(f"EZTV error: {e}")
                return None
            ep_up = ep_str.upper()
            q_str = wanted_quality.upper()
            # pass 1: episode + quality
            for t in torrents:
                n = t.get("filename","").upper()
                if ep_up in n and q_str in n:
                    return {"url": t.get("torrent_url",""), "magnet": t.get("magnet_url",""),
                            "label": f"{t.get('filename','')} — EZTV", "direct": False, "type": "torrent"}
            # pass 2: episode any quality
            for t in torrents:
                if ep_up in t.get("filename","").upper():
                    return {"url": t.get("torrent_url",""), "magnet": t.get("magnet_url",""),
                            "label": f"{t.get('filename','')} — EZTV", "direct": False, "type": "torrent"}
            return None

        # ═════════════════════════ MAIN LOGIC ═══════════════════════════════
        if item_type == "movie":
            imdb_id = movie_title = movie_year = ""
            try:
                md = requests.get(f"{self.base_url}/movie/{tmdb_id}",
                                  params={"api_key": self.api_key}, timeout=8).json()
                imdb_id     = md.get("imdb_id","")
                movie_title = md.get("title","")
                movie_year  = (md.get("release_date") or "")[:4]
            except Exception as e:
                print(f"TMDB error: {e}")

            print(f"[DL] movie '{movie_title}' ({movie_year}) imdb={imdb_id} quality={quality}")

            # 1. Pirate Bay by IMDB ID (most precise)
            if imdb_id:
                res = tpb_search(imdb_id)
                if res:
                    best = best_tpb_result(res, quality)
                    if best: return [tpb_to_link(best)]

            # 2. Pirate Bay by title + year + quality
            for q in [f"{movie_title} {movie_year} {quality}",
                      f"{movie_title} {movie_year}",
                      movie_title]:
                if not q.strip(): continue
                res = tpb_search(q.strip())
                if res:
                    best = best_tpb_result(res, quality)
                    if best: return [tpb_to_link(best)]

            # 3. YTS (great for popular movies)
            for term in ([imdb_id] if imdb_id else []) + [f"{movie_title} {movie_year}".strip(), movie_title]:
                if not term: continue
                link = yts_best(term, quality)
                if link: return [link]

        else:  # TV
            imdb_id = show_name = ""
            try:
                ext = requests.get(f"{self.base_url}/tv/{tmdb_id}/external_ids",
                                   params={"api_key": self.api_key}, timeout=8).json()
                imdb_id  = ext.get("imdb_id","")
                sd       = requests.get(f"{self.base_url}/tv/{tmdb_id}",
                                        params={"api_key": self.api_key}, timeout=8).json()
                show_name = sd.get("name","")
            except Exception as e:
                print(f"TV TMDB error: {e}")

            ep_str = f"S{season:02d}E{episode:02d}"
            print(f"[DL] TV '{show_name}' {ep_str} imdb={imdb_id} quality={quality}")

            # 1. Pirate Bay — title + episode
            for q in [f"{show_name} {ep_str} {quality}",
                      f"{show_name} {ep_str}",
                      f"{imdb_id} {ep_str}" if imdb_id else ""]:
                if not q.strip(): continue
                res = tpb_search(q.strip())
                if res:
                    ep_res = [r for r in res if ep_str.lower() in r.get("name","").lower()]
                    pool   = ep_res if ep_res else res
                    best   = best_tpb_result(pool, quality)
                    if best: return [tpb_to_link(best)]

            # 2. EZTV by IMDB ID
            if imdb_id:
                link = eztv_best(imdb_id, ep_str, quality)
                if link: return [link]

        print(f"[DL] no results found")
        return []
