import type { Thing, WithContext } from "schema-dts";

export function serializeJsonLd(data: WithContext<Thing>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({
  id,
  data,
  nonce,
}: {
  id: string;
  data: WithContext<Thing>;
  nonce?: string;
}) {
  return (
    <script id={id} nonce={nonce} type="application/ld+json">
      {serializeJsonLd(data)}
    </script>
  );
}
