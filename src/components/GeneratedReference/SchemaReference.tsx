import Translate, { translate } from "@docusaurus/Translate";
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import styles from "./styles.module.css";
import {
  createSchemaResolver,
  displayValue,
  schemaConstraints,
  schemaType,
  type JsonSchema,
  type SchemaResolver,
} from "./schema";

type Props = {
  schema: JsonSchema;
  sectionLinks?: Record<string, string>;
};

type ObjectCandidate = {
  schema: JsonSchema;
  suffix: string;
  reference?: string;
};

type Field = {
  name: string;
  schema: JsonSchema;
  required?: boolean;
  target?: string;
};

type Variant = {
  label: string;
  description?: string;
  fields: Field[];
  requiredKeys: string[];
};

type Section = {
  id: string;
  path: string;
  description?: string;
  sharedFields: Field[];
  variants: Variant[];
};

type ReferenceModel = {
  root: Section;
  sections: Section[];
};

function schemaSignature(schema: JsonSchema): string {
  return JSON.stringify(schema);
}

function uniqueCandidates(candidates: ObjectCandidate[]): ObjectCandidate[] {
  const signatures = new Set<string>();
  return candidates.filter((candidate) => {
    const signature = `${candidate.suffix}:${schemaSignature(candidate.schema)}`;
    if (signatures.has(signature)) return false;
    signatures.add(signature);
    return true;
  });
}

function isDocumentableObject(schema: JsonSchema): boolean {
  if (Object.keys(schema.properties ?? {}).length > 0) return true;
  if (
    typeof schema.additionalProperties === "object" &&
    Object.keys(schema.additionalProperties).length > 0
  ) {
    return true;
  }
  return false;
}

function objectCandidates(
  schema: JsonSchema,
  resolve: SchemaResolver,
  suffix = "",
  inheritedReference?: string,
): ObjectCandidate[] {
  const reference = schema.$ref ?? inheritedReference;
  const resolved = resolve(schema);

  if (resolved.type === "array" && resolved.items) {
    return objectCandidates(resolved.items, resolve, `${suffix}[]`, reference);
  }

  if (isDocumentableObject(resolved)) {
    return [{ schema: resolved, suffix, reference }];
  }

  const alternatives = resolved.oneOf ?? resolved.anyOf ?? resolved.allOf;
  if (!alternatives) return [];

  return uniqueCandidates(
    alternatives.flatMap((option) =>
      objectCandidates(option, resolve, suffix, reference),
    ),
  );
}

function pathAnchor(path: string): string {
  const slug = path
    .replaceAll("[]", "")
    .replaceAll("<", "")
    .replaceAll(">", "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return slug ? `schema-${slug}` : "schema-root";
}

function referenceAnchor(reference: string): string {
  return `schema-def-${reference
    .replace(/^#\//, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()}`;
}

function variantAnchor(sectionId: string, label: string): string {
  const slug = label
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${sectionId}-${slug || "variant"}`;
}

function stepLabel(key: string): string {
  return translate(
    {
      id: "generatedReference.stepVariant",
      message: "`{key}` step",
    },
    { key },
  );
}

function inputLabel(key: string): string {
  return translate(
    {
      id: "generatedReference.inputVariant",
      message: "`{key}` input",
    },
    { key },
  );
}

function variantLabels(candidates: ObjectCandidate[]): string[] {
  const required = candidates.map(
    (candidate) => candidate.schema.required ?? [],
  );
  const commonRequired =
    required[0]?.filter((key) =>
      required.every((candidateKeys) => candidateKeys.includes(key)),
    ) ?? [];

  return candidates.map((candidate, index) => {
    const schema = candidate.schema;
    const properties = schema.properties ?? {};
    const distinctive = (schema.required ?? []).filter(
      (key) => !commonRequired.includes(key),
    );
    if (schema.title) {
      const distinctiveKey =
        distinctive.length === 1 ? distinctive[0] : undefined;
      return distinctiveKey &&
        !schema.title.toLowerCase().includes(distinctiveKey.toLowerCase())
        ? `${schema.title} (\`${distinctiveKey}\`)`
        : schema.title;
    }

    const discriminator = Object.entries(properties).find(
      ([, property]) => property.const !== undefined,
    );
    if (
      discriminator?.[0] === "type" &&
      typeof discriminator[1].const === "string"
    ) {
      return inputLabel(discriminator[1].const);
    }

    if (distinctive.includes("workflows")) {
      return translate({
        id: "generatedReference.workflowRecipe",
        message: "Workflow recipe (`workflows`)",
      });
    }
    if (distinctive.includes("steps") && distinctive.includes("on")) {
      return translate({
        id: "generatedReference.workflowWithSteps",
        message: "Workflow with steps",
      });
    }
    if (distinctive.length === 1 && distinctive[0] === "steps") {
      return translate({
        id: "generatedReference.stepRecipe",
        message: "Step recipe (`steps`)",
      });
    }
    if (
      distinctive.length === 1 &&
      ["claude", "shell"].includes(distinctive[0])
    ) {
      return stepLabel(distinctive[0]);
    }
    if (distinctive.length === 1 && distinctive[0] === "uses") {
      return Object.hasOwn(properties, "id")
        ? stepLabel("uses")
        : translate({
            id: "generatedReference.workflowUsesRecipe",
            message: "Workflow recipe (`uses`)",
          });
    }
    if (Object.hasOwn(properties, "type") && properties.type.enum?.length) {
      return translate({
        id: "generatedReference.valueInput",
        message: "Value input",
      });
    }
    if (distinctive.length > 0) {
      return translate(
        {
          id: "generatedReference.keyVariant",
          message: "`{keys}` variant",
        },
        { keys: distinctive.join(" + ") },
      );
    }
    if (schema.description) {
      return schema.description.split(/[.!?](?:\s|$)/, 1)[0];
    }
    return translate(
      {
        id: "generatedReference.option",
        message: "Option {number}",
      },
      { number: index + 1 },
    );
  });
}

