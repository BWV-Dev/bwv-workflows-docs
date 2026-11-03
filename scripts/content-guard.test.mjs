import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  compileDenylist,
  inspectText,
  scanRepository,
} from "./content-guard.mjs";

test("allows the two approved BWV-Dev repositories", () => {
  const text = "BWV-Dev/bwv-workflows-recipes BWV-Dev/bwv-workflows-docs";
  assert.deepEqual(inspectText("README.md", text), []);
});

test("reports a repository mention and its line", () => {
  const findings = inspectText(
    "docs/example.md",
    "safe\nBWV-Dev/private-example",
  );
  assert.deepEqual(findings, [
    {
      file: "docs/example.md",
      line: 2,
      rule: "non-public BWV-Dev repository mention",
    },
  ]);
});

test("detects copied engine credential shapes without returning their values", () => {
  const text = [
    "authorization: Basic sensitive-value",
    "bearer example.secret-value",
    "access_token=sensitive-value",
    "-----BEGIN PRIVATE KEY-----",
    "fake-key-material",
  ].join("\n");
  const findings = inspectText("docs/example.md", text);
  assert.deepEqual(
    findings.map(({ line, rule }) => ({ line, rule })),
    [
      { line: 1, rule: "Authorization header credential" },
      { line: 2, rule: "Bearer credential" },
      { line: 3, rule: "access token or client secret parameter" },
      { line: 4, rule: "private key" },
    ],
  );
  assert.equal(JSON.stringify(findings).includes("sensitive-value"), false);
});

test("detects private network details and large pull request numbers", () => {
  const findings = inspectText(
    "docs/example.md",
    "Visit service.tools.internal at 192.168.2.4 for PR #456.",
  );
  assert.deepEqual(
    findings.map(({ rule }) => rule),
    [
      "internal-looking hostname",
      "private IPv4 address",
      "real-looking pull request number",
    ],
  );
});

test("applies CONTENT_DENYLIST case-insensitively", () => {
  const denylist = compileDenylist("private[ -]codename");
  const findings = inspectText("docs/example.md", "PRIVATE CODENAME", denylist);
  assert.equal(findings.at(0)?.rule, "private denylist");
});

test("rejects an invalid or empty-matching denylist", () => {
  assert.throws(() => compileDenylist("["), /not a valid regular expression/);
  assert.throws(() => compileDenylist(".*"), /must not match an empty string/);
});

test("scans translated content under i18n", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "bwv-content-guard-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const translationDirectory = path.join(root, "i18n", "vi");
  await mkdir(translationDirectory, { recursive: true });
  await writeFile(
    path.join(translationDirectory, "example.mdx"),
    "Visit service.example.internal.",
  );

  const result = await scanRepository(root);
  assert.deepEqual(result.findings, [
    {
      file: "i18n/vi/example.mdx",
      line: 1,
      rule: "internal-looking hostname",
    },
  ]);
});
