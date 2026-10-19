# BWV Workflows documentation

This repository contains the public user documentation for BWV Workflows, a GitHub App that runs Claude-driven jobs on repositories. It is a Docusaurus 3 site written in TypeScript.

The site is public, but `noIndex: true` keeps it out of search results; the build also emits no sitemap.

## Run the site

Use Node.js 24 and pnpm 11.

```bash
pnpm install
pnpm start
```

Run every local check before opening a pull request:

```bash
pnpm format:check
pnpm typecheck
pnpm check:generated
pnpm content-guard
pnpm test:content-guard
pnpm build
```

## Write a page

Put user documentation under `docs/`. Give every page front matter with a short stable `slug`, a `title`, `sidebar_position`, and `description`. Start its content with one of these exact role lines:

```text
👤 Responsible: Project Leader
👤 Responsible: Dev & Com
👤 Responsible: Project Leader and Dev & Com
```

Use short imperative sentences. Introduce the workflow, then give step-by-step instructions. Name the responsible role in each step and include the exact command or YAML when it helps the reader.

Keep all content suitable for a public, indexed repository even though the site requests no indexing:

- Use fake repositories and paths such as `acme/web-app` and `docs/specs/**`.
- Do not publish internal hosts, private network addresses, customer or project names, real pull request numbers, costs, contact channels, personal names, or secret-like values.
- Name the App **BWV Workflows**, but do not link to its installation page. Ask the **BWV Workflows maintainers** to install or configure it.
- Use “your organization.” Do not assume a particular organization.
- State only the required security action and a one-line reason.
- Only name `BWV-Dev/bwv-workflows-recipes` and this documentation repository among organization repositories.

Run `pnpm content-guard` before committing. The guard scans text in `docs/`, `src/`, `generated/`, the README, and site configuration. It deliberately does not scan images. CI can add a private case-insensitive regular expression through `CONTENT_DENYLIST`; never store its value in this repository.

## Refresh generated content

Generated schemas, command tables, recipe metadata, and rendered samples live under `generated/` at the repository root. Never edit these files by hand. From the private engine checkout, run:

```bash
pnpm docs:export --out ../bwv-workflows-docs/generated --recipes <checkout>
```

Commit the refreshed `generated/` directory and its `manifest.json` together. The manifest records the engine commit, optional recipe commit, and export time.

Run `pnpm check:generated` after an export. It verifies that every literal sample and recipe key used by a documentation page exists in the refreshed output. `pnpm build` runs the same check automatically.

Schema and recipe JSON are imported directly into React components at build time. Markdown tables and bot samples are imported as raw strings with Webpack's `raw-loader`, bypassing Docusaurus's MDX compilation, then rendered by `react-markdown` with `remark-gfm` and `rehype-raw`. This preserves GFM tables, task lists, and trusted generated `<details>` elements. The sample renderer replaces every checkbox input with a disabled input so documentation examples cannot be edited.

## Deploy

Pull requests run the content guard, its tests, TypeScript, and the production build. A push to `main` builds the site and deploys the `build/` artifact with GitHub Pages Actions.

Before the first deployment, set the repository’s **Pages → Build and deployment → Source** to **GitHub Actions**. The workflow does not create a repository, configure Pages, or push changes.
