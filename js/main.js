(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // Mobile menu
  const toggle = $(".menu-toggle");
  const mobileNav = $(".mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", () => {
      mobileNav.classList.toggle("open");
      toggle.setAttribute(
        "aria-expanded",
        mobileNav.classList.contains("open") ? "true" : "false"
      );
    });
    $$("a", mobileNav).forEach((a) =>
      a.addEventListener("click", () => mobileNav.classList.remove("open"))
    );
  }

  // FAQ accordion
  $$(".faq-item").forEach((item) => {
    const btn = $(".faq-q", item);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const open = item.classList.contains("open");
      $$(".faq-item.open").forEach((el) => el.classList.remove("open"));
      if (!open) item.classList.add("open");
    });
  });

  // Scroll reveal
  const reveals = $$(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  const isFileProtocol = location.protocol === "file:";

  const ytThumb = (id) => `https://i.ytimg.com/vi_webp/${id}/sddefault.webp`;

  const createPlayer = (id, { autoplay = false, mute = false, loop = false } = {}) => {
    const iframe = document.createElement("iframe");
    iframe.title = "YouTube video";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.setAttribute("allowfullscreen", "");
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
    });
    if (autoplay) params.set("autoplay", "1");
    if (mute) params.set("mute", "1");
    if (loop) {
      params.set("loop", "1");
      params.set("playlist", id);
    }
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?${params}`;
    return iframe;
  };

  // Homepage muted autoplay embeds — only mount over http(s).
  // Chrome treats file:// frames as unique origins and errors on YouTube iframes.
  $$("[data-yt-autoplay]").forEach((el) => {
    const id = el.getAttribute("data-yt-autoplay");
    if (!id) return;

    if (!isFileProtocol) {
      el.replaceChildren(createPlayer(id, { autoplay: true, mute: true, loop: true }));
      return;
    }

    const link = document.createElement("a");
    link.href = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "reel-fallback";
    link.innerHTML = `
      <img src="${ytThumb(id)}" alt="Reel thumbnail" loading="lazy">
      <span class="play-btn" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span>
    `;
    el.replaceChildren(link);
  });

  // Reel lightbox — create iframe only when opened (avoids file:// frame errors)
  const lightbox = $(".lightbox");
  const lightboxInner = lightbox ? $(".lightbox-inner", lightbox) : null;
  const openLightbox = (id) => {
    if (!lightbox || !lightboxInner || !id) return;
    if (isFileProtocol) {
      window.open(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, "_blank", "noopener,noreferrer");
      return;
    }
    lightboxInner.replaceChildren(createPlayer(id, { autoplay: true }));
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  };
  const closeLightbox = () => {
    if (!lightbox || !lightboxInner) return;
    lightbox.classList.remove("open");
    lightboxInner.replaceChildren();
    document.body.style.overflow = "";
  };
  $$("[data-yt]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openLightbox(el.getAttribute("data-yt"));
    });
  });
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox || e.target.closest(".lightbox-close")) {
        closeLightbox();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  // Reels page: prefer local boomerang GIF; otherwise mute-loop a mid-clip YouTube preview.
  const BOOM_HALF = 0.65; // seconds each side of midpoint
  const loadYtApi = () =>
    new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve(window.YT);
        return;
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        resolve(window.YT);
      };
      if (![...document.scripts].some((s) => (s.src || "").includes("youtube.com/iframe_api"))) {
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    });

  const tryBoomGif = (img) =>
    new Promise((resolve) => {
      const gif = img.getAttribute("data-boom-gif");
      if (!gif) {
        resolve(false);
        return;
      }
      const probe = new Image();
      probe.onload = () => {
        img.src = gif;
        resolve(true);
      };
      probe.onerror = () => resolve(false);
      probe.src = gif;
    });

  const mountMidLoop = (card, id) => {
    const host = $(".reel-boom", card);
    if (!host || host.dataset.ready) return;
    host.dataset.ready = "1";
    const mount = document.createElement("div");
    host.appendChild(mount);

    loadYtApi().then((YT) => {
      let start = 0;
      let end = 0;
      let timer = null;
      const player = new YT.Player(mount, {
        videoId: id,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          iv_load_policy: 3,
          fs: 0,
          disablekb: 1,
        },
        events: {
          onReady: (e) => {
            const p = e.target;
            const duration = p.getDuration() || 0;
            if (!duration || duration < 1) return;
            const mid = duration / 2;
            start = Math.max(0.05, mid - BOOM_HALF);
            end = Math.min(duration - 0.05, mid + BOOM_HALF);
            p.mute();
            p.seekTo(start, true);
            p.playVideo();
            card.classList.add("is-booming");
            timer = window.setInterval(() => {
              try {
                const t = p.getCurrentTime();
                if (t >= end || t < start - 0.2) p.seekTo(start, true);
              } catch (_) {}
            }, 120);
          },
          onStateChange: (e) => {
            if (e.data === YT.PlayerState.ENDED) {
              e.target.seekTo(start, true);
              e.target.playVideo();
            }
          },
          onError: () => {
            if (timer) window.clearInterval(timer);
            card.classList.remove("is-booming");
          },
        },
      });
      card._boomCleanup = () => {
        if (timer) window.clearInterval(timer);
        try {
          player.destroy();
        } catch (_) {}
      };
    });
  };

  const boomCards = $$("[data-yt-boom]");
  if (boomCards.length) {
    boomCards.forEach(async (card) => {
      const id = card.getAttribute("data-yt");
      const poster = $(".reel-poster", card);
      const hasGif = poster ? await tryBoomGif(poster) : false;
      if (hasGif) {
        card.classList.add("has-boom-gif");
        return;
      }
      if (isFileProtocol || !id) return;
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                mountMidLoop(card, id);
                io.unobserve(card);
              }
            });
          },
          { threshold: 0.35 }
        );
        io.observe(card);
      } else {
        mountMidLoop(card, id);
      }
    });
  }

  // Active nav highlight
  const path = location.pathname.replace(/\/$/, "") || "/";
  $$(".nav-links a, .mobile-nav a").forEach((a) => {
    const href = a.getAttribute("href") || "";
    const page = path.endsWith(".html")
      ? path.split("/").pop().replace(".html", "")
      : path.split("/").filter(Boolean).pop() || "";
    if (
      href.includes("works") &&
      (path.includes("/works") || page === "works")
    ) {
      if (
        href === "./works.html" ||
        href === "/works" ||
        href.endsWith("works.html")
      ) {
        a.classList.add("active");
      }
    } else if (href.includes(page) && page) {
      a.classList.add("active");
    }
  });
})();
