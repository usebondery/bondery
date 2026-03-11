import { Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

interface AddNewTagButtonProps {
  label: string;
  onClick: () => void;
  preventInputBlur?: boolean;
  className?: string;
}

export function AddNewTagButton({
  label,
  onClick,
  preventInputBlur = false,
  className,
}: AddNewTagButtonProps) {
  return (
    <Button
      variant="default"
      radius="xl"
      size="xs"
      leftSection={<IconPlus size={14} />}
      className={`button-scale-effect${className ? ` ${className}` : ""}`}
      onMouseDown={(event) => {
        if (preventInputBlur) {
          event.preventDefault();
        }
      }}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
