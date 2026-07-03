from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from flask_compress import Compress
from services.tmdb_service import TMDBService
import subprocess, config

app = Flask(__name__)
app.secret_key = config.SECRET_KEY

try:
    _version = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"],
                                        stderr=subprocess.DEVNULL).decode().strip()
except Exception:
    _version = "1"

@app.context_processor
def inject_version():
    return {"v": _version}

# Gzip all text responses — typically 60-80% smaller
Compress(app)

# Restrict CORS to configured origins (set ALLOWED_ORIGINS env var)
CORS(app, origins=config.ALLOWED_ORIGINS)

tmdb_service = TMDBService()

# ── Security headers on every response ───────────────────────────────────────
@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"]  = "nosniff"
    response.headers["X-Frame-Options"]         = "SAMEORIGIN"
    response.headers["Referrer-Policy"]         = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"]      = "geolocation=(), microphone=(), camera=()"
    # Cache static assets aggressively; don't cache API responses
    if request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=604800, immutable"
    elif request.path.startswith("/") and request.method in ("GET", "HEAD") and not request.path.startswith("/static/"):
        if response.content_type and "json" in response.content_type:
            response.headers["Cache-Control"] = "no-store"
    return response

# ── Error handlers ────────────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(e):
    if request.accept_mimetypes.accept_html:
        return render_template("index.html"), 404
    return jsonify({"error": "not found"}), 404

@app.errorhandler(429)
def too_many(e):
    return jsonify({"error": "too many requests — slow down"}), 429

@app.errorhandler(500)
def server_error(e):
    app.logger.error("500 error: %s", e)
    return jsonify({"error": "internal server error"}), 500

# ── Health check (used by load balancers and uptime monitors) ─────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200

# ── Pages ─────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

# ── Movie routes ──────────────────────────────────────────────────────────────
@app.route("/genres", methods=["GET"])
def get_genres():
    return jsonify({"genres": tmdb_service.get_genres()}), 200

@app.route("/recommend", methods=["POST"])
def recommend():
    data      = request.json or {}
    genre_id  = data.get("genre_id")
    year_from = data.get("year_from")
    year_to   = data.get("year_to")
    sort_by   = data.get("sort_by", "popularity.desc")
    page      = int(data.get("page", 1))
    movies    = tmdb_service.recommend(genre_id, year_from, year_to, sort_by, page)
    return jsonify({"movies": movies}), 200

@app.route("/search", methods=["GET"])
def search():
    query  = request.args.get("q", "").strip()
    movies = tmdb_service.search(query)
    return jsonify({"movies": movies}), 200

@app.route("/trending", methods=["GET"])
def trending():
    window = request.args.get("window", "day")
    page   = int(request.args.get("page", 1))
    if window not in ("day", "week"):
        window = "day"
    return jsonify({"movies": tmdb_service.trending(window, page)}), 200

@app.route("/now-playing", methods=["GET"])
def now_playing():
    return jsonify({"movies": tmdb_service.now_playing()}), 200

@app.route("/movie/<int:movie_id>/similar", methods=["GET"])
def similar_movies(movie_id):
    return jsonify({"movies": tmdb_service.similar_movies(movie_id)}), 200

@app.route("/movie/<int:movie_id>", methods=["GET"])
def get_movie(movie_id):
    movie = tmdb_service.get_movie(movie_id)
    if movie:
        return jsonify(movie), 200
    return jsonify({"error": "Movie not found"}), 404

# ── TV routes ─────────────────────────────────────────────────────────────────
@app.route("/tv/genres", methods=["GET"])
def get_tv_genres():
    return jsonify({"genres": tmdb_service.get_tv_genres()}), 200

@app.route("/tv/recommend", methods=["POST"])
def tv_recommend():
    data      = request.json or {}
    genre_id  = data.get("genre_id")
    year_from = data.get("year_from")
    year_to   = data.get("year_to")
    sort_by   = data.get("sort_by", "popularity.desc")
    page      = int(data.get("page", 1))
    shows     = tmdb_service.discover_tv(genre_id, year_from, year_to, sort_by, page)
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

@app.route("/collection/<int:collection_id>", methods=["GET"])
def get_collection(collection_id):
    data = tmdb_service.get_collection(collection_id)
    if data:
        return jsonify(data), 200
    return jsonify({"error": "Collection not found"}), 404

# ── Anime routes ──────────────────────────────────────────────────────────────
@app.route("/anime/recommend", methods=["POST"])
def anime_recommend():
    data      = request.json or {}
    year_from = data.get("year_from")
    year_to   = data.get("year_to")
    sort_by   = data.get("sort_by", "popularity.desc")
    page      = int(data.get("page", 1))
    results   = tmdb_service.discover_anime(year_from, year_to, sort_by, page)
    return jsonify({"movies": results}), 200

@app.route("/anime/search", methods=["GET"])
def anime_search():
    query = request.args.get("q", "").strip()
    return jsonify({"movies": tmdb_service.search_anime(query)}), 200

@app.route("/anime/trending", methods=["GET"])
def anime_trending():
    window = request.args.get("window", "day")
    page   = int(request.args.get("page", 1))
    if window not in ("day", "week"):
        window = "day"
    return jsonify({"movies": tmdb_service.trending_anime(window, page)}), 200

# ── People ────────────────────────────────────────────────────────────────────
@app.route("/person/<int:person_id>", methods=["GET"])
def get_person(person_id):
    person = tmdb_service.get_person(person_id)
    if person:
        return jsonify(person), 200
    return jsonify({"error": "Person not found"}), 404

# ── Downloads ─────────────────────────────────────────────────────────────────
@app.route("/download", methods=["GET"])
def get_download():
    tmdb_id   = request.args.get("tmdb_id", type=int)
    item_type = request.args.get("type", "movie")
    quality   = request.args.get("quality", "1080p")
    season    = request.args.get("season", 1, type=int)
    episode   = request.args.get("episode", 1, type=int)
    if not tmdb_id:
        return jsonify({"error": "tmdb_id required"}), 400
    links = tmdb_service.get_download_links(tmdb_id, item_type, quality, season, episode)
    return jsonify({"links": links}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=config.DEBUG)
