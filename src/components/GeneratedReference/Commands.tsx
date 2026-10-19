import { translate } from "@docusaurus/Translate";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import commands from "!!raw-loader!@site/generated/commands.md";

import styles from "./styles.module.css";

export default function Commands(): ReactNode {
  const localizedHeaders = commands.replace(
    "| Command | What it does |",
    `| ${translate({
      id: "commands.command",
      message: "Command",
    })} | ${translate({
      id: "commands.whatItDoes",
      message: "What it does",
    })} |`,
  );

  return (
    <div className={styles.tableWrap}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {localizedHeaders}
      </ReactMarkdown>
    </div>
  );
}
