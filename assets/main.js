const header = document.querySelector("[data-header]");
const nav = document.querySelector("[data-nav]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const year = document.querySelector("[data-current-year]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (year) {
  year.textContent = new Date().getFullYear();
}

function closeNavigation() {
  if (!nav || !navToggle) return;

  nav.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "打开导航菜单");
}

navToggle?.addEventListener("click", () => {
  const willOpen = navToggle.getAttribute("aria-expanded") !== "true";

  nav?.classList.toggle("is-open", willOpen);
  navToggle.setAttribute("aria-expanded", String(willOpen));
  navToggle.setAttribute("aria-label", willOpen ? "关闭导航菜单" : "打开导航菜单");
});

navLinks.forEach((link) => link.addEventListener("click", closeNavigation));

document.addEventListener("click", (event) => {
  if (!nav?.classList.contains("is-open")) return;
  if (nav.contains(event.target) || navToggle?.contains(event.target)) return;

  closeNavigation();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeNavigation();
});

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
}

let scrollTicking = false;
window.addEventListener(
  "scroll",
  () => {
    if (scrollTicking) return;

    scrollTicking = true;
    window.requestAnimationFrame(() => {
      updateHeader();
      updateActiveNavigation();
      scrollTicking = false;
    });
  },
  { passive: true },
);

updateHeader();

const sections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function updateActiveNavigation() {
  const marker = window.innerHeight * 0.36;
  let currentSection = null;

  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= marker) {
      currentSection = section;
    }
  });

  navLinks.forEach((link) => {
    const isActive = currentSection
      ? link.getAttribute("href") === `#${currentSection.id}`
      : false;

    link.classList.toggle("is-active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

updateActiveNavigation();

const revealItems = [...document.querySelectorAll("[data-reveal]")];

if (reduceMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");

        if (entry.target.matches(".progress__intro")) {
          entry.target.querySelector(".progress-meter")?.classList.add("is-visible");
        }

        observer.unobserve(entry.target);
      });
    },
    {
      rootMargin: "0px 0px -8% 0px",
      threshold: 0.12,
    },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}
