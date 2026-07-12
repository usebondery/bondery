"use client";

/** Scaled issue 2 control: 6x schemaResolver forms in one module. */
import { createGroupSchema } from "@bondery/schemas";
import { schemaResolver, useForm } from "@mantine/form";

function SchemaResolverForm({ index }: { index: number }) {
  const form = useForm({
    initialValues: { color: "#ff0000", emoji: "📁", label: `Group ${index}` },
    mode: "controlled",
    validate: schemaResolver(createGroupSchema, { sync: true }),
  });

  return (
    <form onSubmit={form.onSubmit(() => undefined)}>
      <input {...form.getInputProps("label")} />
      <input {...form.getInputProps("color")} />
      <input {...form.getInputProps("emoji")} />
    </form>
  );
}

export function Issue2SchemaResolverScaled() {
  return (
    <>
      <SchemaResolverForm index={1} />
      <SchemaResolverForm index={2} />
      <SchemaResolverForm index={3} />
      <SchemaResolverForm index={4} />
      <SchemaResolverForm index={5} />
      <SchemaResolverForm index={6} />
    </>
  );
}
