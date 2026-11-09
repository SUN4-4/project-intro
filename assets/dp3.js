const DATA_URL = "data/dp3/loop.json";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function pct(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${(number * 100).toFixed(1)}%` : "—";
}

function shortPath(value) {
  if (!value) return "—";
  const parts = String(value).split("/");
  return parts.slice(-2).join("/");
}

function badge(text, ok) {
  return el("span", `dp3-badge ${ok ? "ok" : "fail"}`, text);
}

function video(src) {
  if (!src) return null;
  const node = document.createElement("video");
  node.className = "dp3-video";
  node.controls = true;
  node.preload = "metadata";
  node.src = src;
  return node;
}

function renderSummary(data) {
  const latest = data.latest_eval || {};
  const set = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };
  set("[data-dp3-experiment]", data.experiment || "—");
  set("[data-dp3-task]", data.task || "—");
  set("[data-dp3-best]", pct(data.best_success_rate));
  set("[data-dp3-status]", data.status || "—");
  if (latest.total) {
    const node = document.querySelector("[data-dp3-best]");
    if (node) node.textContent = `${pct(data.best_success_rate)} (${latest.successes}/${latest.total})`;
  }
}

function renderRound(round) {
  const section = el("section", "dp3-round");
  const head = el("div", "dp3-round__head");
  head.append(el("h2", "", `Round ${round.round}`));
  const status = String(round.status || "running");
  head.append(badge(status, status === "success"));
  section.append(head);

  const grid = el("div", "dp3-grid");

  const collect = el("div", "dp3-card");
  collect.append(el("h3", "", "Agent 采集"));
  const collectData = round.collect || {};
  collect.append(
    el(
      "p",
      "",
      `${collectData.successes || 0} / ${collectData.max_attempts || 0} 次 agent 尝试成功`,
    ),
  );
  const attempts = collectData.attempts || [];
  if (attempts.length) {
    const list = el("ul");
    attempts.forEach((attempt) => {
      const item = el(
        "li",
        "",
        `seed ${attempt.seed} · ${attempt.success ? "success" : "fail"} · ${attempt.tool_calls ?? "?"} tool calls`,
      );
      const link = video(attempt.video_url);
      if (link) item.append(link);
      list.append(item);
    });
    collect.append(list);
  }
  grid.append(collect);

  const dataset = el("div", "dp3-card");
  dataset.append(el("h3", "", "DP3 数据集"));
  const ds = round.dataset || {};
  dataset.append(
    el("p", "", `${ds.episodes || 0} episodes · ${ds.frames || 0} frames`),
  );
  if (ds.shape) {
    dataset.append(
      el(
        "p",
        "",
        `state ${ds.shape.state_dim} · action ${ds.shape.action_dim} · points ${ds.shape.num_points}`,
      ),
    );
  }
  if (ds.dataset_path) dataset.append(el("p", "", shortPath(ds.dataset_path)));
  grid.append(dataset);

  const train = el("div", "dp3-card");
  train.append(el("h3", "", "DP3 训练"));
  const tr = round.train || {};
  if (tr.checkpoint) {
    train.append(el("p", "", `checkpoint: ${shortPath(tr.checkpoint)}`));
    train.append(el("p", "", `output: ${shortPath(tr.output_dir)}`));
  } else {
    train.append(el("p", "", tr.error ? `error: ${tr.error}` : "尚未产生 checkpoint"));
  }
  grid.append(train);

  const evalCard = el("div", "dp3-card");
  evalCard.append(el("h3", "", "DP3 评测"));
  const ev = round.eval || {};
  if (ev.total) {
    evalCard.append(
      el("p", "", `${pct(ev.success_rate)} · ${ev.successes}/${ev.total} seeds`),
    );
  } else {
    evalCard.append(el("p", "", ev.error ? `error: ${ev.error}` : "等待评测"));
  }
  const episodes = ev.episodes || [];
  episodes.forEach((episode) => {
    const item = el(
      "p",
      "",
      `seed ${episode.seed} · ${episode.success ? "success" : "fail"} · ${episode.steps} steps`,
    );
    if (episode.error) item.textContent += ` · ${episode.error}`;
    evalCard.append(item);
    const player = video(episode.video_url);
    if (player) evalCard.append(player);
  });
  grid.append(evalCard);

  if (round.analysis) {
    const analysis = el("div", "dp3-card");
    analysis.append(el("h3", "", "Reviewer 调整"));
    analysis.append(el("p", "", round.analysis.diagnosis || "—"));
    analysis.append(
      el(
        "p",
        "",
        `next: collect ${round.analysis.collect_successes ?? "?"} · epochs ${round.analysis.epochs ?? "?"} · max_steps ${round.analysis.max_steps ?? "?"}`,
      ),
    );
    grid.append(analysis);
  }

  section.append(grid);
  return section;
}

async function main() {
  const empty = document.querySelector("[data-dp3-empty]");
  const root = document.querySelector("[data-dp3-rounds]");
  if (!root) return;
  try {
    const response = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderSummary(data);
    const rounds = data.rounds || [];
    if (!rounds.length) throw new Error("no rounds");
    if (empty) empty.hidden = true;
    root.replaceChildren(...rounds.map(renderRound));
  } catch {
    if (empty) empty.hidden = false;
  }
}

main();
