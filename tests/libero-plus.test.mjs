import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const dataPath = fileURLToPath(
  new URL("../data/libero-plus/tasks.json", import.meta.url),
);
const payload = JSON.parse(readFileSync(dataPath, "utf8"));
const pagePath = fileURLToPath(new URL("../libero-plus.html", import.meta.url));
const page = readFileSync(pagePath, "utf8");

test("LIBERO-Plus exports every classified perturbation instance", () => {
  assert.equal(payload.benchmark, "libero-plus");
  assert.equal(payload.tasks.length, 10030);
  assert.equal(payload.stats.total, 10030);
  assert.equal(Object.keys(payload.stats.suites).length, 4);
  assert.equal(Object.keys(payload.stats.categories).length, 7);
  assert.deepEqual(Object.keys(payload.stats.difficulties), [
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
  ]);
});

test("every LIBERO-Plus task has an id, readable labels and a suite image", () => {
  const ids = new Set();
  for (const task of payload.tasks) {
    assert.ok(task.id, "id required");
    assert.ok(!ids.has(task.id), `duplicate id ${task.id}`);
    ids.add(task.id);
    assert.ok(task.display_name, `${task.id}: display name`);
    assert.ok(task.instruction, `${task.id}: instruction`);
    assert.ok(task.suite_label, `${task.id}: suite label`);
    assert.ok(task.category_label, `${task.id}: category label`);
    assert.ok(task.difficulty >= 0 && task.difficulty <= 5, `${task.id}: difficulty`);
    assert.ok(task.difficulty_label, `${task.id}: difficulty label`);
    assert.ok(task.image, `${task.id}: image`);
    const imagePath = fileURLToPath(new URL(`../${task.image}`, import.meta.url));
    assert.ok(existsSync(imagePath), `${task.id}: missing ${task.image}`);
  }
});

test("LIBERO-Plus page loads the catalog and exposes every task via pagination", () => {
  assert.match(page, /assets\/libero-plus\.js/);
  assert.match(page, /data-lp-table/);
  assert.match(page, /data-lp-pagination/);
  assert.match(page, /data\/libero-plus\/tasks\.json/);
});
