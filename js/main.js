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

  // Reel lightbox — create iframe only when opened (avoids file:// frame errors)
  const lightbox = $(".lightbox");
  const lightboxInner = lightbox ? $(".lightbox-inner", lightbox) : null;
  const openLightbox = (id) => {
    if (!lightbox || !lightboxInner || !id) return;
    lightboxInner.replaceChildren();
    const iframe = document.createElement("iframe");
    iframe.title = "Reel";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(
      id
    )}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    lightboxInner.appendChild(iframe);
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
