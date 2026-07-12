"use client";

/**
 * Issue 2 — variant: explicit form value type + manual Zod safeParse (no schemaResolver).
 */
import { createGroupSchema } from "@bondery/schemas";
import { useForm } from "@mantine/form";

interface CreateGroupFormValues {
  color: string;
  emoji: string;
  label: string;
}

function validateCreateGroup(values: CreateGroupFormValues): Record<string, string> {
  const result = createGroupSchema.safeParse(values);
  if (result.success) {
    return {};
  }

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

export function Issue2ManualValidateForm({
  onSubmit,
}: {
  onSubmit: (values: CreateGroupFormValues) => void;
}) {
  const form = useForm<CreateGroupFormValues>({
    initialValues: {
      color: "#ff0000",
      emoji: "📁",
      label: "Friends",
    },
    mode: "controlled",
    validate: validateCreateGroup,
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
