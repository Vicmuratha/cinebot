from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from services.tmdb_service import TMDBService

app = Flask(__name__)
# Enable Cross-Origin Resource Sharing
CORS(app)

# Initialize our TMDB API wrapper
tmdb_service = TMDBService()

@app.route("/")
def index():
    """Serve the index.html homepage."""
    return render_template("index.html")

@app.route("/genres", methods=["GET"])
def get_genres():
    """Return a list of available movie genres as JSON."""
    genres = tmdb_service.get_genres()
    return jsonify({"genres": genres}), 200

@app.route("/recommend", methods=["POST"])
def recommend():
    """
    Accept user preferences (genre_id, year_from, year_to, sort_by)
    and return a list of recommended movies as JSON.
    """
    # Parse incoming JSON payload
    data = request.json or {}

    # Extract filter parameters
    genre_id = data.get("genre_id")
    year_from = data.get("year_from")
    year_to = data.get("year_to")
    sort_by = data.get("sort_by", "popularity.desc")
    page = int(data.get("page", 1))

    movies = tmdb_service.recommend(genre_id, year_from, year_to, sort_by, page)

    return jsonify({"movies": movies}), 200

@app.route("/search", methods=["GET"])
def search():
    """
    Accept a query parameter 'q' and return search results as JSON.
    """
    query = request.args.get("q", "").strip()
    movies = tmdb_service.search(query)

    return jsonify({"movies": movies}), 200

@app.route("/trending", methods=["GET"])
def trending():
    window = request.args.get("window", "day")
    page   = int(request.args.get("page", 1))
    if window not in ("day", "week"):
        window = "day"
    movies = tmdb_service.trending(window, page)
    return jsonify({"movies": movies}), 200

@app.route("/movie/<int:movie_id>/similar", methods=["GET"])
def similar_movies(movie_id):
    movies = tmdb_service.similar_movies(movie_id)
    return jsonify({"movies": movies}), 200

@app.route("/movie/<int:movie_id>", methods=["GET"])
def get_movie(movie_id):
    movie = tmdb_service.get_movie(movie_id)
    if movie:
        return jsonify(movie), 200
    return jsonify({"error": "Movie not found"}), 404

# ── TV routes ────────────────────────────────────────────────────────────────

@app.route("/tv/genres", methods=["GET"])
def get_tv_genres():
    return jsonify({"genres": tmdb_service.get_tv_genres()}), 200

@app.route("/tv/recommend", methods=["POST"])
def tv_recommend():
    data     = request.json or {}
    genre_id = data.get("genre_id")
    year_from = data.get("year_from")
    year_to   = data.get("year_to")
    sort_by   = data.get("sort_by", "popularity.desc")
    page      = int(data.get("page", 1))
    shows = tmdb_service.discover_tv(genre_id, year_from, year_to, sort_by, page)
    return jsonify({"movies": shows}), 200

@app.route("/tv/search", methods=["GET"])
def tv_search():
    query = request.args.get("q", "").strip()
    return jsonify({"movies": tmdb_service.search_tv(query)}), 200

@app.route("/tv/trending", methods=["GET"])
def tv_trending():
    window = request.args.get("window", "day")
    page   = int(request.args.get("page", 1))
    if window not in ("day", "week"):
        window = "day"
    return jsonify({"movies": tmdb_service.trending_tv(window, page)}), 200

@app.route("/tv/<int:tv_id>", methods=["GET"])
def get_tv(tv_id):
    show = tmdb_service.get_tv(tv_id)
    if show:
        return jsonify(show), 200
    return jsonify({"error": "Show not found"}), 404

@app.route("/tv/<int:tv_id>/season/<int:season_num>", methods=["GET"])
def get_season(tv_id, season_num):
    season = tmdb_service.get_season(tv_id, season_num)
    if season:
        return jsonify(season), 200
    return jsonify({"error": "Season not found"}), 404

@app.route("/tv/<int:tv_id>/similar", methods=["GET"])
def similar_tv(tv_id):
    return jsonify({"movies": tmdb_service.similar_tv(tv_id)}), 200

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)
