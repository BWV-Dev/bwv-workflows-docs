import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  checkI18n,
  configuredLocales,
  normalizeLf,
  readSourceHash,
  sourceHash,
} from "./check-i18n.mjs";

const VI_ROOT = path.join(
  "i18n",
  "vi",
  "docusaurus-plugin-content-docs",
  "current",
);

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "bwv-i18n-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "docs"), { recursive: true });
  await mkdir(path.join(root, VI_ROOT), { recursive: true });
  return root;
}

test("hashes source bytes after normalizing line endings to LF", () => {
  assert.equal(normalizeLf("one\r\ntwo\rthree"), "one\ntwo\nthree");
  assert.equal(sourceHash("one\r\ntwo\n"), sourceHash("one\ntwo\n"));
});

test("reads source_hash only from front matter", () => {
  const hash = "a".repeat(64);
  assert.equal(readSourceHash(`---\nsource_hash: ${hash}\n---\nText`), hash);
  assert.equal(readSourceHash(`Text\nsource_hash: ${hash}`), undefined);
});

test("reads the enabled locales from the Docusaurus configuration", async (t) => {
  const root = await fixture(t);
  await writeFile(
    path.join(root, "docusaurus.config.ts"),
    'export default { i18n: { locales: ["en"] } };\n',
  );
  assert.deepEqual(await configuredLocales(root), ["en"]);
});

test("reports missing and stale Vietnamese pages", async (t) => {
  const root = await fixture(t);
  const source = "---\ntitle: One\n---\nEnglish\n";
  await writeFile(path.join(root, "docs", "one.mdx"), source);
  await writeFile(path.join(root, "docs", "missing.md"), "English\n");
  await writeFile(
    path.join(root, VI_ROOT, "one.mdx"),
    `---\nsource_hash: ${"0".repeat(64)}\n---\nTiếng Việt\n`,
  );

  const result = await checkI18n(root);
  assert.deepEqual(
    result.missing.map((item) => item.source),
    ["docs/missing.md"],
  );
  assert.deepEqual(
    result.stale.map((item) => item.source),
    ["docs/one.mdx"],
  );
  assert.deepEqual(result.invalid, []);
});

test("accepts a matching hash and missing-only mode ignores hash metadata", async (t) => {
  const root = await fixture(t);
  const source = "English\r\n";
  await writeFile(path.join(root, "docs", "one.mdx"), source);
  await writeFile(
    path.join(root, VI_ROOT, "one.mdx"),
    `---\nsource_hash: ${sourceHash(source)}\n---\nTiếng Việt\n`,
  );
  assert.deepEqual(await checkI18n(root), {
    checked: 1,
    missing: [],
    invalid: [],
    stale: [],
  });

  await writeFile(path.join(root, VI_ROOT, "one.mdx"), "Tiếng Việt\n");
  assert.deepEqual((await checkI18n(root, { missingOnly: true })).invalid, []);
});
