"use client";

/**
 * Issue 2 — control: Mantine useForm + schemaResolver(Zod schema).
 */
import { createGroupSchema } from "@bondery/schemas";
import { schemaResolver, useForm } from "@mantine/form";

export function Issue2SchemaResolverForm({
  onSubmit,
}: {
  onSubmit: (values: { color: string; emoji: string; label: string }) => void;
}) {
  const form = useForm({
    initialValues: {
      color: "#ff0000",
      emoji: "📁",
      label: "Friends",
    },
    mode: "controlled",
    validate: schemaResolver(createGroupSchema, { sync: true }),
  });

  return (
    <form
      onSubmit={form.onSubmit((values) => {
        onSubmit(values);
      })}
    >
      <input {...form.getInputProps("label")} />
      <input {...form.getInputProps("color")} />
      <input {...form.getInputProps("emoji")} />
      <button type="submit">Save</button>
    </form>
  );
}
