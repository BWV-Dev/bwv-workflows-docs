import { createHash } from "node:crypto";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DOCS_DIRECTORY = "docs";
const VI_DOCS_DIRECTORY = path.join(
  "i18n",
  "vi",
  "docusaurus-plugin-content-docs",
  "current",
);
const DOC_EXTENSIONS = new Set([".md", ".mdx"]);

function toPosix(file) {
  return file.split(path.sep).join("/");
}

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(absolute)));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

export function normalizeLf(value) {
  return Buffer.from(value).toString("utf8").replace(/\r\n?/g, "\n");
}

export function sourceHash(value) {
  return createHash("sha256").update(normalizeLf(value), "utf8").digest("hex");
}

export function readSourceHash(value) {
  const lines = normalizeLf(value).split("\n");
  if (lines[0] !== "---") return undefined;
  const end = lines.indexOf("---", 1);
  if (end === -1) return undefined;

  for (const line of lines.slice(1, end)) {
    const match = line.match(
      /^source_hash:\s*(?:"([a-f\d]{64})"|'([a-f\d]{64})'|([a-f\d]{64}))\s*$/i,
    );
    if (match) return (match[1] ?? match[2] ?? match[3]).toLowerCase();
  }
  return undefined;
}

export async function checkI18n(root, { missingOnly = false } = {}) {
  const docsRoot = path.join(root, DOCS_DIRECTORY);
  const viRoot = path.join(root, VI_DOCS_DIRECTORY);
  const sourceFiles = (await filesBelow(docsRoot))
    .filter((file) => DOC_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();
  const result = {
    checked: sourceFiles.length,
    missing: [],
    invalid: [],
    stale: [],
  };

  for (const sourceFile of sourceFiles) {
    const relative = path.relative(docsRoot, sourceFile);
    const viFile = path.join(viRoot, relative);
    try {
      await access(viFile);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      result.missing.push({
        source: toPosix(path.relative(root, sourceFile)),
        translation: toPosix(path.relative(root, viFile)),
      });
      continue;
    }

    if (missingOnly) continue;
    const [source, translation] = await Promise.all([
      readFile(sourceFile),
      readFile(viFile),
    ]);
    const expected = sourceHash(source);
    const actual = readSourceHash(translation);
    const item = {
      source: toPosix(path.relative(root, sourceFile)),
      translation: toPosix(path.relative(root, viFile)),
      expected,
      actual,
    };
    if (!actual) result.invalid.push(item);
    else if (actual !== expected) result.stale.push(item);
  }

  return result;
}

function list(label, items) {
  console.error(`[check-i18n] ${label}`);
  for (const item of items) console.error(`  - ${item.translation}`);
}

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((arg) => arg !== "--missing-only");
  if (unknown.length > 0) {
    throw new Error(`Unknown option(s): ${unknown.join(", ")}`);
  }

  const missingOnly = args.includes("--missing-only");
  const allowMissing = process.env.I18N_ALLOW_MISSING === "1";
  const result = await checkI18n(process.cwd(), { missingOnly });

  if (result.missing.length > 0) {
    list("Missing Vietnamese page(s):", result.missing);
    if (allowMissing) {
      console.warn(
        "[check-i18n] I18N_ALLOW_MISSING=1: allowing missing pages for this local build only.",
      );
    } else {
      process.exitCode = 1;
    }
  }

  if (!missingOnly && result.invalid.length > 0) {
    list("Vietnamese page(s) without a valid source_hash:", result.invalid);
    process.exitCode = 1;
  }

  if (!missingOnly && result.stale.length > 0) {
    list(
      "Stale Vietnamese page(s); review them and update source_hash deliberately:",
      result.stale,
    );
  }

  if (
    result.missing.length === 0 &&
    result.invalid.length === 0 &&
    result.stale.length === 0
  ) {
    console.log(`[check-i18n] Passed (${result.checked} page(s) checked).`);
  } else if (!process.exitCode) {
    console.log(
      `[check-i18n] Completed with warning(s) (${result.checked} page(s) checked).`,
    );
  }
}

const entry = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (entry === import.meta.url) {
  main().catch((error) => {
    console.error(`[check-i18n] ${error.message}`);
    process.exitCode = 1;
  });
}
