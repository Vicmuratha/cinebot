# CineBot 🎬

A cinematic movie and TV show discovery app with built-in streaming, watchlist, and a polished mobile-friendly UI.

![Python](https://img.shields.io/badge/Python-3.x-blue) ![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey) ![TMDB](https://img.shields.io/badge/Data-TMDB%20API-informational)

---

## Features

- **Browse & Discover** — Popular, Top Rated, New Releases, Trending (Today / This Week)
- **Movies & TV Shows** — Switch between content types with a single toggle
- **Search** — Instant search across movies and TV shows
- **Genre Filtering** — Filter by any genre with scrollable genre pills
- **Year Range Slider** — Narrow results to a specific release window
- **Cinematic Hero Banner** — Auto-selected featured title with Watch Now and Info buttons
- **Detail Modal** — Full cast, trailer link, quality badge, similar titles, and a Watch button
- **Streaming Player** — In-app iframe player with 4 source options (S1–S4) and a quality hint bar
- **TV Episode Picker** — Season/Episode inputs directly in the player for TV shows
- **Watchlist (My List)** — Save favourites to localStorage, with a count badge
- **Dark / Light Mode** — Persists across sessions
- **Mobile Optimised** — Full-screen player on mobile, responsive grid, touch-friendly controls

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python · Flask · Flask-CORS |
| Data | [TMDB API](https://www.themoviedb.org/documentation/api) |
| Frontend | Vanilla JS · CSS custom properties |
| Fonts / Icons | Inter (Google Fonts) · Font Awesome 6 |

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Vicmuratha/cinebot.git
cd cinebot
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. (Optional) Use your own TMDB API key

The repo ships with a working key. To use your own, get a free key at [themoviedb.org](https://www.themoviedb.org/settings/api) and set it as an environment variable:

```bash
export TMDB_API_KEY="your_key_here"
```

### 4. Run the app

```bash
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

---

## Project Structure

```
cinebot/
├── app.py                  # Flask routes
├── config.py               # API key + base URL
├── requirements.txt
├── services/
│   └── tmdb_service.py     # TMDB API wrapper (movies + TV)
├── static/
│   ├── app.js              # All frontend logic
│   └── style.css           # Design system + responsive styles
└── templates/
    └── index.html          # Single-page shell
```

---

## Streaming Sources

The player tries up to 4 embed sources in order:

| Button | Source |
|--------|--------|
| S1 | vidsrc.cc |
| S2 | autoembed.co |
| S3 | vidsrc.pro |
| S4 | moviesapi.club |

If one source doesn't load, click the next button. S1 generally has the best quality for older titles; S2 indexes new releases fastest.

---

## Sharing Publicly (temporary link)

If you have [localtunnel](https://github.com/localtunnel/localtunnel) installed:

```bash
python app.py &
lt --port 5000
```

This generates a public URL you can share with anyone while your machine is on.

---

## License

MIT
