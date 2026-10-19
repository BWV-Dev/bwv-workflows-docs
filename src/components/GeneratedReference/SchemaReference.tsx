import type { ReactNode } from "react";

import styles from "./styles.module.css";
import {
  displayValue,
  resolveSchema,
  schemaType,
  type JsonSchema,
} from "./schema";

type Props = {
  schema: JsonSchema;
};

type NestedSchema = { label: string; schema: JsonSchema };

function nestedSchemas(
  schema: JsonSchema,
  root: JsonSchema,
  label: string,
): NestedSchema[] {
  const resolved = resolveSchema(schema, root);
  if (resolved.type === "array" && resolved.items) {
    return nestedSchemas(resolved.items, root, `${label}[]`);
  }
  if (resolved.properties) return [{ label, schema: resolved }];

  const alternatives = resolved.oneOf ?? resolved.anyOf ?? resolved.allOf;
  if (!alternatives) return [];
  const nested = alternatives.flatMap((option, index) =>
    nestedSchemas(option, root, `${label} — option ${index + 1}`),
  );
  return nested.length === 1 ? [{ ...nested[0], label }] : nested;
}

function PropertiesTable({
  schema,
  root,
  path = "",
}: {
  schema: JsonSchema;
  root: JsonSchema;
  path?: string;
}): ReactNode {
  const resolved = resolveSchema(schema, root);
  const properties = Object.entries(resolved.properties ?? {});
  const required = new Set(resolved.required ?? []);

  if (properties.length === 0) {
    return (
      <p className={styles.empty}>This schema has no documented properties.</p>
    );
  }

  return (
    <>
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
            {properties.map(([name, property]) => {
              const propertySchema = resolveSchema(property, root);
              return (
                <tr key={name}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>{schemaType(propertySchema, root)}</td>
                  <td>{required.has(name) ? "Yes" : "No"}</td>
                  <td>{displayValue(propertySchema.default)}</td>
                  <td>{propertySchema.description ?? "—"}</td>
                  <td>
                    {propertySchema.enum
                      ? propertySchema.enum.map(displayValue).join(", ")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {properties.flatMap(([name, property]) =>
        nestedSchemas(property, root, `${path}${name}`).map((nested) => (
          <section className={styles.nested} key={nested.label}>
            <h3>
              <code>{nested.label}</code>
            </h3>
            <PropertiesTable
              schema={nested.schema}
              root={root}
              path={`${nested.label}.`}
            />
          </section>
        )),
      )}
    </>
  );
}

export default function SchemaReference({ schema }: Props): ReactNode {
  const roots = nestedSchemas(schema, schema, schema.title ?? "Schema");
  if (roots.length === 0) {
    return <PropertiesTable schema={schema} root={schema} />;
  }
  if (roots.length === 1) {
    return <PropertiesTable schema={roots[0].schema} root={schema} />;
  }
  return roots.map((root) => (
    <section className={styles.variant} key={root.label}>
      <h2>{root.label}</h2>
      <PropertiesTable schema={root.schema} root={schema} />
    </section>
  ));
}
