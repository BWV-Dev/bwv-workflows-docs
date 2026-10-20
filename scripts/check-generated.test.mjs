import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { checkGenerated } from "./check-generated.mjs";

async function fixture(t, { excludedFile = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "check-generated-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all([
    mkdir(path.join(root, "docs"), { recursive: true }),
    mkdir(path.join(root, "generated", "samples"), { recursive: true }),
    mkdir(path.join(root, "generated", "recipes", "demo"), {
      recursive: true,
    }),
  ]);
  await Promise.all([
    writeFile(path.join(root, "docs", "index.mdx"), "# Docs\n"),
    writeFile(
      path.join(root, "generated", ".exclude"),
      "# Docs-owned exclusions\nrecipes/demo/hidden.json\n",
    ),
  ]);
  if (excludedFile) {
    await writeFile(
      path.join(root, "generated", "recipes", "demo", "hidden.json"),
      "{}\n",
    );
  }
  return root;
}

test("accepts an excluded generated file when it is absent", async (t) => {
  const root = await fixture(t);
  const result = await checkGenerated(root);

  assert.deepEqual(result.excluded, {
    exclusions: ["recipes/demo/hidden.json"],
    present: [],
  });
});

test("reports an excluded generated file when it is present", async (t) => {
  const root = await fixture(t, { excludedFile: true });
  const result = await checkGenerated(root);

  assert.deepEqual(result.excluded.present, ["recipes/demo/hidden.json"]);
});
