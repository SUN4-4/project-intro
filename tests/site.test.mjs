import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(projectRoot, "index.html"), "utf8");
const css = readFileSync(join(projectRoot, "assets/styles.css"), "utf8");
const js = readFileSync(join(projectRoot, "assets/main.js"), "utf8");

test("page includes required semantic structure and metadata", () => {
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<html lang="zh-CN">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /name="description"/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /<header class="site-header"/);
});

test("all local pages and assets referenced by the page exist", () => {
  const localReferences = [
    ...html.matchAll(/(?:href|src)="((?!https?:|#|mailto:|tel:)[^"]+)"/g),
  ].map((match) => match[1]);

  localReferences.forEach((reference) => {
    assert.ok(
      existsSync(join(projectRoot, reference)),
      `Missing local resource: ${reference}`,
    );
  });
});

test("navigation targets and accessibility hooks are present", () => {
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const sectionLinks = [...html.matchAll(/href="#([^"]+)"/g)].map(
    (match) => match[1],
  );

  sectionLinks.forEach((id) => assert.ok(ids.has(id), `Missing anchor target: #${id}`));
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /class="skip-link"/);
});

test("responsive and motion-accessibility styles are defined", () => {
  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /:focus-visible/);
});

test("navigation and progressive reveal behavior are initialized", () => {
  assert.match(js, /IntersectionObserver/);
  assert.match(js, /aria-expanded/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /updateActiveNavigation/);
});
