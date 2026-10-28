const DATA_URL = "data/libero-plus/tasks.json";
const numberFormat = new Intl.NumberFormat("zh-CN");

const elements = {
  summary: document.querySelector("[data-lp-summary]"),
  loading: document.querySelector("[data-lp-loading]"),
  table: document.querySelector("[data-lp-table]"),
  empty: document.querySelector("[data-lp-empty]"),
  pagination: document.querySelector("[data-lp-pagination]"),
  search: document.querySelector("[data-lp-search]"),
  suite: document.querySelector("[data-lp-suite]"),
  category: document.querySelector("[data-lp-category]"),
  difficulty: document.querySelector("[data-lp-difficulty]"),
  pageSize: document.querySelector("[data-lp-page-size]"),
  reset: document.querySelector("[data-lp-reset]"),
  total: document.querySelector("[data-lp-total]"),
};

const state = {
  tasks: [],
  filtered: [],
  page: 1,
  pageSize: 100,
  query: "",
  suite: "all",
  category: "all",
  difficulty: "all",
};

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  state.query = params.get("q") || "";
  state.suite = params.get("suite") || "all";
  state.category = params.get("category") || "all";
  state.difficulty = params.get("difficulty") || "all";
  const page = Number(params.get("page") || "1");
  const size = Number(params.get("size") || "100");
  state.page = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  state.pageSize = [50, 100, 200].includes(size) ? size : 100;
}

function writeUrlState() {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.suite !== "all") params.set("suite", state.suite);
  if (state.category !== "all") params.set("category", state.category);
  if (state.difficulty !== "all") params.set("difficulty", state.difficulty);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.pageSize !== 100) params.set("size", String(state.pageSize));
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", url);
}

function fillOptions(select, values, labelFor) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = labelFor(value);
    select.append(option);
  });
}

function hydrateControls() {
  const suites = [...new Set(state.tasks.map((task) => task.suite))];
  const categories = [
    ...new Set(state.tasks.map((task) => task.category)),
  ];
  const suiteLabels = new Map(
    state.tasks.map((task) => [task.suite, task.suite_label]),
  );
  const categoryLabels = new Map(
    state.tasks.map((task) => [task.category, task.category_label]),
  );
  fillOptions(elements.suite, suites, (suite) => suiteLabels.get(suite) || suite);
  fillOptions(
    elements.category,
    categories,
    (category) => categoryLabels.get(category) || category,
  );
  [0, 1, 2, 3, 4, 5].forEach((level) => {
    const option = document.createElement("option");
    option.value = String(level);
    option.textContent = level === 0 ? "未分级（L0）" : `L${level}`;
    elements.difficulty.append(option);
  });

  state.suite = suites.includes(state.suite) ? state.suite : "all";
  state.category = categories.includes(state.category) ? state.category : "all";
  state.difficulty = ["0", "1", "2", "3", "4", "5"].includes(
    state.difficulty,
  )
    ? state.difficulty
    : "all";
  elements.search.value = state.query;
  elements.suite.value = state.suite;
  elements.category.value = state.category;
  elements.difficulty.value = state.difficulty;
  elements.pageSize.value = String(state.pageSize);
}

