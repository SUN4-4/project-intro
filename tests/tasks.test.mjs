import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

globalThis.window = {};
await import("../assets/tasks.js");

const catalog = globalThis.window.BM_CATALOG;
const groups = catalog.groups;
const allTasks = catalog.tasks;

const expectedCounts = {
  libero: 130,
  robotwin: 50,
  behavior: 100,
  robosuite: 11,
  robodojo: 42,
};

const expectedRanges = [
  ["libero", 130, "BM-001", "BM-130"],
  ["robotwin", 50, "BM-131", "BM-180"],
  ["behavior", 100, "BM-181", "BM-280"],
  ["robosuite", 11, "BM-281", "BM-291"],
  ["robodojo", 42, "BM-292", "BM-333"],
];

function localPath(relativePath) {
  return fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
}

test("BM catalog covers every deployed benchmark", () => {
  assert.equal(catalog.name, "BM");
  assert.equal(catalog.total, 333);
  assert.ok(Array.isArray(groups));
  assert.deepEqual(
    Object.fromEntries(groups.map((group) => [group.benchmark, group.tasks.length])),
    expectedCounts,
  );
  assert.deepEqual(
    groups.map((group) => [
      group.benchmark,
      group.tasks.length,
      group.bm_start,
      group.bm_end,
    ]),
    expectedRanges,
  );
  assert.equal(allTasks.length, 333);
});

test("every task has one sequential BM id", () => {
  const ids = allTasks.map((task) => task.bm_id);
  const expected = Array.from(
    { length: 333 },
    (_, index) => `BM-${String(index + 1).padStart(3, "0")}`,
  );
  assert.deepEqual(ids, expected);
  assert.equal(new Set(ids).size, ids.length);
  allTasks.forEach((task, index) => {
    assert.equal(task.bm_seq, index + 1);
    assert.ok(expectedCounts[task.benchmark], `${task.bm_id}: benchmark`);
  });
});

test("every task has an id, name, instruction and an existing image", () => {
  const missing = [];
  for (const task of allTasks) {
    assert.ok(task.id, "task id is required");
    assert.ok(task.bm_id, `${task.id}: BM id is required`);
    assert.ok(task.name, `${task.id}: name is required`);
    assert.ok(task.instruction?.trim(), `${task.id}: instruction is required`);
    assert.ok(task.image, `${task.id}: image is required`);
    const group = groups.find((item) => item.benchmark === task.benchmark);
    if (!existsSync(localPath(`${group.dataDir}/${task.image}`))) {
      missing.push(`${group.dataDir}/${task.image}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("every task reserves a success-video slot", () => {
  for (const task of allTasks) {
    if (task.video_status === "published") {
      assert.ok(task.success_video_url, `${task.bm_id}: published video URL`);
      assert.ok(
        existsSync(localPath(task.success_video_url)),
        `${task.bm_id}: published video file`,
      );
      continue;
    }
    assert.equal(task.video_status, "pending", `${task.bm_id}: video status`);
    assert.equal(task.success_video_url, null, `${task.bm_id}: success video`);
  }
});

test("robosuite keeps 11 task families and records merged variants", () => {
  const robosuite = allTasks.filter((task) => task.benchmark === "robosuite");
  assert.equal(robosuite.length, 11);

  const byId = Object.fromEntries(robosuite.map((task) => [task.id, task]));
  assert.deepEqual(byId.NutAssembly.variants, [
    "NutAssemblySingle",
    "NutAssemblySquare",
    "NutAssemblyRound",
  ]);
  assert.deepEqual(byId.PickPlace.variants, [
    "PickPlaceSingle",
    "PickPlaceMilk",
    "PickPlaceBread",
    "PickPlaceCereal",
    "PickPlaceCan",
  ]);
  assert.deepEqual(byId.PickPlace.source_ids, [
    "PickPlace",
    "PickPlaceSingle",
    "PickPlaceMilk",
    "PickPlaceBread",
    "PickPlaceCereal",
    "PickPlaceCan",
  ]);
});

test("BEHAVIOR tasks use official demo thumbnails and readable labels", () => {
  const behavior = allTasks.filter((task) => task.benchmark === "behavior");
  assert.equal(behavior.length, 100);
  for (const task of behavior) {
    assert.equal(task.image_kind, "demo_thumbnail");
    assert.ok(task.suite_label, `${task.id}: suite label missing`);
    assert.ok(task.display_name, `${task.id}: display name missing`);
    assert.ok(task.instruction?.endsWith("."), `${task.id}: instruction missing`);
    assert.ok(task.goal_raw?.includes("(:goal"), `${task.id}: raw goal missing`);
    assert.ok(task.goal_summary, `${task.id}: goal summary missing`);
    assert.ok(task.demo_video_url, `${task.id}: demo video missing`);
  }
});

test("generated JSON catalog matches the browser catalog", () => {
  const json = JSON.parse(readFileSync(localPath("data/bm/tasks.json"), "utf8"));
  assert.equal(json.schema, "roborsi.bm_catalog.v1");
  assert.equal(json.total, catalog.total);
  assert.deepEqual(
    json.tasks.map((task) => task.bm_id),
    allTasks.map((task) => task.bm_id),
  );
});

test("published failure replays point at real files", () => {
  for (const task of allTasks) {
    if (task.failure_video_status !== "published") continue;
    assert.ok(task.failure_video_url, `${task.bm_id}: failure video URL`);
    assert.ok(
      existsSync(localPath(task.failure_video_url)),
      `${task.bm_id}: failure video file`,
    );
  }
});
