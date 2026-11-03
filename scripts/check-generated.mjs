import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const REFERENCE_PATTERNS = [
  {
    kind: "sample",
    component: "GitHubComment",
    attribute: "sample",
    pattern: /<GitHubComment\b[^>]*\bsample\s*=\s*["']([^"']+)["'][^>]*>/g,
  },
  {
    kind: "recipe",
    component: "RecipeInputs",
    attribute: "recipe",
    pattern: /<RecipeInputs\b[^>]*\brecipe\s*=\s*["']([^"']+)["'][^>]*>/g,
  },
];

async function filesBelow(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await filesBelow(absolute, extensions)));
    } else if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(absolute);
    }
  }
  return files.sort();
}

function lineAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function keyFromFile(file, root) {
  return path
    .relative(root, file)
    .split(path.sep)
    .join("/")
    .replace(path.extname(file), "");
}

async function readExclusions(root) {
  const generatedRoot = path.join(root, "generated");
  const value = await readFile(path.join(generatedRoot, ".exclude"), "utf8");
  const exclusions = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  for (const exclusion of exclusions) {
    if (
      path.isAbsolute(exclusion) ||
      exclusion.includes("\\") ||
      exclusion.split("/").includes("..")
    ) {
      throw new Error(
        `generated/.exclude contains an unsafe path: "${exclusion}"`,
      );
    }
  }

  const present = [];
  for (const exclusion of exclusions) {
    try {
      await access(path.join(generatedRoot, ...exclusion.split("/")));
      present.push(exclusion);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  return { exclusions, present };
}

export async function checkGenerated(root) {
  const samplesRoot = path.join(root, "generated", "samples");
  const recipesRoot = path.join(root, "generated", "recipes");
  const available = {
    sample: new Set(
      (await filesBelow(samplesRoot, new Set([".md"]))).map((file) =>
        keyFromFile(file, samplesRoot),
      ),
    ),
    recipe: new Set(
      (await filesBelow(recipesRoot, new Set([".json"]))).map((file) =>
        keyFromFile(file, recipesRoot),
      ),
    ),
  };

  const findings = [];
  const docsRoot = path.join(root, "docs");
  const docs = await filesBelow(docsRoot, new Set([".md", ".mdx"]));
  for (const file of docs) {
    const text = await readFile(file, "utf8");
    for (const reference of REFERENCE_PATTERNS) {
      for (const match of text.matchAll(reference.pattern)) {
        const key = match[1];
        if (!available[reference.kind].has(key)) {
          findings.push({
            file: path.relative(root, file).split(path.sep).join("/"),
            line: lineAt(text, match.index ?? 0),
            kind: reference.kind,
            key,
          });
        }
      }
    }
  }

  const excluded = await readExclusions(root);
  return { available, excluded, findings };
}

async function main() {
  const result = await checkGenerated(process.cwd());
  if (result.findings.length === 0 && result.excluded.present.length === 0) {
    console.log(
      `[check-generated] Passed (${result.available.sample.size} samples, ${result.available.recipe.size} recipes, ${result.excluded.exclusions.length} exclusion(s)).`,
    );
    return;
  }

  for (const exclusion of result.excluded.present) {
    console.error(
      `generated/${exclusion}: excluded generated file is present. Remove it after export; generated/.exclude is owned by the docs repository.`,
    );
  }

  for (const finding of result.findings) {
    const keys = [...result.available[finding.kind]].sort();
    console.error(
      `${finding.file}:${finding.line}: unknown generated ${finding.kind} key "${finding.key}". Available keys: ${
        keys.length > 0 ? keys.join(", ") : "(none)"
      }`,
    );
  }
  process.exitCode = 1;
}

const entry = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (entry === import.meta.url) {
  main().catch((error) => {
    console.error(`[check-generated] ${error.message}`);
    process.exitCode = 1;
  });
}
