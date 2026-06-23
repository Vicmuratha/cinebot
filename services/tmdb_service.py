import requests
from config import TMDB_API_KEY, BASE_URL

class TMDBService:
    """Service to handle all interactions with the TMDB API."""
    
    def __init__(self):
        self.api_key = TMDB_API_KEY
        self.base_url = BASE_URL

    def get_genres(self):
        """Fetch all available movie genres from TMDB."""
        try:
            # Send GET request to fetch available movie genres
            response = requests.get(
                f"{self.base_url}/genre/movie/list",
                params={"api_key": self.api_key}
            )
            response.raise_for_status()
            
            # Return list of genre dictionaries
            return response.json().get("genres", [])
        except Exception as e:
            print(f"Error fetching genres: {e}")
            return []

    def recommend(self, genre_id, year_from, year_to, sort_by, page=1):
        """Return up to 20 movies based on genre, release years, sorting, and page."""
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
            response = requests.get(f"{self.base_url}/discover/movie", params=params)
            response.raise_for_status()
            return response.json().get("results", [])[:20]
        except Exception as e:
            print(f"Error fetching recommendations: {e}")
            return []

    def search(self, query):
        """Search movies by title keyword."""
        if not query:
            return []
            
        try:
            # Search for movies matching the query
            response = requests.get(
                f"{self.base_url}/search/movie",
                params={"api_key": self.api_key, "query": query, "page": 1}
            )
            response.raise_for_status()
            
            results = response.json().get("results", [])
            # Return the top 10 search results
            return results[:10]
        except Exception as e:
            print(f"Error searching movies: {e}")
            return []

    def trending(self, window="day", page=1):
        """Fetch trending movies for the given time window (day or week)."""
        try:
            response = requests.get(
                f"{self.base_url}/trending/movie/{window}",
                params={"api_key": self.api_key, "page": page}
            )
            response.raise_for_status()
            return response.json().get("results", [])[:20]
        except Exception as e:
            print(f"Error fetching trending: {e}")
            return []

    def similar_movies(self, movie_id):
        """Fetch movies similar to the given movie."""
        try:
            response = requests.get(
                f"{self.base_url}/movie/{movie_id}/similar",
                params={"api_key": self.api_key}
            )
            response.raise_for_status()
            return response.json().get("results", [])[:8]
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
            r = requests.get(f"{self.base_url}/genre/tv/list", params={"api_key": self.api_key})
            r.raise_for_status()
            return r.json().get("genres", [])
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
            r = requests.get(f"{self.base_url}/discover/tv", params=params)
            r.raise_for_status()
            return r.json().get("results", [])[:20]
        except Exception as e:
            print(f"Error discovering TV: {e}")
            return []

    def search_tv(self, query):
        if not query:
            return []
        try:
            r = requests.get(
                f"{self.base_url}/search/tv",
                params={"api_key": self.api_key, "query": query, "page": 1}
            )
            r.raise_for_status()
            return r.json().get("results", [])[:10]
        except Exception as e:
            print(f"Error searching TV: {e}")
            return []

    def trending_tv(self, window="day", page=1):
        try:
            r = requests.get(
                f"{self.base_url}/trending/tv/{window}",
                params={"api_key": self.api_key, "page": page}
            )
            r.raise_for_status()
            return r.json().get("results", [])[:20]
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
            r = requests.get(
                f"{self.base_url}/tv/{tv_id}/similar",
                params={"api_key": self.api_key}
            )
            r.raise_for_status()
            return r.json().get("results", [])[:8]
        except Exception as e:
            print(f"Error fetching similar TV: {e}")
            return []
