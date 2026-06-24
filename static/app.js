document.addEventListener("DOMContentLoaded", () => {

    // ─── State ───
    let heroMovieId     = null;
    let heroTitle       = null;
    let heroQuality     = null;
    let heroBackdrop    = null;
    let currentPage     = 1;
    let isLoadingMore   = false;
    let isSearchMode    = false;
    let isWatchlistMode = false;
    let isTrendingMode  = false;
    let contentType     = "movie";  // "movie" | "tv"
    let filters = { genre_id: "", year_from: "1990", year_to: "2026", sort_by: "popularity.desc" };

    // ─── DOM refs ───
    const resultsGrid  = document.getElementById("results-grid");
    const searchInput  = document.getElementById("search");
    const heroSection  = document.getElementById("hero");
    const heroImg      = document.getElementById("hero-img");
    const heroContent  = document.getElementById("hero-content");
    const loadMoreWrap = document.getElementById("load-more-wrap");
    const loadMoreBtn  = document.getElementById("load-more-btn");
    const modal        = document.getElementById("movie-modal");
    const modalBody    = document.getElementById("modal-body");
    const closeBtn     = document.querySelector(".close-btn");
    const yearFrom     = document.getElementById("year-from");
    const yearTo       = document.getElementById("year-to");
    const yearFromVal  = document.getElementById("year-from-val");
    const yearToVal    = document.getElementById("year-to-val");
    const typeBtns     = document.querySelectorAll(".type-btn");
    const genrePills   = document.getElementById("genre-pills");
    const searchClear  = document.getElementById("search-clear");
    const scrollTopBtn = document.getElementById("scroll-top");
    const searchSuggestions = document.getElementById("search-suggestions");

    // ─── Scroll header ───
    const headerEl = document.querySelector("header");
    window.addEventListener("scroll", () => {
        headerEl.classList.toggle("scrolled", window.scrollY > 20);
    }, { passive: true });

    // ─── Scroll to top ───
    window.addEventListener("scroll", () => {
        scrollTopBtn.style.display = window.scrollY > 500 ? "flex" : "none";
    }, { passive: true });
    scrollTopBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

    // ─── Search clear ───
    searchClear.addEventListener("click", () => {
        searchInput.value = "";
        searchClear.style.display = "none";
        searchInput.focus();
        isSearchMode    = false;
        isWatchlistMode = false;
        fetchRecommendations();
    });

    // ─── Watch History / Continue Watching ───
    const nowPlayingSection = document.getElementById("now-playing-section");
    const nowPlayingRow     = document.getElementById("now-playing-row");
    const continueSection   = document.getElementById("continue-section");
    const continueRow       = document.getElementById("continue-row");

    function loadNowPlaying() {
        fetch("/now-playing")
            .then(r => r.ok ? r.json() : { movies: [] })
            .then(({ movies }) => {
                if (!movies.length) return;
                nowPlayingSection.style.display = "block";
                nowPlayingRow.innerHTML = "";
                movies.forEach(m => {
                    const item = document.createElement("div");
                    item.className = "np-card";
                    if (m.poster_path) {
                        const img = document.createElement("img");
                        img.src = `https://image.tmdb.org/t/p/w185${m.poster_path}`;
                        img.alt = m.title || ""; img.loading = "lazy";
                        item.appendChild(img);
                    } else {
                        const ph = document.createElement("div");
                        ph.className = "np-card-ph";
                        ph.innerHTML = '<i class="fa-solid fa-film"></i>';
                        item.appendChild(ph);
                    }
                    const label = document.createElement("span");
                    label.className = "np-card-title";
                    label.textContent = m.title || "";
                    item.appendChild(label);
                    item.addEventListener("click", () => fetchDetails(m.id, "movie"));
                    nowPlayingRow.appendChild(item);
                });
            })
            .catch(() => {});
    }

    function getHistory() { return JSON.parse(localStorage.getItem("watchHistory") || "[]"); }

    function saveToHistory(entry) {
        let hist = getHistory().filter(h => !(h.id === entry.id && h.type === entry.type));
        hist.unshift(entry);
        hist = hist.slice(0, 12);
        localStorage.setItem("watchHistory", JSON.stringify(hist));
        renderContinueRow();
    }

    function renderContinueRow() {
        const hist = getHistory();
        if (!hist.length) { continueSection.style.display = "none"; return; }
        continueSection.style.display = "block";
        continueRow.innerHTML = "";
        hist.forEach(h => {
            const card = document.createElement("div");
            card.className = "continue-card";
            if (h.backdrop) {
                const img = document.createElement("img");
                img.src = h.backdrop; img.alt = h.title; img.loading = "lazy";
                card.appendChild(img);
            } else {
                const ph = document.createElement("div");
                ph.className = "continue-card-ph";
                ph.innerHTML = '<i class="fa-solid fa-film"></i>';
                card.appendChild(ph);
            }
            const overlay = document.createElement("div");
            overlay.className = "continue-play-overlay";
            overlay.innerHTML = '<i class="fa-solid fa-play"></i>';
            card.appendChild(overlay);
            const info = document.createElement("div");
            info.className = "continue-card-info";
            const t = document.createElement("div");
            t.className = "continue-card-title"; t.textContent = h.title;
            const s = document.createElement("div");
            s.className = "continue-card-sub";
            s.textContent = h.type === "tv" ? `S${h.season} E${h.episode}` : (h.year || "");
            info.append(t, s);
            card.appendChild(info);
            card.addEventListener("click", () => {
                openPlayer(h.id, h.title, h.quality, h.backdrop, h.type, h.season, h.episode);
            });
            continueRow.appendChild(card);
        });
    }

    document.getElementById("clear-history").addEventListener("click", () => {
        localStorage.removeItem("watchHistory");
        renderContinueRow();
        showToast("Watch history cleared");
    });

    renderContinueRow();

    // ─── Recent Searches ───
    const MAX_RECENT = 8;
    function getRecentSearches() { return JSON.parse(localStorage.getItem("recentSearches") || "[]"); }
    function saveRecentSearch(q) {
        if (!q) return;
        let list = getRecentSearches().filter(s => s !== q);
        list.unshift(q);
        if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
        localStorage.setItem("recentSearches", JSON.stringify(list));
    }
    function deleteRecentSearch(q) {
        const list = getRecentSearches().filter(s => s !== q);
        localStorage.setItem("recentSearches", JSON.stringify(list));
    }
    function showSuggestions() {
        const list = getRecentSearches();
        if (!list.length) { searchSuggestions.style.display = "none"; return; }
        searchSuggestions.innerHTML = "";
        const header = document.createElement("div");
        header.className = "suggestions-header";
        header.textContent = "Recent";
        searchSuggestions.appendChild(header);
        list.forEach(q => {
            const row = document.createElement("div");
            row.className = "suggestion-row";
            const icon = document.createElement("i");
            icon.className = "fa-solid fa-clock-rotate-left suggestion-icon";
            const label = document.createElement("span");
            label.className = "suggestion-text";
            label.textContent = q;
            const del = document.createElement("button");
            del.className = "suggestion-del";
            del.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            del.addEventListener("click", e => {
                e.stopPropagation();
                deleteRecentSearch(q);
                showSuggestions();
            });
            row.append(icon, label, del);
            row.addEventListener("click", () => {
                searchInput.value = q;
                searchClear.style.display = "flex";
                hideSuggestions();
                searchInput.dispatchEvent(new Event("input"));
            });
            searchSuggestions.appendChild(row);
        });
        searchSuggestions.style.display = "block";
    }
    function hideSuggestions() { searchSuggestions.style.display = "none"; }

    searchInput.addEventListener("focus", () => { if (!searchInput.value) showSuggestions(); });
    searchInput.addEventListener("blur", () => setTimeout(hideSuggestions, 180));
    document.addEventListener("click", e => { if (!e.target.closest(".search-container")) hideSuggestions(); });

    // ─── Watchlist ───
    function getWatchlist() { return JSON.parse(localStorage.getItem("watchlist") || "[]"); }
    function isInWatchlist(id) { return getWatchlist().some(m => m.id === id); }

    function toggleWatchlist(movie, btn) {
        let list = getWatchlist();
        if (isInWatchlist(movie.id)) {
            list = list.filter(m => m.id !== movie.id);
            btn.className = "heart-btn";
            btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
            showToast("Removed from My List");
            if (isWatchlistMode) renderWatchlist();
        } else {
            list.push({
                id: movie.id, title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average,
                release_date: movie.release_date,
                overview: movie.overview
            });
            btn.className = "heart-btn active";
            btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
            showToast("Added to My List");
        }
        localStorage.setItem("watchlist", JSON.stringify(list));
        updateWatchlistBadge();
    }

    function renderWatchlist() {
        setHero(false);
        loadMoreWrap.style.display = "none";
        resultsGrid.innerHTML = "";
        const list = getWatchlist();
        if (!list.length) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-heart fa-3x"></i>
                    <h2>Your list is empty</h2>
                    <p>Click the heart on any movie to save it here.</p>
                </div>`;
            return;
        }
        list.forEach((m, i) => resultsGrid.appendChild(createCard(m, i)));
    }

    // ─── Watchlist badge ───
    function updateWatchlistBadge() {
        const count = getWatchlist().length;
        const pill  = document.querySelector(".my-list-pill");
        if (!pill) return;
        let badge = pill.querySelector(".wl-count");
        if (count > 0) {
            if (!badge) { badge = document.createElement("span"); badge.className = "wl-count"; pill.appendChild(badge); }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    }

    // ─── Genre pills ───
    function loadGenres() {
        const endpoint = contentType === "tv" ? "/tv/genres" : "/genres";
        fetch(endpoint)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(({ genres }) => {
                // Remove all dynamic genre pills, keep All + My List
                [...genrePills.querySelectorAll(".genre-pill:not([data-id=''][data-keep])")]
                    .forEach(p => { if (p.dataset.id !== "" && p.dataset.id !== "watchlist") p.remove(); });
                // Re-insert dynamic ones
                genres.forEach(g => {
                    const btn = document.createElement("button");
                    btn.className   = "genre-pill";
                    btn.dataset.id  = g.id;
                    btn.textContent = g.name;
                    genrePills.appendChild(btn);
                });
            })
            .catch(console.error);
    }
    loadGenres();

    genrePills.addEventListener("click", e => {
        const pill = e.target.closest(".genre-pill");
        if (!pill) return;
        document.querySelectorAll(".genre-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");

        if (pill.dataset.id === "watchlist") {
            isWatchlistMode = true;
            isSearchMode = false;
            searchInput.value = "";
            searchClear.style.display = "none";
            renderWatchlist();
            return;
        }
        isWatchlistMode = false;
        filters.genre_id = pill.dataset.id;
        fetchRecommendations();
    });

    // ─── Content type toggle (Movies / TV) ───
    typeBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.dataset.type === contentType) return;
            contentType = btn.dataset.type;
            typeBtns.forEach(b => b.classList.toggle("active", b === btn));
            // Reset genre + sort
            filters.genre_id = "";
            filters.sort_by  = "popularity.desc";
            document.querySelectorAll(".sort-tab").forEach(t => t.classList.toggle("active", t.dataset.sort === "popularity.desc"));
            document.querySelectorAll(".genre-pill").forEach(p => p.classList.toggle("active", p.dataset.id === ""));
            isSearchMode    = false;
            isWatchlistMode = false;
            searchInput.value = "";
            searchInput.placeholder = contentType === "tv" ? "Search TV shows…" : "Search movies…";
            searchClear.style.display = "none";
            loadGenres();
            fetchRecommendations();
            // "In Theatres" is movies-only
            if (contentType === "movie") loadNowPlaying();
            else nowPlayingSection.style.display = "none";
        });
    });

    // ─── Sort tabs ───
    document.getElementById("sort-tabs").addEventListener("click", e => {
        const tab = e.target.closest(".sort-tab");
        if (!tab) return;
        document.querySelectorAll(".sort-tab").forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        // TV uses first_air_date instead of primary_release_date
        filters.sort_by = (contentType === "tv" && tab.dataset.tvSort) ? tab.dataset.tvSort : tab.dataset.sort;
        isWatchlistMode = false;
        document.querySelectorAll(".genre-pill").forEach(p => {
            p.classList.toggle("active", String(p.dataset.id) === String(filters.genre_id || ""));
        });
        fetchRecommendations();
    });

    // ─── Year sliders (debounced) ───
    let yearTimer;
    function syncYear() {
        if (parseInt(yearFrom.value) > parseInt(yearTo.value)) yearTo.value = yearFrom.value;
        if (parseInt(yearTo.value)   < parseInt(yearFrom.value)) yearFrom.value = yearTo.value;
        yearFromVal.textContent = yearFrom.value;
        yearToVal.textContent   = yearTo.value;
        filters.year_from = yearFrom.value;
        filters.year_to   = yearTo.value;
        clearTimeout(yearTimer);
        yearTimer = setTimeout(() => { if (!isWatchlistMode) fetchRecommendations(); }, 700);
    }
    yearFrom.addEventListener("input", syncYear);
    yearTo.addEventListener("input",   syncYear);

    // ─── Reset ───
    document.getElementById("reset-filters").addEventListener("click", () => {
        filters = { genre_id: "", year_from: "1990", year_to: "2026", sort_by: "popularity.desc" };
        yearFrom.value = "1990"; yearTo.value = "2026";
        yearFromVal.textContent = "1990"; yearToVal.textContent = "2026";
        document.querySelectorAll(".genre-pill").forEach(p => p.classList.toggle("active", p.dataset.id === ""));
        document.querySelectorAll(".sort-tab").forEach(t => t.classList.toggle("active", t.dataset.sort === "popularity.desc"));
        searchInput.value = "";
        searchClear.style.display = "none";
        isSearchMode    = false;
        isWatchlistMode = false;
        fetchRecommendations();
    });

    // ─── Helpers ───
    function buildStars(score) {
        const f = Math.round(score / 2);
        return '<i class="fa-solid fa-star"></i>'.repeat(f) +
               '<i class="fa-regular fa-star"></i>'.repeat(5 - f);
    }

    // Returns "hd" | "ts" | "cam" | "soon" | null
    // TMDB release_dates (types: 3=Theatrical 4=Digital 5=Physical) are used only to
    // positively confirm HD or TS; if they give no home-video signal we fall through to
    // the date estimate so cards and modal stay consistent.
    function qualityFromDate(releaseDate, releaseDatesArr) {
        const now = new Date();

        if (releaseDatesArr && releaseDatesArr.length) {
            const region = releaseDatesArr.find(r => r.iso_3166_1 === "US")
                        || releaseDatesArr.find(r => r.iso_3166_1 === "GB")
                        || releaseDatesArr[0];
            if (region) {
                const rdList = region.release_dates || [];
                // Past home-video release confirmed → HD (most reliable signal)
                if (rdList.some(d => (d.type === 4 || d.type === 5) && new Date(d.release_date) <= now))
                    return "hd";
                // Currently in theaters AND a home-video date is already scheduled → TS
                const inTheaters = rdList.some(d => d.type === 3 && new Date(d.release_date) <= now);
                const hvScheduled = rdList.some(d => (d.type === 4 || d.type === 5) && new Date(d.release_date) > now);
                if (inTheaters && hvScheduled) return "ts";
                // No home-video data in TMDB at all → fall through to date estimate
                // (avoids wrongly marking old movies as CAM when TMDB data is incomplete)
            }
        }

        if (!releaseDate) return null;
        const released = new Date(releaseDate);
        if (released > now) return "soon";
        const days = (now - released) / 86_400_000;
        if (days > 90) return "hd";
        if (days > 45) return "ts";
        return "cam";
    }

    const QUALITY_LABELS = { hd: "HD", ts: "HD-TS", cam: "CAM", soon: "Soon" };

    function showSkeletons(n = 10) {
        resultsGrid.innerHTML = "";
        loadMoreWrap.style.display = "none";
        for (let i = 0; i < n; i++) {
            const div = document.createElement("div");
            div.className = "movie-card skeleton-card";
            resultsGrid.appendChild(div);
        }
    }

    function showToast(msg) {
        const el = document.createElement("div");
        el.className = "toast";
        el.textContent = msg;
        document.getElementById("toast-container").appendChild(el);
        setTimeout(() => {
            el.style.animation = "toastOut 0.28s ease forwards";
            setTimeout(() => el.remove(), 280);
        }, 3200);
    }

    function showError(msg) {
        setHero(false);
        resultsGrid.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-circle-exclamation fa-3x"></i>
                <h2>Nothing here</h2>
                <p>${msg}</p>
            </div>`;
        loadMoreWrap.style.display = "none";
    }

    // ─── Hero helper ───
    function setHero(show) {
        heroSection.style.display = show ? "flex" : "none";
        document.body.classList.toggle("no-hero", !show);
    }

    // ─── Hero ───
    function renderHero(movies) {
        if (!movies || !movies.length) { setHero(false); return; }

        const pick = movies[Math.floor(Math.random() * Math.min(3, movies.length))];
        heroMovieId  = pick.id;
        heroTitle    = pick.title;
        heroQuality  = qualityFromDate(pick.release_date, null);
        heroBackdrop = pick.backdrop_path ? `https://image.tmdb.org/t/p/w1280${pick.backdrop_path}` : null;
        setHero(true);

        if (pick.backdrop_path) {
            const url = `https://image.tmdb.org/t/p/original${pick.backdrop_path}`;
            heroImg.classList.remove("visible");
            heroImg.onload = () => heroImg.classList.add("visible");
            heroImg.src = url;
            // onload doesn't fire for cached images; handle that case
            if (heroImg.complete && heroImg.naturalWidth > 0) heroImg.classList.add("visible");
        } else {
            heroImg.classList.remove("visible");
        }

        heroContent.classList.remove("visible");
        heroContent.innerHTML = `
            <div class="hero-badge"><i class="fa-solid fa-fire-flame-curved"></i> Featured</div>
            <h2 class="hero-title">${pick.title}</h2>
            <div class="hero-meta">
                <span class="hero-score"><i class="fa-solid fa-star"></i> ${(pick.vote_average || 0).toFixed(1)}</span>
                ${pick.release_date ? `<span>${pick.release_date.split("-")[0]}</span>` : ""}
            </div>
            ${pick.overview ? `<p class="hero-overview">${pick.overview}</p>` : ""}
            <div class="hero-actions">
                <button class="hero-btn hero-watch" id="hero-watch-btn">
                    <i class="fa-solid fa-play"></i> Watch Now
                </button>
                <button class="hero-btn hero-info" id="hero-info-btn">
                    <i class="fa-solid fa-circle-info"></i> Info
                </button>
            </div>`;

        requestAnimationFrame(() => heroContent.classList.add("visible"));
        document.getElementById("hero-watch-btn").addEventListener("click", () => {
            if (heroMovieId) openPlayer(heroMovieId, heroTitle, heroQuality, heroBackdrop, contentType);
        });
        document.getElementById("hero-info-btn").addEventListener("click", () => {
            if (heroMovieId) fetchDetails(heroMovieId, contentType);
        });
    }

    // ─── Card factory ───
    function createCard(movie, index, showRank = false) {
        const poster = movie.poster_path ? `https://image.tmdb.org/t/p/w342${movie.poster_path}` : null;
        const year   = movie.release_date ? movie.release_date.split("-")[0] : "";
        const score  = movie.vote_average || 0;

        const card = document.createElement("div");
        card.className = "movie-card";
        card.style.animationDelay = `${index * 0.04}s`;

        // Image wrapper (contains poster, rank, badges, quick-action btns)
        const imgWrap = document.createElement("div");
        imgWrap.className = "card-img-wrap";

        if (showRank) {
            const rank = document.createElement("div");
            rank.className = "card-rank";
            rank.textContent = index + 1;
            imgWrap.appendChild(rank);
        }

        if (poster) {
            const img = document.createElement("img");
            img.className = "card-poster";
            img.src = poster; img.alt = movie.title;
            img.loading = index < 8 ? "eager" : "lazy";
            img.decoding = "async";
            imgWrap.appendChild(img);
        } else {
            const ph = document.createElement("div");
            ph.className = "card-no-poster";
            ph.textContent = "No Poster";
            imgWrap.appendChild(ph);
        }

        // Quality badge (top-left)
        const quality = qualityFromDate(movie.release_date, null);
        if (quality) {
            const qBadge = document.createElement("div");
            qBadge.className = `q-badge q-${quality}`;
            qBadge.textContent = QUALITY_LABELS[quality];
            imgWrap.appendChild(qBadge);
        }

        // Heart button
        const heartBtn = document.createElement("button");
        heartBtn.className = `heart-btn${isInWatchlist(movie.id) ? " active" : ""}`;
        heartBtn.innerHTML = isInWatchlist(movie.id)
            ? '<i class="fa-solid fa-heart"></i>'
            : '<i class="fa-regular fa-heart"></i>';
        heartBtn.addEventListener("click", e => { e.stopPropagation(); toggleWatchlist(movie, heartBtn); });
        imgWrap.appendChild(heartBtn);

        // Quick-play button
        const playBtn = document.createElement("button");
        playBtn.className = "card-play-btn";
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        playBtn.addEventListener("click", e => {
            e.stopPropagation();
            const backdropUrl = movie.backdrop_path
                ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null;
            openPlayer(movie.id, movie.title, quality, backdropUrl, contentType);
        });
        imgWrap.appendChild(playBtn);

        // Watch progress bar
        const histEntry = getHistory().find(h => h.id === movie.id);
        if (histEntry && histEntry.watchedSecs > 60) {
            const isTVCard = histEntry.type === "tv";
            const estSecs  = isTVCard ? 45 * 60 : 110 * 60;
            const pct      = Math.min(95, Math.round((histEntry.watchedSecs / estSecs) * 100));
            const bar = document.createElement("div");
            bar.className = "card-progress-bar";
            bar.style.width = pct + "%";
            imgWrap.appendChild(bar);
        }

        card.appendChild(imgWrap);

        // Info below poster
        const overlay = document.createElement("div");
        overlay.className = "card-overlay";

        const titleEl = document.createElement("h3");
        titleEl.className = "card-title";
        titleEl.textContent = movie.title;
        overlay.appendChild(titleEl);

        const metaEl = document.createElement("p");
        metaEl.className = "card-meta";
        if (year && score) {
            const scoreSpan = document.createElement("span");
            scoreSpan.className = "card-score";
            scoreSpan.textContent = score.toFixed(1);
            metaEl.appendChild(document.createTextNode(year + " · "));
            metaEl.appendChild(scoreSpan);
        } else if (year) {
            metaEl.textContent = year;
        }
        overlay.appendChild(metaEl);

        card.addEventListener("click", () => fetchDetails(movie.id, contentType));
        return card;
    }

    // ─── Render grid ───
    function renderMovies(movies) {
        resultsGrid.innerHTML = "";
        if (!movies || !movies.length) { showError("No movies found. Try different filters."); return; }
        renderHero(movies);
        movies.forEach((m, i) => resultsGrid.appendChild(createCard(m, i, isTrendingMode && i < 10)));
        loadMoreWrap.style.display = movies.length >= 20 ? "flex" : "none";
    }

    function appendMovies(movies) {
        const offset = resultsGrid.querySelectorAll(".movie-card:not(.skeleton-card)").length;
        movies.forEach((m, i) => resultsGrid.appendChild(createCard(m, offset + i, isTrendingMode && (offset + i) < 10)));
        loadMoreWrap.style.display = movies.length >= 20 ? "flex" : "none";
        isLoadingMore = false;
        loadMoreBtn.classList.remove("loading");
        loadMoreBtn.innerHTML = '<i class="fa-solid fa-chevron-down"></i> Load More';
    }

    // Normalize TV item to look like a movie item for shared card/hero code
    function normalizeItem(item) {
        if (item.name && !item.title) {
            item.title        = item.name;
            item.release_date = item.first_air_date || "";
        }
        return item;
    }

    // ─── Fetch recommendations (+ trending) ───
    function fetchRecommendations(reset = true) {
        isSearchMode    = false;
        isWatchlistMode = false;
        if (reset) { currentPage = 1; showSkeletons(10); }

        isTrendingMode = filters.sort_by.startsWith("trending.");
        const isTrending = isTrendingMode;
        const base       = contentType === "tv" ? "/tv" : "";
        let fetchPromise;

        if (isTrending) {
            const win = filters.sort_by.split(".")[1];
            fetchPromise = fetch(`${base}/trending?window=${win}&page=${currentPage}`);
        } else {
            fetchPromise = fetch(`${base}/recommend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...filters, page: currentPage })
            });
        }

        fetchPromise
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(d => {
                const items = (d.movies || []).map(normalizeItem);
                reset ? renderMovies(items) : appendMovies(items);
            })
            .catch(() => showError("Could not load content. Please try again."));
    }

    // ─── Infinite scroll (replaces manual Load More) ───
    const scrollSentinel = document.getElementById("scroll-sentinel");
    const infiniteObserver = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        if (isLoadingMore || isSearchMode || isWatchlistMode) return;
        isLoadingMore = true;
        currentPage++;
        loadMoreBtn.classList.add("loading");
        loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> Loading…';
        loadMoreWrap.style.display = "flex";
        fetchRecommendations(false);
    }, { rootMargin: "300px" });
    if (scrollSentinel) infiniteObserver.observe(scrollSentinel);

    loadMoreBtn.addEventListener("click", () => {
        if (isLoadingMore) return;
        isLoadingMore = true;
        currentPage++;
        loadMoreBtn.classList.add("loading");
        loadMoreBtn.innerHTML = '<i class="fa-solid fa-spinner"></i> Loading…';
        fetchRecommendations(false);
    });

    // ─── Search (debounced) ───
    let searchTimer;
    searchInput.addEventListener("input", e => {
        searchClear.style.display = e.target.value ? "flex" : "none";
        clearTimeout(searchTimer);
        const q = e.target.value.trim();
        searchTimer = setTimeout(() => {
            if (!q) { isSearchMode = false; isWatchlistMode = false; hideSuggestions(); fetchRecommendations(); return; }
            hideSuggestions();
            saveRecentSearch(q);
            isSearchMode    = true;
            isWatchlistMode = false;
            setHero(false);
            showSkeletons(10);
            const searchUrl = contentType === "tv"
                ? `/tv/search?q=${encodeURIComponent(q)}`
                : `/search?q=${encodeURIComponent(q)}`;
            fetch(searchUrl)
                .then(r => { if (!r.ok) throw new Error(); return r.json(); })
                .then(d => {
                    resultsGrid.innerHTML = "";
                    const items = (d.movies || []).map(normalizeItem);
                    if (!items.length) { showError(`No results for "${q}"`); return; }
                    items.forEach((m, i) => resultsGrid.appendChild(createCard(m, i)));
                    loadMoreWrap.style.display = "none";
                })
                .catch(() => showError("Search failed. Please try again."));
        }, 450);
    });

    // ─── Trailer modal ───
    const trailerModal  = document.getElementById("trailer-modal");
    const trailerIframe = document.getElementById("trailer-iframe");
    const trailerClose  = document.getElementById("trailer-close");

    function openTrailer(key) {
        trailerIframe.src = `https://www.youtube.com/embed/${key}?autoplay=1`;
        trailerModal.classList.add("open");
        document.body.style.overflow = "hidden";
    }
    function closeTrailer() {
        trailerModal.classList.remove("open");
        trailerIframe.src = "";
        document.body.style.overflow = "";
    }
    trailerClose.addEventListener("click", closeTrailer);
    trailerModal.addEventListener("click", e => { if (e.target === trailerModal) closeTrailer(); });
    window.addEventListener("keydown", e => { if (e.key === "Escape" && trailerModal.classList.contains("open")) closeTrailer(); });

    // ─── Player ───
    const playerOverlay  = document.getElementById("player-overlay");
    const playerBg       = document.getElementById("player-bg");
    const playerIframe   = document.getElementById("player-iframe");
    const playerTitle    = document.getElementById("player-title");
    const playerClose    = document.getElementById("player-close");
    const playerQuality  = document.getElementById("player-quality");
    const playerHint     = document.getElementById("player-hint");
    const playerEpPicker = document.getElementById("player-ep-picker");
    const playerSeason   = document.getElementById("player-season");
    const playerEpisode  = document.getElementById("player-episode");
    const playerEpGo     = document.getElementById("player-ep-go");
    const srcBtns        = document.querySelectorAll(".player-src-btn");

    // Movie sources — HD ordered best quality first
    const MOVIE_HD_SOURCES = [
        id => `https://embed.su/embed/movie/${id}`,
        id => `https://vidlink.pro/movie/${id}`,
        id => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
        id => `https://www.2embed.cc/embed/${id}`,
    ];
    // For newer/cam releases — sources that index new content fastest
    const MOVIE_CAM_SOURCES = [
        id => `https://vidlink.pro/movie/${id}`,
        id => `https://embed.su/embed/movie/${id}`,
        id => `https://www.2embed.cc/embed/${id}`,
        id => `https://vidsrc.xyz/embed/movie?tmdb=${id}`,
    ];
    // TV embed sources
    const TV_SOURCES = [
        (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
        (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}`,
        (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}`,
        (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
    ];

    let currentItemId   = null;
    let currentItemType = "movie";
    let activeSources   = MOVIE_HD_SOURCES;
    let activeSource    = 0;
    let autoSwitchTimer = null;
    let isPlaying       = false;  // true once we confirm a source is delivering content
    let iframeSrcTime   = null;   // timestamp when we last set iframe.src
    const AUTO_SWITCH_MS = 10000; // ms before trying next source

    // Auto-next episode (TV)
    const playerNextEpBtn  = document.getElementById("player-next-ep");
    const playerAutoNext   = document.getElementById("player-autonext");
    const autonextEpLabel  = document.getElementById("autonext-ep-label");
    const autonextCountEl  = document.getElementById("autonext-countdown");
    const autonextPlayBtn  = document.getElementById("autonext-play");
    const autonextCancelBtn = document.getElementById("autonext-cancel");
    let autoNextTimer      = null;
    let autoNextCountdown  = null;

    // Watch-time tracking (for progress bars on cards)
    let watchStartTime = null;

    const playerStatusEl = document.getElementById("player-status");

    function setSourceStatus(msg, isError = false) {
        if (!msg) { playerStatusEl.style.display = "none"; return; }
        playerStatusEl.className = "player-status" + (isError ? " error" : "");
        playerStatusEl.innerHTML = `<span class="player-status-dot"></span>${msg}`;
        playerStatusEl.style.display = "flex";
    }

    function clearAutoSwitch() {
        clearTimeout(autoSwitchTimer);
        autoSwitchTimer = null;
    }

    function markPlaying() {
        if (isPlaying) return;
        isPlaying = true;
        clearAutoSwitch();
        setSourceStatus(null);
        localStorage.setItem("preferredSource", activeSource);
        if (currentItemType === "tv") scheduleAutoNext();
    }

    // ── Auto-next episode ───────────────────────────────────────────────────
    function scheduleAutoNext() {
        clearTimeout(autoNextTimer);
        autoNextTimer = setTimeout(showAutoNext, 22 * 60 * 1000); // 22 min
    }

    function showAutoNext() {
        const s = parseInt(playerSeason.value) || 1;
        const e = parseInt(playerEpisode.value) || 1;
        autonextEpLabel.textContent = `Season ${s}, Episode ${e + 1}`;
        let count = 15;
        autonextCountEl.textContent = count;
        playerAutoNext.style.display = "flex";
        clearInterval(autoNextCountdown);
        autoNextCountdown = setInterval(() => {
            count--;
            autonextCountEl.textContent = count;
            if (count <= 0) { clearInterval(autoNextCountdown); playNextEpisode(); }
        }, 1000);
    }

    function hideAutoNext() {
        playerAutoNext.style.display = "none";
        clearInterval(autoNextCountdown);
        clearTimeout(autoNextTimer);
    }

    function playNextEpisode() {
        hideAutoNext();
        const s = parseInt(playerSeason.value) || 1;
        const e = parseInt(playerEpisode.value) || 1;
        playerEpisode.value = e + 1;
        isPlaying = false;
        const pref = parseInt(localStorage.getItem("preferredSource") || "0");
        activeSource = pref;
        loadSource(pref);
        saveToHistory({ id: currentItemId, type: "tv", title: playerTitle.textContent,
                        quality: heroQuality, backdrop: null, season: s, episode: e + 1 });
    }

    playerNextEpBtn.addEventListener("click", playNextEpisode);
    autonextPlayBtn.addEventListener("click", playNextEpisode);
    autonextCancelBtn.addEventListener("click", hideAutoNext);

    function scheduleAutoSwitch(fromIndex) {
        clearAutoSwitch();
        if (isPlaying) return; // Never interrupt active playback
        const next = fromIndex + 1;
        if (next >= srcBtns.length) {
            setSourceStatus("All sources failed — this title may not be available yet.", true);
            playerIframe.src = "";
            showNoSourceState();
            return;
        }
        autoSwitchTimer = setTimeout(() => {
            if (isPlaying) return; // Double-check: content may have started while timer ran
            showToast(`Source ${fromIndex + 1} not responding — trying source ${next + 1}…`);
            loadSource(next);
        }, AUTO_SWITCH_MS);
    }

    // ── No-source fallback overlay ───────────────────────────────────────────
    function showNoSourceState() {
        const existing = document.getElementById("player-no-source");
        if (existing) return;
        const el = document.createElement("div");
        el.id = "player-no-source"; el.className = "player-no-source";
        el.innerHTML = `
            <i class="fa-solid fa-circle-exclamation"></i>
            <p>No working source found</p>
            <span>This title may not be available yet. Try a different source or come back later.</span>
            <button id="player-retry-btn" class="player-retry-btn">
                <i class="fa-solid fa-rotate-right"></i> Retry Source 1
            </button>`;
        document.querySelector(".player-frame-wrap").appendChild(el);
        document.getElementById("player-retry-btn").addEventListener("click", () => {
            el.remove(); loadSource(0);
        });
    }

    function hideNoSourceState() {
        document.getElementById("player-no-source")?.remove();
    }

    // iframe load event: error pages load in <2s; a real player takes longer
    playerIframe.addEventListener("load", () => {
        if (!playerOverlay.classList.contains("open") || !iframeSrcTime) return;
        const elapsed = Date.now() - iframeSrcTime;
        if (elapsed >= 2000) markPlaying(); // Real content — stop switching
    });

    // postMessage from iframe = player is definitely alive
    window.addEventListener("message", () => {
        if (playerOverlay.classList.contains("open")) markPlaying();
    });

    function buildSrc(index) {
        if (currentItemType === "tv") {
            const s = parseInt(playerSeason.value) || 1;
            const e = parseInt(playerEpisode.value) || 1;
            return TV_SOURCES[index](currentItemId, s, e);
        }
        return activeSources[index](currentItemId);
    }

    function loadSource(index) {
        isPlaying  = false; // Reset playing flag whenever source changes
        activeSource = index;
        hideNoSourceState();
        srcBtns.forEach((b, i) => b.classList.toggle("active", i === index));
        setSourceStatus(`Connecting to source ${index + 1} of ${srcBtns.length}…`);
        playerIframe.src = "";
        setTimeout(() => {
            iframeSrcTime = Date.now();
            playerIframe.src = buildSrc(index);
            scheduleAutoSwitch(index);
        }, 80);
    }

    function openPlayer(itemId, title, quality, backdropUrl, type, season = 1, episode = 1) {
        currentItemId   = itemId;
        currentItemType = type || "movie";
        activeSource    = parseInt(localStorage.getItem("preferredSource") || "0");
        activeSources   = (quality === "hd") ? MOVIE_HD_SOURCES : MOVIE_CAM_SOURCES;

        playerBg.style.backgroundImage = backdropUrl ? `url(${backdropUrl})` : "none";
        playerTitle.textContent = title || "";

        // Show/hide episode picker
        if (currentItemType === "tv") {
            playerSeason.value  = season;
            playerEpisode.value = episode;
            playerEpPicker.style.display = "flex";
        } else {
            playerEpPicker.style.display = "none";
        }

        // Save to watch history
        saveToHistory({ id: itemId, type: currentItemType, title, quality, backdrop: backdropUrl, season, episode });

        // Quality badge
        const qMap = { hd: ["HD","q-hd"], ts: ["HD-TS","q-ts"], cam: ["CAM","q-cam"], soon: ["Soon","q-soon"] };
        if (quality && qMap[quality]) {
            playerQuality.textContent = qMap[quality][0];
            playerQuality.className   = `player-quality-badge q-badge ${qMap[quality][1]}`;
            playerQuality.style.display = "inline-block";
        } else {
            playerQuality.style.display = "none";
        }

        // Hint bar
        if (quality === "cam" || quality === "ts") {
            playerHint.style.display = "flex";
            playerHint.textContent   = quality === "cam"
                ? "Still in theatres — stream may be camera quality. Try all sources."
                : "Limited digital release — quality may vary. Try all sources.";
        } else {
            playerHint.style.display = "none";
        }

        isPlaying = false;
        watchStartTime = Date.now();
        hideAutoNext();
        playerNextEpBtn.style.display = currentItemType === "tv" ? "inline-flex" : "none";
        playerOverlay.classList.add("open");
        document.body.style.overflow = "hidden";
        loadSource(0);
    }

    function closePlayer() {
        clearAutoSwitch();
        hideAutoNext();
        setSourceStatus(null);
        // Save accumulated watch time to history entry
        if (watchStartTime) {
            const secs = Math.round((Date.now() - watchStartTime) / 1000);
            watchStartTime = null;
            if (secs > 60) {
                let hist = getHistory();
                const entry = hist.find(h => h.id === currentItemId && h.type === currentItemType);
                if (entry) {
                    entry.watchedSecs = (entry.watchedSecs || 0) + secs;
                    localStorage.setItem("watchHistory", JSON.stringify(hist));
                }
            }
        }
        playerOverlay.classList.remove("open");
        playerIframe.src = "";
        document.body.style.overflow = "";
    }

    // Episode picker — Go button or Enter key
    playerEpGo.addEventListener("click", () => loadSource(activeSource));
    [playerSeason, playerEpisode].forEach(inp => {
        inp.addEventListener("keydown", e => { if (e.key === "Enter") loadSource(activeSource); });
    });

    srcBtns.forEach((btn, i) => btn.addEventListener("click", () => loadSource(i)));
    playerClose.addEventListener("click", closePlayer);
    playerOverlay.addEventListener("click", e => { if (e.target === playerOverlay) closePlayer(); });
    window.addEventListener("keydown", e => { if (e.key === "Escape" && playerOverlay.classList.contains("open")) closePlayer(); });

    // ─── Modal + back navigation ───
    const modalBackBtn = document.getElementById("modal-back");
    const modalHistory = [];

    function updateModalBackBtn() {
        modalBackBtn.style.display = modalHistory.length > 1 ? "flex" : "none";
    }

    function pushModalState(state) {
        modalHistory.push(state);
        updateModalBackBtn();
    }

    function goModalBack() {
        modalHistory.pop();
        const prev = modalHistory.pop();
        if (!prev) { closeModal(); return; }
        if (prev.kind === "detail") fetchDetails(prev.id, prev.type);
        else openActorPage(prev.id, prev.name);
    }

    function closeModal() {
        modal.style.display = "none";
        document.body.style.overflow = "";
        modalHistory.length = 0;
        updateModalBackBtn();
    }

    modalBackBtn.addEventListener("click", goModalBack);
    closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
    window.addEventListener("keydown", e => { if (e.key === "Escape" && !playerOverlay.classList.contains("open")) closeModal(); });

    function fetchMovieDetails(id) { fetchDetails(id, contentType); }

    function openActorPage(personId, name) {
        pushModalState({ kind: "actor", id: personId, name });
        modalBody.innerHTML = `<div class="modal-loading"><div class="loader"></div></div>`;
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";

        fetch(`/person/${personId}`)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(p => {
                modalBody.innerHTML = "";

                const wrap = document.createElement("div");
                wrap.className = "actor-page";

                // Header
                const header = document.createElement("div");
                header.className = "actor-header";

                if (p.profile_path) {
                    const img = document.createElement("img");
                    img.src = `https://image.tmdb.org/t/p/w185${p.profile_path}`;
                    img.alt = p.name; img.className = "actor-photo";
                    header.appendChild(img);
                }

                const info = document.createElement("div");
                info.className = "actor-info";
                const nameEl = document.createElement("h2");
                nameEl.className = "actor-name";
                nameEl.textContent = p.name;
                info.appendChild(nameEl);
                if (p.birthday) {
                    const bday = document.createElement("p");
                    bday.className = "actor-meta";
                    bday.textContent = `Born ${p.birthday}` + (p.place_of_birth ? ` · ${p.place_of_birth}` : "");
                    info.appendChild(bday);
                }
                if (p.biography) {
                    const bio = document.createElement("p");
                    bio.className = "actor-bio";
                    bio.textContent = p.biography.length > 400 ? p.biography.slice(0, 400) + "…" : p.biography;
                    info.appendChild(bio);
                }
                header.appendChild(info);
                wrap.appendChild(header);

                // Filmography
                const credits = [...(p.movie_credits?.cast || []), ...(p.tv_credits?.cast || [])]
                    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
                    .slice(0, 20);

                if (credits.length) {
                    const filmLabel = document.createElement("h3");
                    filmLabel.className = "actor-filmography-label";
                    filmLabel.textContent = "Known For";
                    wrap.appendChild(filmLabel);

                    const row = document.createElement("div");
                    row.className = "actor-filmography";
                    credits.forEach(c => {
                        const card = document.createElement("div");
                        card.className = "actor-film-card";
                        const itemType = c.media_type || (c.first_air_date ? "tv" : "movie");
                        if (c.poster_path) {
                            const img = document.createElement("img");
                            img.src = `https://image.tmdb.org/t/p/w185${c.poster_path}`;
                            img.alt = c.title || c.name; img.loading = "lazy";
                            card.appendChild(img);
                        } else {
                            const ph = document.createElement("div");
                            ph.className = "actor-film-ph";
                            card.appendChild(ph);
                        }
                        const titleEl = document.createElement("span");
                        titleEl.textContent = c.title || c.name || "";
                        card.appendChild(titleEl);
                        card.addEventListener("click", () => fetchDetails(c.id, itemType));
                        row.appendChild(card);
                    });
                    wrap.appendChild(row);
                }

                modalBody.appendChild(wrap);
            })
            .catch(() => { modalBody.innerHTML = '<p class="modal-error">Could not load actor info.</p>'; });
    }

    function fetchDetails(id, type) {
        pushModalState({ kind: "detail", id, type });
        modalBody.innerHTML = `<div class="modal-loading"><div class="loader"></div></div>`;
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";

        const isTV        = type === "tv";
        const detailUrl   = isTV ? `/tv/${id}`         : `/movie/${id}`;
        const similarUrl  = isTV ? `/tv/${id}/similar` : `/movie/${id}/similar`;

        Promise.all([
            fetch(detailUrl).then(r => { if (!r.ok) throw new Error(); return r.json(); }),
            fetch(similarUrl).then(r => r.ok ? r.json() : { movies: [] })
        ])
        .then(([movie, sim]) => {
            // Normalize TV fields
            const title    = movie.title || movie.name || "";
            const rawDate  = movie.release_date || movie.first_air_date || "";
            const poster   = movie.poster_path   ? `https://image.tmdb.org/t/p/w342${movie.poster_path}`   : null;
            const backdrop = movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : null;
            const score    = movie.vote_average || 0;
            const year     = rawDate ? rawDate.split("-")[0] : "";

            // Runtime: movies have `runtime` (number), TV has `episode_run_time` (array)
            let runtime = "";
            if (!isTV && movie.runtime) {
                const hrs = Math.floor(movie.runtime / 60), mins = movie.runtime % 60;
                runtime = hrs ? `${hrs}h ${mins}m` : `${mins}m`;
            } else if (isTV && movie.episode_run_time?.length) {
                runtime = `~${movie.episode_run_time[0]}m / ep`;
            }

            const director   = !isTV ? ((movie.credits?.crew || []).find(c => c.job === "Director")?.name || "") : "";
            const creator    = isTV  ? (movie.created_by || []).map(c => c.name).join(", ") : "";
            const rdResults  = movie.release_dates?.results || [];
            const quality       = qualityFromDate(rawDate, rdResults);
            const castList      = (movie.credits?.cast || []).slice(0, 8);
            const trailer       = (movie.videos?.results || []).find(v => v.type === "Trailer" && v.site === "YouTube");
            const similar       = (sim.movies || []).slice(0, 8).map(normalizeItem);
            const collectionId  = !isTV ? movie.belongs_to_collection?.id : null;

            // Certification (age rating)
            let cert = "";
            if (!isTV) {
                const usCerts = rdResults.find(r => r.iso_3166_1 === "US") || rdResults[0];
                cert = (usCerts?.release_dates || []).find(d => d.certification)?.certification || "";
            } else {
                const tvRatings = movie.content_ratings?.results || [];
                cert = (tvRatings.find(r => r.iso_3166_1 === "US") || tvRatings[0])?.rating || "";
            }

            // TV-specific
            const seasons    = isTV ? movie.number_of_seasons  : null;
            const episodes   = isTV ? movie.number_of_episodes : null;
            const status     = isTV ? movie.status             : null;
            const networks   = isTV ? (movie.networks || []).map(n => n.name).join(", ") : "";

            const inner = document.createElement("div");
            inner.className = "modal-inner";

            // ── Banner (backdrop) ──
            const banner = document.createElement("div");
            banner.className = "modal-banner";
            if (backdrop) {
                const img = document.createElement("img");
                img.className = "modal-banner-img"; img.src = backdrop; img.alt = "";
                banner.appendChild(img);
            } else {
                const ph = document.createElement("div");
                ph.className = "modal-banner-ph";
                banner.appendChild(ph);
            }
            const fade = document.createElement("div");
            fade.className = "modal-banner-fade";
            banner.appendChild(fade);
            inner.appendChild(banner);

            // ── Scrollable content ──
            const scroll = document.createElement("div");
            scroll.className = "modal-scroll";

            // Hero row: poster + info side-by-side
            const heroRow = document.createElement("div");
            heroRow.className = "modal-hero-row";

            if (poster) {
                const pImg = document.createElement("img");
                pImg.className = "modal-poster-img"; pImg.src = poster; pImg.alt = title;
                heroRow.appendChild(pImg);
            } else {
                const pPh = document.createElement("div");
                pPh.className = "modal-poster-ph";
                pPh.innerHTML = '<i class="fa-solid fa-film"></i>';
                heroRow.appendChild(pPh);
            }

            const info = document.createElement("div");
            info.className = "modal-info";

            // TV badge
            if (isTV) {
                const typeBadge = document.createElement("span");
                typeBadge.className = "modal-type-badge";
                typeBadge.innerHTML = '<i class="fa-solid fa-tv"></i> TV Series';
                info.appendChild(typeBadge);
            }

            const titleEl = document.createElement("h2");
            titleEl.className = "modal-title";
            titleEl.textContent = title;
            info.appendChild(titleEl);

            if (movie.tagline) {
                const tl = document.createElement("p");
                tl.className = "modal-tagline";
                tl.textContent = `"${movie.tagline}"`;
                info.appendChild(tl);
            }

            // Stars + score
            const ratingDiv = document.createElement("div");
            ratingDiv.className = "modal-rating";
            const filled = Math.round(score / 2);
            const starsEl = document.createElement("span");
            starsEl.className = "stars";
            starsEl.innerHTML = '<i class="fa-solid fa-star"></i>'.repeat(filled) +
                                 '<i class="fa-regular fa-star"></i>'.repeat(5 - filled);
            const sv = document.createElement("span"); sv.className = "score-val"; sv.textContent = score.toFixed(1);
            const sd = document.createElement("span"); sd.className = "score-denom"; sd.textContent = "/ 10";
            ratingDiv.append(starsEl, sv, sd);
            info.appendChild(ratingDiv);

            // Chips
            const chipTexts = [year, runtime,
                director ? `Dir. ${director}` : "",
                creator  ? `By ${creator}`   : "",
                seasons  ? `${seasons} Season${seasons > 1 ? "s" : ""}` : "",
                episodes ? `${episodes} Episodes` : "",
                status   || "",
                networks || "",
            ].filter(Boolean);
            if (chipTexts.length || quality) {
                const chipsDiv = document.createElement("div");
                chipsDiv.className = "modal-chips";
                chipTexts.forEach(c => {
                    const chip = document.createElement("span");
                    chip.className = "modal-chip"; chip.textContent = c;
                    chipsDiv.appendChild(chip);
                });
                if (cert) {
                    const certChip = document.createElement("span");
                    certChip.className = "modal-chip cert-chip";
                    certChip.textContent = cert;
                    chipsDiv.appendChild(certChip);
                }
                if (quality && !isTV) {
                    const qChip = document.createElement("span");
                    qChip.className = `modal-chip q-chip q-${quality}`;
                    qChip.textContent = QUALITY_LABELS[quality];
                    chipsDiv.appendChild(qChip);
                }
                info.appendChild(chipsDiv);
            }

            // Genre tags — clickable to filter browse
            if (movie.genres?.length) {
                const gDiv = document.createElement("div");
                gDiv.className = "modal-genres";
                movie.genres.forEach(g => {
                    const tag = document.createElement("button");
                    tag.className = "genre-tag"; tag.textContent = g.name;
                    tag.addEventListener("click", () => {
                        closeModal();
                        filters.genre_id = g.id;
                        document.querySelectorAll(".genre-pill").forEach(p =>
                            p.classList.toggle("active", String(p.dataset.id) === String(g.id)));
                        currentPage = 1;
                        isSearchMode = false; isWatchlistMode = false; isTrendingMode = false;
                        fetchRecommendations();
                    });
                    gDiv.appendChild(tag);
                });
                info.appendChild(gDiv);
            }

            // Buttons row
            const btnRow = document.createElement("div");
            btnRow.className = "modal-btn-row";

            // Watch Now button
            const watchBtn = document.createElement("button");
            watchBtn.className = "watch-btn";
            watchBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            watchBtn.appendChild(document.createTextNode(isTV ? " Watch S1E1" : " Watch Now"));
            watchBtn.addEventListener("click", () => openPlayer(movie.id, title, quality, backdrop, type));
            btnRow.appendChild(watchBtn);

            // Trailer button — plays in-app
            if (trailer) {
                const btn = document.createElement("button");
                btn.className = "trailer-btn";
                btn.innerHTML = '<i class="fa-brands fa-youtube"></i> Trailer';
                btn.addEventListener("click", () => { closeModal(); openTrailer(trailer.key); });
                btnRow.appendChild(btn);
            }

            // Watchlist (heart) button
            const modalHeart = document.createElement("button");
            const inList = () => isInWatchlist(movie.id);
            const updateHeart = () => {
                modalHeart.className = `modal-heart-btn${inList() ? " active" : ""}`;
                modalHeart.innerHTML = inList()
                    ? '<i class="fa-solid fa-heart"></i>'
                    : '<i class="fa-regular fa-heart"></i>';
                modalHeart.title = inList() ? "Remove from My List" : "Add to My List";
            };
            updateHeart();
            modalHeart.addEventListener("click", () => {
                toggleWatchlist({ id: movie.id, title, poster_path: movie.poster_path,
                    release_date: rawDate, vote_average: score }, modalHeart);
                updateHeart();
            });
            btnRow.appendChild(modalHeart);

            // Share button
            const shareBtn = document.createElement("button");
            shareBtn.className = "share-btn";
            shareBtn.innerHTML = '<i class="fa-solid fa-share-nodes"></i>';
            shareBtn.title = "Share";
            shareBtn.addEventListener("click", () => {
                const shareUrl = `${location.origin}${location.pathname}?id=${movie.id}&type=${type}`;
                if (navigator.share) {
                    navigator.share({ title, url: shareUrl }).catch(() => {});
                } else {
                    navigator.clipboard.writeText(shareUrl).then(() => showToast("Link copied!"));
                }
            });
            btnRow.appendChild(shareBtn);

            info.appendChild(btnRow);

            heroRow.appendChild(info);
            scroll.appendChild(heroRow);

            // ── Body: overview · cast · similar ──
            const body = document.createElement("div");
            body.className = "modal-body-content";

            const addSection = (label, child) => {
                const h = document.createElement("h4");
                h.className = "section-label"; h.textContent = label;
                body.appendChild(h);
                body.appendChild(child);
            };

            const ovEl = document.createElement("p");
            ovEl.className = "modal-overview";
            ovEl.textContent = movie.overview || "No overview available.";
            addSection("Overview", ovEl);

            if (castList.length) {
                const castDiv = document.createElement("div");
                castDiv.className = "modal-cast";
                castList.forEach(a => {
                    const c = document.createElement("button");
                    c.className = "cast-member";
                    if (a.profile_path) {
                        const img = document.createElement("img");
                        img.src = `https://image.tmdb.org/t/p/w185${a.profile_path}`;
                        img.alt = a.name; img.loading = "lazy";
                        img.className = "cast-avatar";
                        c.appendChild(img);
                    } else {
                        const av = document.createElement("div");
                        av.className = "cast-avatar cast-avatar-ph";
                        av.innerHTML = '<i class="fa-solid fa-user"></i>';
                        c.appendChild(av);
                    }
                    const nameEl = document.createElement("span");
                    nameEl.textContent = a.name;
                    c.appendChild(nameEl);
                    c.addEventListener("click", () => openActorPage(a.id, a.name));
                    castDiv.appendChild(c);
                });
                addSection("Cast", castDiv);
            }

            // ── TV Season / Episode browser ──
            if (isTV && seasons) {
                const epSection = document.createElement("div");
                epSection.className = "ep-browser";

                // Season tabs
                const seasonTabs = document.createElement("div");
                seasonTabs.className = "season-tabs";
                for (let s = 1; s <= seasons; s++) {
                    const tab = document.createElement("button");
                    tab.className = "season-tab" + (s === 1 ? " active" : "");
                    tab.textContent = `Season ${s}`;
                    tab.dataset.season = s;
                    seasonTabs.appendChild(tab);
                }
                epSection.appendChild(seasonTabs);

                // Episode list container
                const epList = document.createElement("div");
                epList.className = "ep-list";
                epSection.appendChild(epList);

                function loadSeasonEpisodes(seasonNum) {
                    epList.innerHTML = `<div class="ep-loading"><div class="loader"></div></div>`;
                    fetch(`/tv/${movie.id}/season/${seasonNum}`)
                        .then(r => r.json())
                        .then(data => {
                            epList.innerHTML = "";
                            (data.episodes || []).forEach(ep => {
                                const row = document.createElement("div");
                                row.className = "ep-row";
                                const thumb = document.createElement("div");
                                thumb.className = "ep-thumb";
                                if (ep.still_path) {
                                    const img = document.createElement("img");
                                    img.src = `https://image.tmdb.org/t/p/w185${ep.still_path}`;
                                    img.alt = ""; img.loading = "lazy";
                                    thumb.appendChild(img);
                                } else {
                                    thumb.innerHTML = '<i class="fa-solid fa-film"></i>';
                                }
                                const info = document.createElement("div");
                                info.className = "ep-info";
                                const epTitle = document.createElement("span");
                                epTitle.className = "ep-title";
                                epTitle.textContent = `${ep.episode_number}. ${ep.name}`;
                                const epMeta = document.createElement("span");
                                epMeta.className = "ep-meta";
                                epMeta.textContent = ep.air_date ? ep.air_date.split("-")[0] : "";
                                const epOverview = document.createElement("p");
                                epOverview.className = "ep-overview";
                                epOverview.textContent = ep.overview || "";
                                info.append(epTitle, epMeta, epOverview);
                                const playBtn = document.createElement("button");
                                playBtn.className = "ep-play-btn";
                                playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                                playBtn.addEventListener("click", () => {
                                    closeModal();
                                    openPlayer(movie.id, title, quality, backdrop, "tv", seasonNum, ep.episode_number);
                                });
                                row.append(thumb, info, playBtn);
                                epList.appendChild(row);
                            });
                        })
                        .catch(() => { epList.innerHTML = '<p class="ep-error">Could not load episodes.</p>'; });
                }

                seasonTabs.addEventListener("click", e => {
                    const tab = e.target.closest(".season-tab");
                    if (!tab) return;
                    seasonTabs.querySelectorAll(".season-tab").forEach(t => t.classList.remove("active"));
                    tab.classList.add("active");
                    loadSeasonEpisodes(parseInt(tab.dataset.season));
                });

                loadSeasonEpisodes(1);
                addSection("Episodes", epSection);
            }

            if (similar.length) {
                const simRow = document.createElement("div");
                simRow.className = "similar-row";
                similar.forEach(m => {
                    const card = document.createElement("div");
                    card.className = "similar-card";
                    if (m.poster_path) {
                        const img = document.createElement("img");
                        img.src = `https://image.tmdb.org/t/p/w185${m.poster_path}`;
                        img.alt = m.title; img.loading = "lazy";
                        card.appendChild(img);
                    } else {
                        const ph = document.createElement("div");
                        ph.className = "similar-card-placeholder";
                        card.appendChild(ph);
                    }
                    const sp = document.createElement("span"); sp.textContent = m.title || m.name || "";
                    card.appendChild(sp);
                    card.addEventListener("click", () => fetchDetails(m.id, type));
                    simRow.appendChild(card);
                });
                addSection("More Like This", simRow);
            }

            // ── Franchise / Collection ──
            if (collectionId) {
                fetch(`/collection/${collectionId}`)
                    .then(r => r.json())
                    .then(col => {
                        const parts = (col.parts || []).sort((a, b) => (a.release_date || "").localeCompare(b.release_date || ""));
                        if (!parts.length) return;
                        const colRow = document.createElement("div");
                        colRow.className = "similar-row";
                        parts.forEach(p => {
                            const card = document.createElement("div");
                            card.className = "similar-card";
                            if (p.poster_path) {
                                const img = document.createElement("img");
                                img.src = `https://image.tmdb.org/t/p/w185${p.poster_path}`;
                                img.alt = p.title; img.loading = "lazy";
                                card.appendChild(img);
                            } else {
                                const ph = document.createElement("div");
                                ph.className = "similar-card-placeholder";
                                card.appendChild(ph);
                            }
                            const sp = document.createElement("span");
                            sp.textContent = p.title;
                            card.appendChild(sp);
                            card.addEventListener("click", () => fetchDetails(p.id, "movie"));
                            colRow.appendChild(card);
                        });
                        const colSection = document.createElement("div");
                        colSection.className = "modal-section";
                        const lbl = document.createElement("h4");
                        lbl.className = "modal-section-label";
                        lbl.textContent = col.name || "The Collection";
                        colSection.appendChild(lbl);
                        colSection.appendChild(colRow);
                        body.appendChild(colSection);
                    })
                    .catch(() => {});
            }

            scroll.appendChild(body);
            inner.appendChild(scroll);
            modalBody.innerHTML = "";
            modalBody.appendChild(inner);
        })
        .catch(() => { closeModal(); showToast("Could not load details."); });
    }

    // ─── Boot ───
    updateWatchlistBadge();
    fetchRecommendations();
    loadNowPlaying();

    // Auto-open modal from shared link (?id=&type=)
    const urlParams = new URLSearchParams(location.search);
    const sharedId   = urlParams.get("id");
    const sharedType = urlParams.get("type") || "movie";
    if (sharedId) fetchDetails(parseInt(sharedId), sharedType);

    // ─── Keyboard Shortcuts ───
    document.addEventListener("keydown", e => {
        const tag = document.activeElement.tagName;
        const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

        // Escape — close player → trailer → modal
        if (e.key === "Escape") {
            if (playerOverlay.classList.contains("open")) { closePlayer(); return; }
            if (document.getElementById("trailer-modal").classList.contains("open")) { closeTrailer(); return; }
            if (modal.classList.contains("open")) { closeModal(); return; }
        }

        // / — focus search
        if (e.key === "/" && !typing) { e.preventDefault(); searchInput.focus(); return; }

        // Only remaining shortcuts apply when player is open and not typing
        if (!playerOverlay.classList.contains("open") || typing) return;

        // 1–4 switch source
        if (e.key >= "1" && e.key <= "4") {
            const idx = parseInt(e.key) - 1;
            const srcBtns = document.querySelectorAll(".player-src-btn");
            if (srcBtns[idx]) srcBtns[idx].click();
            return;
        }

        // F — fullscreen the iframe
        if (e.key === "f" || e.key === "F") {
            const iframe = document.getElementById("player-iframe");
            if (iframe.requestFullscreen) iframe.requestFullscreen();
            else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
            return;
        }
    });

});
