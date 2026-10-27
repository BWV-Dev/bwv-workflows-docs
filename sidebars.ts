import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docsSidebar: [
    "index",
    {
      type: "category",
      label: "Overview",
      collapsed: false,
      items: ["overview/what-is", "overview/how-run-works"],
    },
    {
      type: "category",
      label: "Getting started",
      collapsed: false,
      items: [
        "getting-started/onboard-repository",
        "getting-started/first-workflow",
        "getting-started/editor-autocomplete",
      ],
    },
    {
      type: "category",
      label: "Guides — Configuring",
      collapsed: true,
      items: [
        "configuring/triggers",
        "configuring/steps",
        "configuring/recipes-and-toolkits",
        {
          type: "category",
          label: "Recipe catalog",
          link: { type: "doc", id: "recipes/index" },
          items: [
            "recipes/translation-grouped",
            "recipes/translation-sync-cache-completeness",
            "recipes/translation-backfill",
            "recipes/common-command-fanout",
          ],
        },
        "configuring/translating-after-merge",
        "configuring/many-pull-requests",
        "configuring/passing-data",
        "configuring/second-repository",
      ],
    },
    "pull-requests/index",
    {
      type: "category",
      label: "Reference",
      collapsed: false,
      items: [
        "reference/workflows-yml",
        "reference/recipe-v1",
        "reference/commands",
      ],
    },
    "troubleshooting",
  ],
};

export default sidebars;