function schemaFields(schema: JsonSchema): Field[] {
  const required = new Set(schema.required ?? []);
  const fields = Object.entries(schema.properties ?? {}).map(
    ([name, property]): Field => ({
      name,
      schema: property,
      required: required.has(name),
    }),
  );

  if (
    typeof schema.additionalProperties === "object" &&
    Object.keys(schema.additionalProperties).length > 0
  ) {
    fields.push({
      name: "<name>",
      schema: schema.additionalProperties,
    });
  }
  return fields;
}

function commonFieldNames(candidates: ObjectCandidate[]): Set<string> {
  if (candidates.length < 2) return new Set<string>();
  const fieldSets = candidates.map(
    (candidate) =>
      new Map(
        schemaFields(candidate.schema).map((field) => [field.name, field]),
      ),
  );

  return new Set(
    [...fieldSets[0].entries()]
      .filter(([name, field]) =>
        fieldSets.slice(1).every((fields) => {
          const other = fields.get(name);
          return (
            other !== undefined &&
            other.required === field.required &&
            schemaSignature(other.schema) === schemaSignature(field.schema)
          );
        }),
      )
      .map(([name]) => name),
  );
}

function distinctiveRequiredKeys(candidates: ObjectCandidate[]): string[][] {
  const required = candidates.map(
    (candidate) => candidate.schema.required ?? [],
  );
  const common =
    required[0]?.filter((key) =>
      required.every((candidateKeys) => candidateKeys.includes(key)),
    ) ?? [];
  return required.map((keys) => keys.filter((key) => !common.includes(key)));
}

