"use client";

/** Scaled issue 2 variant: 6x manual validate forms in one module. */
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

function ManualValidateForm({ index }: { index: number }) {
  const form = useForm<CreateGroupFormValues>({
    initialValues: { color: "#ff0000", emoji: "📁", label: `Group ${index}` },
    mode: "controlled",
    validate: validateCreateGroup,
  });

  return (
    <form onSubmit={form.onSubmit(() => undefined)}>
      <input {...form.getInputProps("label")} />
      <input {...form.getInputProps("color")} />
      <input {...form.getInputProps("emoji")} />
    </form>
  );
}

export function Issue2ManualValidateScaled() {
  return (
    <>
      <ManualValidateForm index={1} />
      <ManualValidateForm index={2} />
      <ManualValidateForm index={3} />
      <ManualValidateForm index={4} />
      <ManualValidateForm index={5} />
      <ManualValidateForm index={6} />
    </>
  );
}
