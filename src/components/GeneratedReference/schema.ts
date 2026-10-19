export type JsonSchema = {
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  type?: string | string[];
  title?: string;
  description?: string;
  default?: unknown;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
};

export function resolveSchema(
  schema: JsonSchema,
  root: JsonSchema,
  seen = new Set<string>(),
): JsonSchema {
  if (!schema.$ref || !schema.$ref.startsWith("#/") || seen.has(schema.$ref)) {
    return schema;
  }

  const resolved = schema.$ref
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((value, part) => {
      if (typeof value !== "object" || value === null) return undefined;
      return (value as Record<string, unknown>)[part];
    }, root);

  if (typeof resolved !== "object" || resolved === null) return schema;
  return {
    ...resolveSchema(
      resolved as JsonSchema,
      root,
      new Set(seen).add(schema.$ref),
    ),
    ...schema,
    $ref: undefined,
  };
}

export function schemaType(schema: JsonSchema, root: JsonSchema): string {
  const resolved = resolveSchema(schema, root);
  if (resolved.const !== undefined) return typeof resolved.const;
  if (Array.isArray(resolved.type)) return resolved.type.join(" | ");
  if (resolved.type === "array") {
    return `array<${resolved.items ? schemaType(resolved.items, root) : "unknown"}>`;
  }
  if (resolved.type) return resolved.type;
  if (resolved.properties) return "object";
  if (resolved.enum?.length) return typeof resolved.enum[0];
  const alternatives = resolved.oneOf ?? resolved.anyOf;
  if (alternatives) {
    return [
      ...new Set(alternatives.map((option) => schemaType(option, root))),
    ].join(" | ");
  }
  return "—";
}

export function displayValue(value: unknown): string {
  if (value === undefined) return "—";
  return typeof value === "string" ? value : JSON.stringify(value);
}
