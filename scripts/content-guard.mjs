import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCAN_DIRECTORIES = ["docs", "src", "generated"];
const SCAN_FILES = [
  "README.md",
  "docusaurus.config.ts",
  "sidebars.ts",
  "tsconfig.json",
  "package.json",
];
const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const ALLOWED_BWV_REPOSITORIES = new Set([
  "BWV-Dev/bwv-workflows-recipes",
  "BWV-Dev/bwv-workflows-docs",
]);

// Credential shapes copied from packages/shared/src/log-error.ts in the engine.
const PUBLIC_RULES = [
  {
    name: "encoded x-access-token credential",
    regex: /eC1hY2Nlc3MtdG9rZW46[A-Za-z0-9+/=]*/g,
  },
  {
    name: "GitHub token",
    regex: /\b(gh[pousr]_|github_pat_)[A-Za-z0-9_]+/g,
  },
  {
    name: "Anthropic token",
    regex: /\bsk-ant-[A-Za-z0-9_-]+/g,
  },
  {
    name: "private key",
    regex:
      /-----BEGIN [A-Z ]*PRIVATE KEY-----(?:[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----|[\s\S]*$)/g,
  },
  {
    name: "Authorization header credential",
    regex: /(authorization:\s*\w+\s+)[^\s)"']+/gi,
  },
  {
    name: "Bearer credential",
    regex: /(bearer\s+)[A-Za-z0-9._~+/=-]+/gi,
  },
  {
    name: "x-access-token URL credential",
    regex: /(x-access-token:)[^@\s]+/gi,
  },
  {
    name: "access token or client secret parameter",
    regex: /\b((?:client_secret|access_token)=)[^&\s]+/g,
  },
  {
    name: "internal-looking hostname",
    // Company domains plus common private DNS and mDNS suffixes are never useful in public docs.
    regex:
      /\b(?:localhost|(?:[a-z0-9-]+\.)+(?:internal|corp|lan|local)|(?:[a-z0-9-]+\.)*briswell-vn\.com)\b/gi,
  },
  {
    name: "private IPv4 address",
    regex:
      /\b(?:10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})\b/g,
  },
  {
    name: "real-looking pull request number",
    regex: /\b(?:PR|pull request)\s+#\d{3,}\b/gi,
  },
];

function lineAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function matchesForRule(text, rule) {
  const regex = new RegExp(
    rule.regex.source,
    rule.regex.flags.includes("g") ? rule.regex.flags : `${rule.regex.flags}g`,
  );
  const findings = [];
  for (const match of text.matchAll(regex)) {
    findings.push({ line: lineAt(text, match.index ?? 0), rule: rule.name });
  }
  return findings;
}

export function compileDenylist(value) {
  if (!value) return undefined;
  let regex;
  try {
    regex = new RegExp(value, "gi");
  } catch (error) {
    throw new Error(
      `CONTENT_DENYLIST is not a valid regular expression: ${error.message}`,
    );
  }
  if (regex.test("")) {
    throw new Error("CONTENT_DENYLIST must not match an empty string.");
  }
  return regex;
}

export function inspectText(file, text, denylist) {
  const findings = PUBLIC_RULES.flatMap((rule) =>
    matchesForRule(text, rule).map((finding) => ({ file, ...finding })),
  );

  const repositoryPattern = /\bBWV-Dev\/[A-Za-z0-9_.-]+\b/g;
  for (const match of text.matchAll(repositoryPattern)) {
    if (!ALLOWED_BWV_REPOSITORIES.has(match[0])) {
      findings.push({
        file,
        line: lineAt(text, match.index ?? 0),
        rule: "non-public BWV-Dev repository mention",
      });
    }
  }

  if (denylist) {
    findings.push(
      ...matchesForRule(text, {
        name: "private denylist",
        regex: denylist,
      }).map((finding) => ({
        file,
        ...finding,
      })),
    );
  }

  return findings.sort(
    (a, b) => a.line - b.line || a.rule.localeCompare(b.rule),
  );
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

export async function scanRepository(
  root,
  denylistValue = process.env.CONTENT_DENYLIST ?? "",
) {
  const candidates = [];
  for (const directory of SCAN_DIRECTORIES) {
    const absolute = path.join(root, directory);
    try {
      if ((await stat(absolute)).isDirectory())
        candidates.push(...(await filesBelow(absolute)));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  for (const file of SCAN_FILES) {
    const absolute = path.join(root, file);
    try {
      if ((await stat(absolute)).isFile()) candidates.push(absolute);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const denylist = compileDenylist(denylistValue);
  const findings = [];
  const uniqueFiles = [...new Set(candidates)].sort();
  for (const absolute of uniqueFiles) {
    const extension = path.extname(absolute).toLowerCase();
    if (IMAGE_EXTENSIONS.has(extension) || !TEXT_EXTENSIONS.has(extension))
      continue;
    const relative = path.relative(root, absolute).split(path.sep).join("/");
    findings.push(
      ...inspectText(relative, await readFile(absolute, "utf8"), denylist),
    );
  }
  return {
    findings,
    filesScanned: uniqueFiles.length,
    denylistEnabled: Boolean(denylist),
  };
}

async function main() {
  console.log("[content-guard] Images are not scanned.");
  const result = await scanRepository(process.cwd());
  console.log(
    result.denylistEnabled
      ? "[content-guard] Private denylist enabled."
      : "[content-guard] CONTENT_DENYLIST is empty; private denylist skipped.",
  );
  if (result.findings.length === 0) {
    console.log(
      `[content-guard] Passed (${result.filesScanned} candidate files checked).`,
    );
    return;
  }

  for (const finding of result.findings) {
    console.error(`${finding.file}:${finding.line}: ${finding.rule}`);
  }
  console.error(
    `[content-guard] Failed with ${result.findings.length} finding(s).`,
  );
  process.exitCode = 1;
}

const entry = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : undefined;
if (entry === import.meta.url) {
  main().catch((error) => {
    console.error(`[content-guard] ${error.message}`);
    process.exitCode = 1;
  });
}
