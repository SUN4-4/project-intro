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
const benchmarkData = Array.isArray(window.BM_CATALOG?.groups)
  ? window.BM_CATALOG.groups
  : Array.isArray(window.BENCHMARK_TASKS)
    ? window.BENCHMARK_TASKS
    : [];

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
  card.dataset.bmId = task.bm_id;
  card.dataset.search = [
    task.bm_id,
    task.id,
    task.name,
    task.display_name,
    task.instruction,
    task.suite,
    task.suite_label,
    task.rooms,
    task.room_labels,
    task.variants,
    task.source_ids,
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

  if (task.blender_status === "built" || task.blender_status === "captured") {
    const blender = document.createElement("span");
    blender.className = "task-card__blender";
    blender.textContent =
      task.blender_status === "built" ? "Blender 已重建" : "Blender 已采集";
    media.append(blender);
  }

  const videoSlot = document.createElement("div");
  videoSlot.className = "task-card__video-slot";
  videoSlot.dataset.videoSlot = task.bm_id;

  const successVideo =
    task.success_video_url || task.agent_success_video_url || null;
  const failureVideo =
    task.failure_video_url || task.agent_last_failure_video_url || null;

  if (successVideo || failureVideo) {
    const appendPlayer = (src, kind) => {
      const player = document.createElement("video");
      player.className = "task-card__video-player";
      player.controls = true;
      player.preload = "metadata";
      player.src = src;

      const label = document.createElement("span");
      label.className = `task-card__video-kind task-card__video-kind--${kind}`;
      label.textContent =
        kind === "failure"
          ? "最后一次失败回放"
          : task.success_video_label || "Agent 成功执行视频";

      videoSlot.append(player, label);
    };

    if (successVideo) {
      appendPlayer(successVideo, "success");
    }
    if (failureVideo && failureVideo !== successVideo) {
      appendPlayer(failureVideo, "failure");
    }
  } else {
    const play = document.createElement("span");
    play.className = "task-card__video-play";
    play.setAttribute("aria-hidden", "true");
    play.textContent = "▶";

    const copy = document.createElement("span");
    copy.className = "task-card__video-copy";

    const title = document.createElement("strong");
    title.textContent = "视频待接入";

    const subtitle = document.createElement("small");
    subtitle.textContent = `${task.bm_id} · VIDEO SLOT`;

    copy.append(title, subtitle);
    videoSlot.append(play, copy);
  }

  const body = document.createElement("div");
  body.className = "task-card__body";

  const ids = document.createElement("div");
  ids.className = "task-card__ids";

  const id = document.createElement("span");
  id.className = "task-card__id";
  id.textContent = task.bm_id || task.id;

  const sourceId = document.createElement("span");
  sourceId.className = "task-card__source-id";
  sourceId.textContent = task.id;

  ids.append(id, sourceId);

  const name = document.createElement("h4");
  name.className = "task-card__name";
  name.textContent = task.display_name || task.name;

  const instruction = document.createElement("p");
  instruction.className = "task-card__instruction";
  instruction.textContent = task.instruction;

  body.append(ids, name, instruction);

  const execStatus = task.agent_status || task.exec_status;
  if (execStatus) {
    const statusLabels = {
      success: "成功",
      failure: "失败",
      blocked: "阻塞",
      infra: "基础设施",
      not_run: "未运行",
      pending: "待执行",
      running: "运行中",
    };
    const exec = document.createElement("div");
    exec.className = `task-card__exec task-card__exec--${execStatus}`;

    const badge = document.createElement("span");
    badge.className = "exec-badge";
    if (execStatus === "success") {
      if (task.agent_confirmed_success === true) {
        badge.textContent = "成功（已复现）";
      } else if (task.agent_replay_status === "running") {
        badge.textContent = "成功（复现中）";
      } else if (task.agent_confirmed_success === false) {
        badge.textContent = "成功（未复现）";
      } else {
        badge.textContent =
          task.agent_success_kind === "soft" ? "软成功" : "成功";
      }
    } else {
      badge.textContent = statusLabels[execStatus] || execStatus;
    }
    exec.append(badge);

    const metrics = [];
    if (typeof task.exec_success_rate === "number") {
      metrics.push(`成功率 ${Math.round(task.exec_success_rate * 100)}%`);
    }
    const attempts = task.agent_attempts ?? task.exec_attempts;
    if (typeof attempts === "number") {
      metrics.push(`${attempts} 次尝试`);
    }
    const rounds = task.agent_rounds ?? task.exec_rounds;
    if (typeof rounds === "number") {
      metrics.push(`${rounds} 轮`);
    }
    const duration = task.agent_duration_s ?? task.exec_duration_s;
    if (typeof duration === "number") {
      metrics.push(`${Math.round(duration)}s`);
    }
    if (metrics.length) {
      const line = document.createElement("span");
      line.className = "task-card__exec-metrics";
      line.textContent = metrics.join(" · ");
      exec.append(line);
    }
    body.append(exec);

    const reasonText = task.agent_failure_reason || task.exec_failure_reason;
    if (reasonText) {
      const reason = document.createElement("p");
      reason.className = "task-card__exec-reason";
      reason.textContent = reasonText;
      body.append(reason);
    }
    if (task.agent_success_note) {
      const note = document.createElement("p");
      note.className = "task-card__exec-reason";
      note.textContent = `注意：${task.agent_success_note}`;
      body.append(note);
    }
    if (task.agent_clean_grasp_trajectory_url) {
      const trajectory = document.createElement("a");
      trajectory.className = "task-card__trajectory-link";
      trajectory.href = task.agent_clean_grasp_trajectory_url;
      trajectory.download = "";
      trajectory.textContent =
        task.agent_status === "success"
          ? "下载最后一次干净抓取轨迹 (JSON)"
          : "下载最后一次成功抓取动作轨迹（任务未完成）";
      body.append(trajectory);
    }
  }

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

  if (task.variants?.length) {
    const variants = document.createElement("p");
    variants.className = "task-card__meta task-card__variants";
    variants.textContent = `同族变体：${task.variants.join(" / ")}`;
    body.append(variants);
  }

  if (task.demo_video_url) {
    const video = document.createElement("a");
    video.className = "task-card__video";
    video.href = task.demo_video_url;
    video.target = "_blank";
    video.rel = "noopener";
    video.textContent = "官方演示视频";
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

  card.append(media, videoSlot, body);

  return card;
}

const runSummaryRoot = document.querySelector("[data-run-summary]");

function renderRunSummary() {
  if (!runSummaryRoot) return;

  const all = Array.isArray(window.BM_CATALOG?.tasks)
    ? window.BM_CATALOG.tasks
    : [];
  if (!all.length) return;

  const executed = all.filter(
    (task) => task.exec_status === "success" || task.exec_status === "failure",
  );
  const success = all.filter((task) => task.exec_status === "success").length;
  const blocked = all.filter((task) => task.exec_status === "blocked").length;
  const infra = all.filter((task) => task.exec_status === "infra").length;
  const notRun = all.filter((task) => task.exec_status === "not_run").length;
  const blenderBuilt = all.filter(
    (task) => task.blender_status === "built",
  ).length;
  const rounds = executed
    .map((task) => task.exec_rounds)
    .filter((value) => typeof value === "number");
  const durations = executed
    .map((task) => task.exec_duration_s)
    .filter((value) => typeof value === "number");
  const avgRounds = rounds.length
    ? (rounds.reduce((sum, value) => sum + value, 0) / rounds.length).toFixed(1)
    : "—";
  const totalHours = durations.length
    ? (durations.reduce((sum, value) => sum + value, 0) / 3600).toFixed(1)
    : "—";

  const rows = [
    ["有效判定", `${executed.length} / ${all.length}`],
    ["成功", `${success}`],
    ["失败", `${executed.length - success}`],
    ["阻塞 / 基础设施 / 未运行", `${blocked} / ${infra} / ${notRun}`],
    ["成功率（有效判定）", executed.length ? `${Math.round((success / executed.length) * 100)}%` : "—"],
    ["平均迭代轮数", avgRounds],
    ["累计执行时长", `${totalHours} h`],
    ["Blender 已重建", `${blenderBuilt} / ${all.length}`],
  ];

  runSummaryRoot.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "本轮真实执行结果";
  runSummaryRoot.append(title);

  const grid = document.createElement("dl");
  grid.className = "run-summary__grid";
  rows.forEach(([label, value]) => {
    const item = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    item.append(dt, dd);
    grid.append(item);
  });
  runSummaryRoot.append(grid);

  const note = document.createElement("p");
  note.className = "run-summary__note";
  note.textContent =
    "范围：5 个 benchmark、333 个 BM 任务。成功由仿真器谓词判定；infra 表示没有拿到有效判定（配额、网络或环境问题），不计为任务失败。" +
    "BEHAVIOR-1K 的 100 个任务因 OmniGibson / Isaac Sim 启动失败未执行，标为阻塞。";
  runSummaryRoot.append(note);
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
      label.textContent = `${group.label} · ${tasks[0].bm_id}–${tasks[tasks.length - 1].bm_id}`;
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
    taskStatus.textContent = `显示 ${visible} / ${taskCards.length} 个 BM 任务`;
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

renderRunSummary();
renderTaskGroups();
applyTaskFilters();
