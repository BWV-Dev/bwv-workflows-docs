import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import commands from "!!raw-loader!@site/generated/commands.md";

import styles from "./styles.module.css";

export default function Commands(): ReactNode {
  return (
    <div className={styles.tableWrap}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{commands}</ReactMarkdown>
    </div>
  );
}
