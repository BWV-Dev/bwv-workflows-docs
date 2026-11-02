import useBaseUrl from "@docusaurus/useBaseUrl";
import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./styles.module.css";

export default function ZoomableScreenshot({
  src,
  alt,
  compact = false,
}: {
  src: string;
  alt: string;
  compact?: boolean;
}): ReactNode {
  const url = useBaseUrl(src);

  return (
    <a
      className={styles.link}
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open full-size image: ${alt}`}
      title="Open full-size image"
    >
      <img
        className={clsx(styles.image, compact && styles.compact)}
        src={url}
        alt={alt}
        loading="lazy"
      />
    </a>
  );
}
