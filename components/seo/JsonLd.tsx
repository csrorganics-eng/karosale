type JsonValue = Record<string, unknown> | unknown[];

/**
 * Renders JSON-LD for rich results. Server-only — do not mark `"use client"`.
 */
export function JsonLd({ data }: { data: JsonValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function JsonLdMulti({ items }: { items: Array<Record<string, unknown>> }) {
  return (
    <>
      {items.map((data, i) => (
        <JsonLd key={i} data={data} />
      ))}
    </>
  );
}