function buildReferenceModel(
  rootSchema: JsonSchema,
  sectionLinks: Record<string, string>,
): ReferenceModel {
  const resolve = createSchemaResolver(rootSchema);
  const sections: Section[] = [];
  const sectionsById = new Map<string, Section>();
  const referenceTargets = new Map<string, string>();

  const connectFields = (section: Section): void => {
    const connect = (field: Field): Field => {
      const childPath = section.path
        ? `${section.path}.${field.name}`
        : field.name;
      return { ...field, target: ensureSection(field.schema, childPath) };
    };

    section.sharedFields = section.sharedFields.map(connect);
    section.variants = section.variants.map((variant) => ({
      ...variant,
      fields: variant.fields.map(connect),
    }));
  };

  const makeSection = (
    path: string,
    candidates: ObjectCandidate[],
    id: string,
  ): Section => {
    const commonNames = commonFieldNames(candidates);
    const labels = variantLabels(candidates);
    const distinctiveRequired = distinctiveRequiredKeys(candidates);
    const allFields = candidates.map((candidate) =>
      schemaFields(candidate.schema),
    );
    const sharedFields =
      candidates.length === 1
        ? allFields[0]
        : allFields[0].filter((field) => commonNames.has(field.name));
    const descriptions = candidates
      .map((candidate) => candidate.schema.description)
      .filter((description): description is string => Boolean(description));
    const description =
      descriptions.length > 0 &&
      descriptions.every((value) => value === descriptions[0])
        ? descriptions[0]
        : undefined;

    return {
      id,
      path,
      description,
      sharedFields,
      variants:
        candidates.length === 1
          ? []
          : candidates.map((candidate, index) => ({
              label: labels[index],
              description:
                candidate.schema.description === description
                  ? undefined
                  : candidate.schema.description,
              fields: allFields[index].filter(
                (field) => !commonNames.has(field.name),
              ),
              requiredKeys:
                distinctiveRequired[index].length > 0
                  ? distinctiveRequired[index]
                  : (candidate.schema.required ?? []),
            })),
    };
  };

  function ensureSection(
    schema: JsonSchema,
    requestedPath: string,
  ): string | undefined {
    const candidates = objectCandidates(schema, resolve);
    if (candidates.length === 0) return undefined;

    const suffix = candidates[0].suffix;
    const path = `${requestedPath}${suffix}`;
    const externalTarget = sectionLinks[path];
    if (externalTarget) return externalTarget;

    const sharedReference = candidates.every(
      (candidate) =>
        candidate.reference && candidate.reference === candidates[0].reference,
    )
      ? candidates[0].reference
      : undefined;
    if (sharedReference) {
      const existingTarget = referenceTargets.get(sharedReference);
      if (existingTarget) return existingTarget;
    }

    const id = sharedReference
      ? referenceAnchor(sharedReference)
      : pathAnchor(path);
    const existing = sectionsById.get(id);
    if (existing) return `#${existing.id}`;

    const section = makeSection(path, candidates, id);
    sectionsById.set(id, section);
    sections.push(section);
    if (sharedReference) referenceTargets.set(sharedReference, `#${id}`);

    // Register the section before visiting children so a real recursive $ref
    // becomes a link back to this stable anchor instead of recursing forever.
    connectFields(section);
    return `#${id}`;
  }

  const rootCandidates = objectCandidates(rootSchema, resolve);
  const root =
    rootCandidates.length > 0
      ? makeSection("", rootCandidates, "schema-root")
      : makeSection(
          "",
          [{ schema: resolve(rootSchema), suffix: "" }],
          "schema-root",
        );
  connectFields(root);

  return { root, sections };
}

