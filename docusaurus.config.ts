import type { Config } from "@docusaurus/types";
import type { Options as ClassicPresetOptions } from "@docusaurus/preset-classic";

const config: Config = {
  title: "BWV Workflows",
  tagline: "Run repository workflows with Claude",
  favicon: "img/favicon.svg",
  url: "https://bwv-dev.github.io",
  baseUrl: "/bwv-workflows-docs/",
  organizationName: "BWV-Dev",
  projectName: "bwv-workflows-docs",
  trailingSlash: false,
  onBrokenLinks: "throw",
  noIndex: true,
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
    localeConfigs: {
      en: {
        label: "English",
        htmlLang: "en",
      },
      vi: {
        label: "Tiếng Việt",
        htmlLang: "vi",
      },
    },
  },
  markdown: {
    format: "detect",
  },
  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/BWV-Dev/bwv-workflows-docs/edit/main/",
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
        },
        blog: false,
        sitemap: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies ClassicPresetOptions,
    ],
  ],
  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        language: ["en"],
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        docsRouteBasePath: "/",
        forceIgnoreNoIndex: true,
      },
    ],
  ],
  themeConfig: {
    colorMode: {
      defaultMode: "light",
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "BWV Workflows",
      hideOnScroll: false,
      items: [
        {
          type: "docSidebar",
          sidebarId: "docsSidebar",
          position: "left",
          label: "Docs",
        },
        { to: "/recipes", label: "Recipe catalog", position: "left" },
        {
          to: "/reference/workflows-yml",
          label: "Reference",
          position: "left",
        },
        { type: "search", position: "right" },
      ],
    },
    footer: {
      style: "light",
      copyright: `Copyright © ${new Date().getFullYear()} BWV Workflows.`,
    },
  },
};

export default config;
