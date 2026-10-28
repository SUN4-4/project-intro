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

const taskGroupsRoot = document.querySelector("[data-task-groups]");
const taskSearchInput = document.querySelector("[data-task-search]");
const taskStatus = document.querySelector("[data-task-status]");
const taskEmpty = document.querySelector("[data-task-empty]");
const benchmarkFilters = [...document.querySelectorAll("[data-benchmark-filter]")];
const benchmarkData = Array.isArray(window.BENCHMARK_TASKS) ? window.BENCHMARK_TASKS : [];

const IMAGE_KIND_LABELS = {
  scene_layout: "场景平面图",
  demo_thumbnail: "官方演示截图",
};

const IMAGE_KIND_ALT = {
  scene_layout: "场景平面图",
  demo_thumbnail: "官方演示截图",
};

const taskCards = [];
const taskGroupElements = [];
let activeBenchmark = "all";

function createTaskCard(task, dataDir) {
  const card = document.createElement("article");
  card.className = "task-card";
  card.dataset.benchmark = task.benchmark;
  card.dataset.search = [
    task.id,
    task.name,
    task.display_name,
    task.instruction,
    task.suite,
    task.suite_label,
    task.rooms,
    task.room_labels,
    task.goal_raw,
    task.goal_summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const media = document.createElement("div");
  media.className = "task-card__media";

  if (task.image_kind) {
    const badge = document.createElement("span");
    badge.className = "task-card__badge";
    badge.textContent = IMAGE_KIND_LABELS[task.image_kind] || task.image_kind;
    if (task.note) badge.title = task.note;
    media.append(badge);
  }

  const image = document.createElement("img");
  image.src = `${dataDir}/${task.image}`;
  image.alt = `${task.name} ${IMAGE_KIND_ALT[task.image_kind] || "渲染图"}`;
  image.loading = "lazy";
  image.decoding = "async";
  image.width = 320;
  image.height = 240;
  media.append(image);

  const body = document.createElement("div");
  body.className = "task-card__body";

  const id = document.createElement("span");
  id.className = "task-card__id";
  id.textContent = task.id;

  const name = document.createElement("h4");
  name.className = "task-card__name";
  name.textContent = task.display_name || task.name;

  const instruction = document.createElement("p");
  instruction.className = "task-card__instruction";
  instruction.textContent = task.instruction;

  body.append(id, name, instruction);

  const meta = [
    ...(task.room_labels || []),
    task.duration_seconds
      ? `${Math.round(task.duration_seconds / 60)} 分钟`
      : "",
  ].filter(Boolean);
  if (meta.length) {
    const metaLine = document.createElement("p");
    metaLine.className = "task-card__meta";
    metaLine.textContent = meta.join(" · ");
    body.append(metaLine);
  }

  if (task.video_url) {
    const video = document.createElement("a");
    video.className = "task-card__video";
    video.href = task.video_url;
    video.target = "_blank";
    video.rel = "noopener";
    video.textContent = "观看演示视频";
    body.append(video);
  }

  if (task.goal_raw) {
    const goal = document.createElement("details");
    goal.className = "task-card__goal";

    const goalSummary = document.createElement("summary");
    goalSummary.textContent = "查看目标条件";

    const goalRaw = document.createElement("code");
    goalRaw.className = "task-card__goal-raw";
    goalRaw.textContent = task.goal_raw;

    goal.append(goalSummary, goalRaw);
    body.append(goal);
  }

  card.append(media, body);

  return card;
}

function renderTaskGroups() {
  if (!taskGroupsRoot) return;

  benchmarkData.forEach((group) => {
    const suites = new Map();

    group.tasks.forEach((task) => {
      const suite = task.suite || group.benchmark;
      if (!suites.has(suite)) suites.set(suite, []);
      suites.get(suite).push({ ...task, benchmark: group.benchmark });
    });

    suites.forEach((tasks, suite) => {
      const details = document.createElement("details");
      details.className = "task-group";
      details.open = true;
      details.dataset.benchmark = group.benchmark;

      const summary = document.createElement("summary");
      summary.className = "task-group__summary";

      const title = document.createElement("h3");
      title.className = "task-group__title";
      title.textContent = tasks[0].suite_label || suite;

      const label = document.createElement("small");
      label.textContent = group.label;
      title.append(label);

      const count = document.createElement("span");
      count.className = "task-group__count";
      count.textContent = `${tasks.length} 个任务`;

      summary.append(title, count);

      const grid = document.createElement("div");
      grid.className = "task-grid";

      tasks.forEach((task) => {
        const card = createTaskCard(task, group.dataDir);
        taskCards.push(card);
        grid.append(card);
      });

      details.append(summary, grid);
      taskGroupsRoot.append(details);
      taskGroupElements.push(details);
    });
  });
}

function applyTaskFilters() {
  const query = (taskSearchInput?.value || "").trim().toLowerCase();
  let visible = 0;

  taskCards.forEach((card) => {
    const matchesBenchmark =
      activeBenchmark === "all" || card.dataset.benchmark === activeBenchmark;
    const matchesQuery = !query || card.dataset.search.includes(query);
    const show = matchesBenchmark && matchesQuery;

    card.hidden = !show;
    if (show) visible += 1;
  });

  taskGroupElements.forEach((group) => {
    const hasVisibleCard = [...group.querySelectorAll(".task-card")].some(
      (card) => !card.hidden,
    );
    group.hidden = !hasVisibleCard;
  });

  if (taskStatus) {
    taskStatus.textContent = `显示 ${visible} / ${taskCards.length} 个任务`;
  }

  if (taskEmpty) {
    taskEmpty.hidden = visible !== 0;
  }
}

benchmarkFilters.forEach((button) => {
  button.addEventListener("click", () => {
    activeBenchmark = button.dataset.benchmarkFilter || "all";

    benchmarkFilters.forEach((item) => {
      const isActive = item === button;
      item.classList.toggle("is-active", isActive);
      item.setAttribute("aria-pressed", String(isActive));
    });

    applyTaskFilters();
  });
});

taskSearchInput?.addEventListener("input", applyTaskFilters);

renderTaskGroups();
applyTaskFilters();