function InlineCode({ text }: { text: string }): ReactNode {
  return text
    .split(/(`[^`]+`)/)
    .map((part, index) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <code key={index}>{part.slice(1, -1)}</code>
      ) : (
        part
      ),
    );
}

function Description({ value }: { value?: string }): ReactNode {
  if (!value) return <>—</>;
  return (
    <div className={styles.description}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
    </div>
  );
}

function PropertiesTable({
  fields,
  resolve,
}: {
  fields: Field[];
  resolve: SchemaResolver;
}): ReactNode {
  if (fields.length === 0) {
    return (
      <p className={styles.empty}>
        <Translate id="generatedReference.empty">
          This schema has no documented properties.
        </Translate>
      </p>
    );
  }

  const labels = {
    name: translate({ id: "generatedReference.name", message: "Name" }),
    type: translate({ id: "generatedReference.type", message: "Type" }),
    required: translate({
      id: "generatedReference.required",
      message: "Required",
    }),
    default: translate({
      id: "generatedReference.default",
      message: "Default",
    }),
    description: translate({
      id: "generatedReference.description",
      message: "Description",
    }),
  };

  return (
    <div className={styles.tableWrap}>
      <table className={styles.schemaTable}>
        <thead>
          <tr>
            <th>{labels.name}</th>
            <th>{labels.type}</th>
            <th>{labels.required}</th>
            <th>{labels.default}</th>
            <th>{labels.description}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => {
            const resolved = resolve(field.schema);
            const constraints = schemaConstraints(field.schema, resolve);
            return (
              <tr key={field.name}>
                <td data-label={labels.name}>
                  {field.target ? (
                    <a href={field.target}>
                      <code>{field.name}</code>
                    </a>
                  ) : (
                    <code>{field.name}</code>
                  )}
                </td>
                <td data-label={labels.type}>
                  <code className={styles.typeValue}>
                    {schemaType(field.schema, resolve)}
                  </code>
                  {constraints.length > 0 && (
                    <small className={styles.constraints}>
                      {constraints.join(" · ")}
                    </small>
                  )}
                </td>
                <td data-label={labels.required}>
                  {field.required === undefined ? (
                    "—"
                  ) : field.required ? (
                    <Translate id="generatedReference.yes">Yes</Translate>
                  ) : (
                    <Translate id="generatedReference.no">No</Translate>
                  )}
                </td>
                <td data-label={labels.default}>
                  <code>{displayValue(resolved.default)}</code>
                </td>
                <td data-label={labels.description}>
                  <Description value={resolved.description} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function VariantComparison({
  variants,
  nested = false,
}: {
  variants: Variant[];
  nested?: boolean;
}): ReactNode {
  return (
    <section className={styles.variantOverview}>
      {nested ? (
        <h3>
          <Translate id="generatedReference.variants">Variants</Translate>
        </h3>
      ) : (
        <h2>
          <Translate id="generatedReference.variants">Variants</Translate>
        </h2>
      )}
      <div className={styles.comparisonGrid}>
        {variants.map((variant) => (
          <div className={styles.comparisonCard} key={variant.label}>
            <strong>
              <InlineCode text={variant.label} />
            </strong>
            <span>
              <Translate id="generatedReference.requiredKeys">
                Distinctive required keys
              </Translate>
              :{" "}
              {variant.requiredKeys.length > 0
                ? variant.requiredKeys.map((key, index) => (
                    <span key={key}>
                      {index > 0 && ", "}
                      <code>{key}</code>
                    </span>
                  ))
                : "—"}
            </span>
            {variant.description && <Description value={variant.description} />}
          </div>
        ))}
      </div>
    </section>
  );
}

function VariantSections({
  section,
  resolve,
  root = false,
}: {
  section: Section;
  resolve: SchemaResolver;
  root?: boolean;
}): ReactNode {
  if (section.variants.length === 0) {
    return <PropertiesTable fields={section.sharedFields} resolve={resolve} />;
  }

  return (
    <>
      {section.sharedFields.length > 0 && (
        <div className={styles.sharedFields}>
          {root ? (
            <h2>
              <Translate id="generatedReference.sharedFields">
                Shared fields
              </Translate>
            </h2>
          ) : (
            <h3>
              <Translate id="generatedReference.sharedFields">
                Shared fields
              </Translate>
            </h3>
          )}
          <PropertiesTable fields={section.sharedFields} resolve={resolve} />
        </div>
      )}
      {section.variants.map((variant) => (
        <section
          className={styles.variant}
          id={variantAnchor(section.id, variant.label)}
          key={variant.label}
        >
          <h3>
            <InlineCode text={variant.label} />
            <a
              aria-label={translate({
                id: "generatedReference.linkToVariant",
                message: "Link to this variant",
              })}
              className={styles.hashLink}
              href={`#${variantAnchor(section.id, variant.label)}`}
            >
              #
            </a>
          </h3>
          {variant.description && <Description value={variant.description} />}
          <PropertiesTable fields={variant.fields} resolve={resolve} />
        </section>
      ))}
    </>
  );
}

function SchemaSection({
  section,
  resolve,
}: {
  section: Section;
  resolve: SchemaResolver;
}): ReactNode {
  return (
    <section className={styles.schemaSection} id={section.id}>
      <h2>
        <code>{section.path}</code>
        <a
          aria-label={translate({
            id: "generatedReference.linkToSection",
            message: "Link to this section",
          })}
          className={styles.hashLink}
          href={`#${section.id}`}
        >
          #
        </a>
      </h2>
      {section.description && <Description value={section.description} />}
      {section.variants.length > 1 && (
        <VariantComparison variants={section.variants} nested />
      )}
      <VariantSections section={section} resolve={resolve} />
    </section>
  );
}

export default function SchemaReference({
  schema,
  sectionLinks = {},
}: Props): ReactNode {
  const resolve = createSchemaResolver(schema);
  const model = buildReferenceModel(schema, sectionLinks);
  const topLevelSections = model.sections.filter(
    (section) => !section.path.includes("."),
  );

  return (
    <div className={styles.reference}>
      {model.root.variants.length > 1 && (
        <VariantComparison variants={model.root.variants} />
      )}

      {topLevelSections.length > 0 && (
        <nav
          aria-label={translate({
            id: "generatedReference.schemaSections",
            message: "Schema sections",
          })}
          className={styles.sectionToc}
        >
          <strong>
            <Translate id="generatedReference.onThisPage">
              On this page
            </Translate>
          </strong>
          <ul>
            {topLevelSections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>
                  <code>{section.path}</code>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <VariantSections section={model.root} resolve={resolve} root />

      {model.sections.map((section) => (
        <SchemaSection key={section.id} section={section} resolve={resolve} />
      ))}
    </div>
  );
}
