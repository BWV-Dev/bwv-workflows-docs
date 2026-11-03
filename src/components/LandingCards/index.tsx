import Link from "@docusaurus/Link";
import { translate } from "@docusaurus/Translate";
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
    title: translate({
      id: "landingCards.gettingStarted.title",
      message: "Getting started",
    }),
    description: translate({
      id: "landingCards.gettingStarted.description",
      message: "Onboard a repository and add its first workflow.",
    }),
    to: "/getting-started/onboard-repository",
    icon: "→",
  },
  {
    title: translate({
      id: "landingCards.pullRequest.title",
      message: "Working on a pull request",
    }),
    description: translate({
      id: "landingCards.pullRequest.description",
      message: "Read results, retry a run, and recreate closed work.",
    }),
    to: "/pull-requests",
    icon: "✓",
  },
  {
    title: translate({
      id: "landingCards.recipes.title",
      message: "Recipe catalog",
    }),
    description: translate({
      id: "landingCards.recipes.description",
      message: "Choose a maintained recipe and inspect its inputs.",
    }),
    to: "/recipes",
    icon: "◇",
  },
  {
    title: translate({
      id: "landingCards.reference.title",
      message: "Reference",
    }),
    description: translate({
      id: "landingCards.reference.description",
      message: "Look up workflow fields, recipe fields, and commands.",
    }),
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
