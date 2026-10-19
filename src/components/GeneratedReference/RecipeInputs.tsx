import type { ReactNode } from "react";

import {
  requireGenerated,
  unwrapGeneratedModule,
  type GeneratedModule,
} from "../generatedRegistry";

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

const recipeContext = require.context(
  "@site/generated/recipes",
  true,
  /\.json$/,
);

const recipes: Record<string, Recipe> = Object.fromEntries(
  recipeContext
    .keys()
    .map((modulePath) => [
      modulePath.replace(/^\.\//, "").replace(/\.json$/, ""),
      unwrapGeneratedModule(recipeContext<GeneratedModule<Recipe>>(modulePath)),
    ]),
);

export default function RecipeInputs({
  recipe,
}: {
  recipe: string;
}): ReactNode {
  const definition = requireGenerated(recipes, recipe, "recipe");

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
