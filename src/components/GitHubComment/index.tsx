import type { ComponentPropsWithoutRef, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import trackerPublished from "!!raw-loader!@site/generated/samples/tracker-published.md";

import styles from "./styles.module.css";

const samples: Record<string, string> = {
  "tracker-published": trackerPublished,
};

function DisabledInput(props: ComponentPropsWithoutRef<"input">): ReactNode {
  return <input {...props} disabled />;
}

export default function GitHubComment({
  sample,
  author,
}: {
  sample: string;
  author: string;
}): ReactNode {
  const markdown = samples[sample];
  if (!markdown) throw new Error(`Unknown generated sample: ${sample}`);

  return (
    <div className={styles.comment}>
      <div className={styles.avatar} aria-hidden="true">
        BW
      </div>
      <div className={styles.panel}>
        <div className={styles.header}>
          <strong>{author}</strong>
          <span className={styles.badge}>bot</span>
          <span className={styles.muted}>commented with example data</span>
        </div>
        <div className={styles.body}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{ input: DisabledInput }}
          >
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
