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
  propertyNames?: JsonSchema;
  additionalProperties?: boolean | JsonSchema;
  required?: string[];
  items?: JsonSchema;
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  allOf?: JsonSchema[];
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
};

export type SchemaResolver = (schema: JsonSchema) => JsonSchema;

function pointerValue(
  root: JsonSchema,
  pointer: string,
): JsonSchema | undefined {
  if (!pointer.startsWith("#/")) return undefined;

  const value = pointer
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, part) => {
      if (typeof current !== "object" || current === null) return undefined;
      return (current as Record<string, unknown>)[part];
    }, root);

  return typeof value === "object" && value !== null
    ? (value as JsonSchema)
    : undefined;
}

/** Resolve local references once per document and stop safely on reference cycles. */
export function createSchemaResolver(root: JsonSchema): SchemaResolver {
  const cache = new Map<string, JsonSchema>();
  const resolving = new Set<string>();

  const resolveReference = (reference: string): JsonSchema => {
    const cached = cache.get(reference);
    if (cached) return cached;
    if (resolving.has(reference)) return {};

    const target = pointerValue(root, reference);
    if (!target) return {};

    resolving.add(reference);
    const resolved = target.$ref ? resolve(target) : target;
    resolving.delete(reference);
    cache.set(reference, resolved);
    return resolved;
  };

  const resolve = (schema: JsonSchema): JsonSchema => {
    if (!schema.$ref) return schema;

    const referenced = resolveReference(schema.$ref);
    const overrides = { ...schema };
    delete overrides.$ref;
    return { ...referenced, ...overrides };
  };

  return resolve;
}

function unique(values: string[]): string[] {
  return values.filter((value, index) => values.indexOf(value) === index);
}

export function schemaType(
  schema: JsonSchema,
  resolve: SchemaResolver,
): string {
  const resolved = resolve(schema);

  if (resolved.const !== undefined) return displayValue(resolved.const);
  if (resolved.enum?.length) {
    return resolved.enum.map(displayValue).join(" | ");
  }
  if (Array.isArray(resolved.type)) return resolved.type.join(" | ");
  if (resolved.type === "integer" && resolved.exclusiveMinimum === 0) {
    return "positive integer";
  }
  if (resolved.type === "array") {
    return `array<${resolved.items ? schemaType(resolved.items, resolve) : "unknown"}>`;
  }
  if (resolved.type) return resolved.type;
  if (resolved.properties || resolved.additionalProperties) return "object";
  if (resolved.items) return `array<${schemaType(resolved.items, resolve)}>`;

  const alternatives = resolved.oneOf ?? resolved.anyOf;
  if (alternatives) {
    return unique(
      alternatives.map((option) => schemaType(option, resolve)),
    ).join(" | ");
  }
  return "—";
}

export function schemaConstraints(
  schema: JsonSchema,
  resolve: SchemaResolver,
): string[] {
  const resolved = resolve(schema);
  const constraints: string[] = [];
  const isPositiveInteger =
    resolved.type === "integer" && resolved.exclusiveMinimum === 0;

  if (resolved.minimum !== undefined) {
    constraints.push(`min ${resolved.minimum}`);
  }
  if (
    resolved.maximum !== undefined &&
    resolved.maximum !== Number.MAX_SAFE_INTEGER
  ) {
    constraints.push(`max ${resolved.maximum}`);
  }
  if (resolved.exclusiveMinimum !== undefined && !isPositiveInteger) {
    constraints.push(`> ${resolved.exclusiveMinimum}`);
  }
  if (resolved.exclusiveMaximum !== undefined) {
    constraints.push(`< ${resolved.exclusiveMaximum}`);
  }
  if (resolved.minItems !== undefined) {
    constraints.push(`minItems ${resolved.minItems}`);
  }
  if (resolved.maxItems !== undefined) {
    constraints.push(`maxItems ${resolved.maxItems}`);
  }
  if (resolved.minLength !== undefined) {
    constraints.push(`minLength ${resolved.minLength}`);
  }
  if (resolved.maxLength !== undefined) {
    constraints.push(`maxLength ${resolved.maxLength}`);
  }
  if (resolved.pattern) constraints.push(`pattern ${resolved.pattern}`);

  const alternatives = resolved.oneOf ?? resolved.anyOf;
  if (alternatives) {
    for (const constraint of alternatives.flatMap((option) =>
      schemaConstraints(option, resolve),
    )) {
      if (!constraints.includes(constraint)) constraints.push(constraint);
    }
  }

  return constraints;
}

export function displayValue(value: unknown): string {
  if (value === undefined) return "—";
  const serialized = JSON.stringify(value);
  return serialized === undefined ? String(value) : serialized;
}
