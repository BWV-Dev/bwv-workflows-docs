export type GeneratedModule<T> = T | { default: T };

export function unwrapGeneratedModule<T>(module: GeneratedModule<T>): T {
  if (typeof module === "object" && module !== null && "default" in module) {
    return module.default;
  }
  return module;
}

export function requireGenerated<T>(
  registry: Record<string, T>,
  key: string,
  kind: "recipe" | "sample",
): T {
  const value = registry[key];
  if (value !== undefined) return value;

  const available = Object.keys(registry).sort();
  throw new Error(
    `Unknown generated ${kind} key "${key}". Available keys: ${
      available.length > 0 ? available.join(", ") : "(none)"
    }`,
  );
}
