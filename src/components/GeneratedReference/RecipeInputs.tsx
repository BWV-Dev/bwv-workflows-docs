import type { ReactNode } from "react";

import groupedRecipe from "@site/generated/recipes/translation/grouped.json";

import styles from "./styles.module.css";
import { displayValue } from "./schema";

type RecipeInput = {
  name: string;
  type: string;
  required: boolean;
  default?: unknown;
  description?: string;
  enum?: unknown[];
};

type Recipe = {
  path: string;
  description?: string;
  inputs: RecipeInput[];
};

const recipes: Record<string, Recipe> = {
  "translation/grouped": groupedRecipe,
};

export default function RecipeInputs({
  recipe,
}: {
  recipe: string;
}): ReactNode {
  const definition = recipes[recipe];
  if (!definition) throw new Error(`Unknown generated recipe: ${recipe}`);

  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Default</th>
            <th>Description</th>
            <th>Enum</th>
          </tr>
        </thead>
        <tbody>
          {definition.inputs.map((input) => (
            <tr key={input.name}>
              <td>
                <code>{input.name}</code>
              </td>
              <td>{input.type}</td>
              <td>{input.required ? "Yes" : "No"}</td>
              <td>{displayValue(input.default)}</td>
              <td>{input.description ?? "—"}</td>
              <td>
                {input.enum ? input.enum.map(displayValue).join(", ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
