(() => {
  const reducedMotion = false;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const sameOrigin = (url) => url.origin === window.location.origin;
  let activeScroll = null;
  let progressTimer = null;
  let pointerFrame = null;
  let cursorFrame = null;
  let cursorX = window.innerWidth * 0.5;
  let cursorY = window.innerHeight * 0.45;
  let targetX = cursorX;
  let targetY = cursorY;
  let lastX = cursorX;
  let lastY = cursorY;
  let cursorVisible = false;
  let lastMagicAt = 0;
  let magicIndex = 0;

  function ensureLayer(id, className, html = "") {
    let layer = document.getElementById(id);
    if (!layer) {
      layer = document.createElement("div");
      layer.id = id;
      layer.className = className;
      layer.setAttribute("aria-hidden", "true");
      layer.innerHTML = html;
      document.body.prepend(layer);
    } else if (!layer.classList.contains(className)) {
      layer.classList.add(className);
    }
    return layer;
  }

  const magicLayer = ensureLayer("magic-layer", "magic-layer");
  const routeTransition = ensureLayer("route-transition", "route-transition");
  const routeProgress = ensureLayer("route-progress", "route-progress");
  const cursor = ensureLayer(
    "spatial-cursor",
    "spatial-cursor",
    '<span class="cursor-shadow"></span><span class="cursor-ruler"></span><span class="cursor-pin"></span>'
  );

  function navOffset() {
    const nav = document.querySelector(".nav");
    return nav ? Math.ceil(nav.getBoundingClientRect().height + 18) : 0;
  }

  function easeOutQuint(value) {
    return 1 - Math.pow(1 - value, 5);
  }

  function targetTop(hash) {
    if (!hash || hash === "#") {
      return null;
    }
    const target = document.querySelector(hash);
    if (!target) {
      return null;
    }
    return hash === "#top" ? 0 : Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - navOffset()));
  }

  function playRouteTransition() {
    if (reducedMotion) {
      return;
    }
    routeTransition.classList.remove("is-active");
    void routeTransition.offsetWidth;
    routeTransition.classList.add("is-active");
  }

  function startProgress() {
    clearTimeout(progressTimer);
    routeProgress.classList.add("is-active");
    routeProgress.style.transform = "scaleX(0.08)";
    window.requestAnimationFrame(() => {
      routeProgress.style.transition = reducedMotion ? "none" : "transform 520ms var(--ease)";
      routeProgress.style.transform = "scaleX(0.78)";
    });
  }

  function finishProgress() {
    clearTimeout(progressTimer);
    routeProgress.style.transition = reducedMotion ? "none" : "transform 180ms var(--ease), opacity 180ms var(--ease)";
    routeProgress.style.transform = "scaleX(1)";
    progressTimer = window.setTimeout(() => {
      routeProgress.classList.remove("is-active");
      routeProgress.style.transition = "";
      routeProgress.style.transform = "scaleX(0)";
    }, 210);
  }

  function markArrival(target) {
    if (!target) {
      return;
    }
    target.classList.remove("is-arriving");
    void target.offsetWidth;
    target.classList.add("is-arriving");
    window.setTimeout(() => target.classList.remove("is-arriving"), 560);
  }

  function animateScrollTo(top, target, done) {
    if (activeScroll !== null) {
      cancelAnimationFrame(activeScroll);
      activeScroll = null;
    }

    const start = window.scrollY;
    const distance = top - start;
    const duration = reducedMotion ? 0 : Math.min(820, Math.max(320, Math.abs(distance) * 0.28));
    const startedAt = performance.now();
    document.body.classList.add("is-traveling");
    playRouteTransition();
    startProgress();

    function end() {
      activeScroll = null;
      document.body.classList.remove("is-traveling");
      finishProgress();
      markArrival(target);
      done?.();
    }

    function step(now) {
      if (duration === 0) {
        window.scrollTo(0, top);
        end();
        return;
      }
      const raw = Math.min(1, (now - startedAt) / duration);
      const eased = easeOutQuint(raw);
      window.scrollTo(0, Math.round(start + distance * eased));
      routeProgress.style.transform = `scaleX(${Math.max(0.08, eased)})`;
      if (raw < 1) {
        activeScroll = requestAnimationFrame(step);
        return;
      }
      end();
    }

    activeScroll = requestAnimationFrame(step);
  }

  function closeMobileMenu() {
    const menuToggle = document.getElementById("nav-menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");
    if (!menuToggle || !mobileMenu) {
      return;
    }
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open menu");
    mobileMenu.classList.remove("is-open");
  }

  function createSpark(x, y, index, count = 12) {
    if (reducedMotion) {
      return;
    }
    const spark = document.createElement("span");
    const colors = ["#81e7d4", "#f4c95d", "#ff7f6e", "#79a7ff", "#f3efe6"];
    const angle = (Math.PI * 2 * index) / count;
    const distance = 30 + Math.random() * 72;
    spark.className = "spark";
    spark.style.left = `${x}px`;
    spark.style.top = `${y}px`;
    spark.style.setProperty("--spark-size", `${3 + Math.random() * 5}px`);
    spark.style.setProperty("--spark-color", colors[index % colors.length]);
    spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
    spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance - 36}px`);
    magicLayer.appendChild(spark);
    window.setTimeout(() => spark.remove(), 780);
  }

  function trimMagic() {
    const wisps = magicLayer.querySelectorAll(".magic-wisp, .magic-ripple");
    if (wisps.length <= 42) {
      return;
    }
    [...wisps].slice(0, wisps.length - 42).forEach((item) => item.remove());
  }

  function createMagicTrail(x, y, dx, dy) {
    if (!finePointer) {
      return;
    }

    const now = performance.now();
    if (now - lastMagicAt < 44) {
      return;
    }
    lastMagicAt = now;
    magicIndex += 1;

    const colors = ["#81e7d4", "#f4c95d", "#ff7f6e", "#79a7ff", "#f3efe6"];
    const speed = Math.min(1, Math.hypot(dx, dy) / 52);
    const baseAngle = Math.atan2(dy || -1, dx || 1);
    const scatter = (magicIndex % 3 - 1) * 0.42;
    const drift = 24 + speed * 42;
    const wisp = document.createElement("span");

    wisp.className = "magic-wisp";
    wisp.style.setProperty("--magic-x", `${x}px`);
    wisp.style.setProperty("--magic-y", `${y}px`);
    wisp.style.setProperty("--wisp-size", `${5 + speed * 5}px`);
    wisp.style.setProperty("--wisp-color", colors[magicIndex % colors.length]);
    wisp.style.setProperty("--wisp-angle", `${baseAngle * (180 / Math.PI)}deg`);
    wisp.style.setProperty("--wisp-dx", `${Math.cos(baseAngle + Math.PI + scatter) * drift}px`);
    wisp.style.setProperty("--wisp-dy", `${Math.sin(baseAngle + Math.PI + scatter) * drift}px`);
    magicLayer.appendChild(wisp);
    window.setTimeout(() => wisp.remove(), 920);

    if (magicIndex % 5 === 0) {
      const ripple = document.createElement("span");
      ripple.className = "magic-ripple";
      ripple.style.setProperty("--magic-x", `${x}px`);
      ripple.style.setProperty("--magic-y", `${y}px`);
      magicLayer.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 820);
    }

    trimMagic();
  }

  function burstFrom(element, count = 12) {
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    for (let index = 0; index < count; index += 1) {
      createSpark(x, y, index, count);
    }
  }

  function handleLinkClick(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) {
      return;
    }

    const href = link.getAttribute("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }

    const url = new URL(href, window.location.href);
    if (!sameOrigin(url)) {
      return;
    }

    const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
    if (samePage && url.hash) {
      const top = targetTop(url.hash);
      if (top === null) {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMobileMenu();
      burstFrom(link, 10);
      animateScrollTo(top, document.querySelector(url.hash), () => {
        history.pushState(null, "", url.hash);
      });
      return;
    }

    if (url.href !== window.location.href) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMobileMenu();
      burstFrom(link, 10);
      document.body.classList.add("is-linking");
      playRouteTransition();
      startProgress();
      window.setTimeout(() => {
        window.location.href = url.href;
      }, reducedMotion ? 0 : 340);
    }
  }

  function alignInitialHash() {
    if (!window.location.hash) {
      return;
    }
    const top = targetTop(window.location.hash);
    if (top === null) {
      return;
    }
    window.requestAnimationFrame(() => {
      window.scrollTo(0, top);
      markArrival(document.querySelector(window.location.hash));
    });
  }

  function setupReveals() {
    const selectors = [
      ".hero-inner",
      ".page-hero img",
      ".section-head",
      ".case-study",
      ".service-detail",
      ".principle",
      ".faq",
      ".stat",
      ".card",
      ".step",
      ".image-panel",
      ".studio-card",
      ".copy",
      ".timeline",
      ".cta-band"
    ];
    const elements = [...document.querySelectorAll(selectors.join(","))].filter((element) => !element.closest(".mobile-menu"));

    elements.forEach((element, index) => {
      if (!element.classList.contains("reveal")) {
        element.classList.add("reveal");
      }
      element.style.transitionDelay = `${Math.min(index % 5, 4) * 55}ms`;
    });

    if (!("IntersectionObserver" in window) || reducedMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.14 }
    );

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        element.classList.add("is-visible");
      } else {
        observer.observe(element);
      }
    });
  }

  function updateScrolledState() {
    document.body.classList.toggle("has-scrolled", window.scrollY > 18);
  }

  function renderCursor() {
    const dx = targetX - cursorX;
    const dy = targetY - cursorY;
    cursorX += dx * 0.18;
    cursorY += dy * 0.18;

    const velocityX = cursorX - lastX;
    const velocityY = cursorY - lastY;
    lastX = cursorX;
    lastY = cursorY;
    const angle = Math.atan2(velocityY, velocityX || 0.001) * 0.18;
    const speed = Math.min(1, Math.hypot(velocityX, velocityY) / 28);
    const scale = 0.92 + speed * 0.11;

    cursor.style.transform = `translate3d(${cursorX - 46}px, ${cursorY - 46}px, 0) rotate(${angle}rad) scale(${scale})`;
    document.body.style.setProperty("--cursor-x", `${cursorX}px`);
    document.body.style.setProperty("--cursor-y", `${cursorY}px`);
    createMagicTrail(cursorX, cursorY, velocityX, velocityY);

    if (cursorVisible) {
      cursorFrame = requestAnimationFrame(renderCursor);
    } else {
      cursorFrame = null;
    }
  }

  function setupCursor() {
    if (!finePointer) {
      cursor.remove();
      return;
    }

    window.addEventListener(
      "pointermove",
      (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        cursorVisible = true;
        document.body.classList.add("cursor-active");

        if (pointerFrame === null) {
          pointerFrame = requestAnimationFrame(() => {
            pointerFrame = null;
            document.body.style.setProperty("--cursor-x", `${targetX}px`);
            document.body.style.setProperty("--cursor-y", `${targetY}px`);
          });
        }

        if (cursorFrame === null) {
          cursorFrame = requestAnimationFrame(renderCursor);
        }
      },
      { passive: true }
    );

    window.addEventListener("pointerleave", () => {
      cursorVisible = false;
      document.body.classList.remove("cursor-active");
    });
  }

  document.documentElement.classList.add("site-motion");
  document.body.classList.add("site-motion-ready");
  document.addEventListener("click", handleLinkClick, true);
  window.addEventListener("scroll", updateScrolledState, { passive: true });
  window.addEventListener("pageshow", () => {
    document.body.classList.remove("is-linking");
    finishProgress();
  });

  setupCursor();
  setupReveals();
  updateScrolledState();
  alignInitialHash();
})();
