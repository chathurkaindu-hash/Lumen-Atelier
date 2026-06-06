const menuToggle = document.getElementById("nav-menu-toggle");
const mobileMenu = document.getElementById("mobile-menu");

function setMobileMenu(open) {
  if (!menuToggle || !mobileMenu) {
    return;
  }
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  mobileMenu.classList.toggle("is-open", open);
}

function navOffset() {
  const nav = document.querySelector(".nav");
  return nav ? Math.ceil(nav.getBoundingClientRect().height + 18) : 0;
}

function alignToHash(hash) {
  const target = document.querySelector(hash);
  if (!target) {
    return false;
  }
  const top = Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - navOffset()));
  window.scrollTo({ top, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  return true;
}

document.querySelectorAll("[data-anchor]").forEach((link) => {
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    if (!hash || !hash.startsWith("#")) {
      return;
    }
    event.preventDefault();
    setMobileMenu(false);
    if (alignToHash(hash)) {
      history.pushState(null, "", hash);
    }
  });
});

menuToggle?.addEventListener("click", () => {
  setMobileMenu(!mobileMenu?.classList.contains("is-open"));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMobileMenu(false);
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 920) {
    setMobileMenu(false);
  }
});

window.addEventListener("load", () => {
  if (window.location.hash) {
    window.requestAnimationFrame(() => alignToHash(window.location.hash));
  }
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 1.8
      }
    });
  }
});