function applyFilters({ keepPage = false } = {}) {
  const query = state.query.trim().toLowerCase();
  const difficulty =
    state.difficulty === "all" ? null : Number(state.difficulty);

  state.filtered = state.tasks.filter((task) => {
    if (state.suite !== "all" && task.suite !== state.suite) return false;
    if (state.category !== "all" && task.category !== state.category) return false;
    if (difficulty !== null && task.difficulty !== difficulty) return false;
    if (!query) return true;
    return [
      task.id,
      task.name,
      task.base_task,
      task.display_name,
      task.instruction,
      task.category,
      task.category_label,
      task.suite_label,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const totalPages = Math.max(
    1,
    Math.ceil(state.filtered.length / state.pageSize),
  );
  if (!keepPage) state.page = 1;
  state.page = Math.min(Math.max(1, state.page), totalPages);
  render();
}

function makeTag(text, className = "") {
  const tag = document.createElement("span");
  tag.className = `lp-tag ${className}`.trim();
  tag.textContent = text;
  return tag;
}

function renderRow(task) {
  const row = document.createElement("article");
  row.className = "lp-row";
  row.setAttribute("role", "listitem");

  const media = document.createElement("div");
  media.className = "lp-row__media";
  if (task.image) {
    const image = document.createElement("img");
    image.src = task.image;
    image.alt = `${task.suite_label} 仿真参考帧`;
    image.loading = "lazy";
    image.decoding = "async";
    media.append(image);
  }

  const main = document.createElement("div");
  main.className = "lp-row__main";

  const id = document.createElement("span");
  id.className = "lp-row__id";
  id.textContent = task.id;

  const name = document.createElement("h3");
  name.className = "lp-row__name";
  name.textContent = task.display_name || task.name;

  const raw = document.createElement("p");
  raw.className = "lp-row__raw";
  raw.textContent = task.name;
  raw.title = task.name;

  const instruction = document.createElement("p");
  instruction.className = "lp-row__instruction";
  instruction.textContent = task.instruction;

  const tags = document.createElement("div");
  tags.className = "lp-row__tags";
  tags.append(
    makeTag(task.suite_label, "lp-tag--suite"),
    makeTag(task.category_label),
  );

  const difficulty = document.createElement("span");
  difficulty.className = "lp-row__difficulty";
  difficulty.append("难度 ");
  const strong = document.createElement("strong");
  strong.textContent = task.difficulty_label || `L${task.difficulty}`;
  difficulty.append(strong);

  main.append(id, name, raw, instruction);
  row.append(media, main, tags, difficulty);
  return row;
}

function renderPagination(totalPages) {
  elements.pagination.replaceChildren();
  if (totalPages <= 1) return;

  const addButton = (label, page, { current = false, disabled = false } = {}) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    if (current) {
      button.classList.add("is-current");
      button.setAttribute("aria-current", "page");
    }
    button.addEventListener("click", () => {
      state.page = page;
      render();
      document
        .querySelector(".lp-catalog")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    elements.pagination.append(button);
  };

  addButton("上一页", state.page - 1, { disabled: state.page === 1 });
  const pages = new Set([1, totalPages]);
  for (let offset = -2; offset <= 2; offset += 1) {
    const page = state.page + offset;
    if (page >= 1 && page <= totalPages) pages.add(page);
  }
  let previous = 0;
  [...pages]
    .sort((a, b) => a - b)
    .forEach((page) => {
      if (previous && page - previous > 1) {
        const gap = document.createElement("span");
        gap.textContent = "…";
        elements.pagination.append(gap);
      }
      addButton(String(page), page, { current: page === state.page });
      previous = page;
    });
  addButton("下一页", state.page + 1, {
    disabled: state.page === totalPages,
  });
}

function render() {
  const total = state.filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  const start = (state.page - 1) * state.pageSize;
  const end = Math.min(start + state.pageSize, total);
  const visible = state.filtered.slice(start, end);

  elements.table.replaceChildren(...visible.map(renderRow));
  elements.empty.hidden = total !== 0;
  elements.summary.textContent =
    total === 0
      ? "0 个任务匹配"
      : `显示 ${numberFormat.format(start + 1)}–${numberFormat.format(end)} / ${numberFormat.format(total)} 个任务（全量 ${numberFormat.format(state.tasks.length)}）`;
  elements.total.textContent = numberFormat.format(state.tasks.length);
  renderPagination(totalPages);
  writeUrlState();
}

function resetFilters() {
  state.query = "";
  state.suite = "all";
  state.category = "all";
  state.difficulty = "all";
  state.page = 1;
  elements.search.value = "";
  elements.suite.value = "all";
  elements.category.value = "all";
  elements.difficulty.value = "all";
  applyFilters();
}

let searchTimer = 0;
elements.search?.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    state.query = elements.search.value;
    applyFilters();
  }, 150);
});

elements.suite?.addEventListener("change", () => {
  state.suite = elements.suite.value;
  applyFilters();
});
elements.category?.addEventListener("change", () => {
  state.category = elements.category.value;
  applyFilters();
});
elements.difficulty?.addEventListener("change", () => {
  state.difficulty = elements.difficulty.value;
  applyFilters();
});
elements.pageSize?.addEventListener("change", () => {
  state.pageSize = Number(elements.pageSize.value);
  state.page = 1;
  applyFilters();
});
elements.reset?.addEventListener("click", resetFilters);

async function load() {
  readUrlState();
  try {
    const response = await fetch(DATA_URL, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.tasks = (payload.tasks || []).slice().sort((a, b) => {
      if (a.suite !== b.suite) return a.suite.localeCompare(b.suite);
      return a.index - b.index;
    });
    hydrateControls();
    applyFilters({ keepPage: true });
    elements.loading.hidden = true;
  } catch (error) {
    elements.loading.hidden = true;
    elements.summary.textContent = `加载失败：${error.message}。请通过 HTTP 打开页面（GitHub Pages 或本地 http.server）。`;
    elements.empty.hidden = false;
  }
}

load();
