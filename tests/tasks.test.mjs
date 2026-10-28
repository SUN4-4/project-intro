import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

globalThis.window = {};
await import("../assets/tasks.js");

const groups = globalThis.window.BENCHMARK_TASKS;
const allTasks = groups.flatMap((group) =>
  group.tasks.map((task) => ({
    ...task,
    benchmark: group.benchmark,
    dataDir: group.dataDir,
  })),
);

const expectedCounts = {
  libero: 130,
  robotwin: 50,
  robosuite: 19,
  behavior: 100,
};

function localPath(relativePath) {
  return fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
}

test("task catalog covers every deployed benchmark", () => {
  assert.ok(Array.isArray(groups));
  assert.deepEqual(
    Object.fromEntries(groups.map((group) => [group.benchmark, group.tasks.length])),
    expectedCounts,
  );
  assert.equal(allTasks.length, 299);
});

test("every task has an id, name, instruction and an existing image", () => {
  const missing = [];
  for (const task of allTasks) {
    assert.ok(task.id, "task id is required");
    assert.ok(task.name, `${task.id}: name is required`);
    assert.ok(task.instruction?.trim(), `${task.id}: instruction is required`);
    assert.ok(task.image, `${task.id}: image is required`);
    if (!existsSync(localPath(`${task.dataDir}/${task.image}`))) {
      missing.push(`${task.dataDir}/${task.image}`);
    }
  }
  assert.deepEqual(missing, []);
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
  }
});
