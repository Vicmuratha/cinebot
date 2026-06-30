# CineBot

A cinematic movie and TV show discovery platform with built-in streaming, torrent downloads, subtitle support, and a polished mobile-first UI — installable as a PWA on Android and iOS.

![Python](https://img.shields.io/badge/Python-3.x-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-lightgrey)
![TMDB](https://img.shields.io/badge/Data-TMDB%20API-informational)
![PWA](https://img.shields.io/badge/PWA-installable-success)

---

## Features

### Discovery & Browsing
- **Movies & TV Shows** — single toggle to switch content types
- **Sort Tabs** — Popular, Top Rated, New Releases, Trending Today, Trending This Week
- **Genre Filtering** — scrollable genre pills, updates instantly
- **Year Range Slider** — narrow results to any release window (1950–2026)
- **In Theatres Row** — currently playing movies in a horizontal scroll strip
- **Continue Watching** — resumes from your last 12 played titles (stored locally)
- **Cinematic Hero Banner** — auto-selected featured title with Watch Now and Info buttons
- **Infinite Scroll** — loads more results as you scroll down

### Detail & Info
- **Detail Modal** — backdrop, rating, runtime, genres, age rating, overview
- **Full Cast Row** — clickable cast members open an actor filmography page
- **Trailer Player** — opens YouTube trailer in a separate modal
- **Quality Badge** — HD / CAM / TS / SOON based on real TMDB release date data
- **Season & Episode Browser** — full episode list with thumbnails for TV shows
- **Franchise Collections** — shows all films in a series (e.g. Marvel, Fast & Furious)
- **Similar Titles** — "More Like This" row at the bottom of every modal

### Streaming Player
- **4 Embed Sources** (S1–S4) — switch instantly if one doesn't load
- **TV Episode Picker** — season/episode inputs in the player header
- **Auto-Next Episode** — 15-second countdown card before the next episode plays
- **Picture-in-Picture** — draggable, resizable mini player that stays visible while you browse
- **Preferred Source Memory** — remembers your last used source across sessions

### Subtitle Support
- Upload `.srt` or `.vtt` subtitle files via the gear (settings) icon in the player
- Subtitles rendered as an overlay synced by wall-clock elapsed time
- **±0.5s offset buttons** for fine-tuning sync
- Remove subtitles at any time

### Downloads (Torrent)
- Select quality — **1080p, 720p, or 480p** — and the app finds the best exact-match torrent
- Sources searched in order: **The Pirate Bay → YTS → EZTV**
- Returns a `.torrent` file (opens in qBittorrent / any torrent client) and a magnet link
- Quality selection is strict — requesting 1080p will never silently return a 720p or 4K result
- Best source ranked by: **remux > BluRay > Web-DL > WEBRip > HDRip > HDTV**

### Watchlist & History
- **My List** — save any movie or show with the heart button; persists in localStorage
- **Watch History** — last 12 played items shown in the Continue Watching row
- **Recent Searches** — last 8 searches saved, shown in a dropdown on focus

### PWA — Install on Phone
- Works like a native app when installed on Android or iOS
- Android (Chrome): tap the **Install CineBot** banner that appears at the bottom
- iOS (Safari): Share → Add to Home Screen
- Service worker caches the app shell for fast load; API data always fetches fresh

### Security
- TMDB API key stays server-side — never exposed to the browser
- All external data (torrent names, titles) inserted via `textContent`, never `innerHTML`
- Flask debug mode disabled by default (opt-in via `FLASK_DEBUG=1`)
- Download links use `rel="noopener noreferrer"` on all external anchors

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend server | Python 3, Flask 3.0, Flask-CORS |
| Movie/TV metadata | [TMDB API](https://www.themoviedb.org/documentation/api) |
| Images | `image.tmdb.org` CDN |
| Streaming embeds | embed.su, vidlink.pro, vidsrc.xyz, 2embed.cc |
| Torrent search | apibay.org (Pirate Bay), yts.mx, eztvx.to |
| Torrent delivery | itorrents.org (.torrent cache), magnet links |
| Frontend | Vanilla JavaScript (ES2020), HTML5, CSS3 |
| Fonts | Plus Jakarta Sans (Google Fonts) |
| Icons | Font Awesome 6.4 |
| PWA | Service Worker + Web App Manifest |
| Local storage | Browser `localStorage` |

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

## Access from Your Phone

Your PC and phone must be on the **same Wi-Fi network**.

```bash
# Find your PC's local IP
hostname -I
```

Then on your phone open: `http://<your-pc-ip>:5000`

The server binds to `0.0.0.0` so it is reachable from any device on the network.

---

## Project Structure

```
cinebot/
├── app.py                  # Flask routes (API endpoints)
├── config.py               # TMDB API key + base URL
├── requirements.txt        # Python dependencies
├── services/
│   └── tmdb_service.py     # TMDB wrapper + download search logic
├── static/
│   ├── app.js              # All frontend logic (~2100 lines)
│   ├── style.css           # Design system + responsive styles
│   ├── sw.js               # Service worker (PWA caching)
│   ├── manifest.json       # PWA manifest (name, icons, theme)
│   └── favicon.svg         # App icon
└── templates/
    └── index.html          # Single-page HTML shell
```

---

## Streaming Sources

| Button | Domain | Best for |
|---|---|---|
| S1 | embed.su | Best overall quality, large library |
| S2 | vidlink.pro | New releases, fast indexing |
| S3 | vidsrc.xyz | Wide TV show coverage |
| S4 | 2embed.cc | Reliable fallback |

If one source doesn't load, click the next button (S2, S3, S4).

---

## Download Flow

1. Open a movie or TV show detail modal
2. Click **Download** → select quality (1080p / 720p / 480p)
3. Backend searches Pirate Bay by IMDB ID, then by title + year
4. Falls back to YTS (movies) or EZTV (TV shows) if Pirate Bay has no results
5. A `.torrent` file downloads automatically to your PC
6. Open it in qBittorrent (or any torrent client) to start the video download

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `/` | Focus the search bar |
| `Escape` | Close player → trailer → modal (in that order) |

---

## Sharing Publicly (temporary link)

If you have [localtunnel](https://github.com/localtunnel/localtunnel) installed:

```bash
python app.py &
lt --port 5000
```

This generates a public HTTPS URL you can share while your machine is running.

---

## License

MIT
