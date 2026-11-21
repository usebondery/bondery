import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { cn } from "cn";

interface AddNewTagButtonProps {
  className?: string;
  label: string;
  /** Omit when the button sits inside `Combobox.Option` — selection is handled by `onOptionSubmit`. */
  onClick?: () => void;
  preventInputBlur?: boolean;
}

export function AddNewTagButton({
  label,
  onClick,
  preventInputBlur = false,
  className,
}: AddNewTagButtonProps) {
  return (
    <Button
      className={cn("button-scale-effect", className)}
      leftSection={<IconPlus size={14} />}
      onClick={onClick}
      onMouseDown={(event) => {
        if (preventInputBlur) {
          event.preventDefault();
        }
      }}
      radius="xl"
      size="xs"
      variant="default"
    >
      {label}
    </Button>
  );
}
