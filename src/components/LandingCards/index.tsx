import Link from "@docusaurus/Link";
import type { ReactNode } from "react";

import styles from "./styles.module.css";

type Card = {
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
};

const cards: Card[] = [
  {
    title: "Getting started",
    description: "Onboard a repository and add its first workflow.",
    to: "/getting-started/onboard-repository",
    icon: "→",
  },
  {
    title: "Working on a pull request",
    description: "Read results, retry a run, and recreate closed work.",
    to: "/pull-requests/read-checks-status",
    icon: "✓",
  },
  {
    title: "Recipe catalog",
    description: "Choose a maintained recipe and inspect its inputs.",
    to: "/recipes",
    icon: "◇",
  },
  {
    title: "Reference",
    description: "Look up workflow fields, recipe fields, and commands.",
    to: "/reference/workflows-yml",
    icon: "{}",
  },
];

export default function LandingCards(): ReactNode {
  return (
    <div className={styles.grid}>
      {cards.map((card) => (
        <Link className={styles.card} key={card.to} to={card.to}>
          <span className={styles.icon} aria-hidden="true">
            {card.icon}
          </span>
          <strong>{card.title}</strong>
          <span>{card.description}</span>
        </Link>
      ))}
    </div>
  );
}
