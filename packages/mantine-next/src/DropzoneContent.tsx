import { Group, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileZip, IconUpload, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface DropzoneContentProps {
  acceptIcon?: ReactNode;
  rejectIcon?: ReactNode;
  idleIcon?: ReactNode;
  title: string;
  description?: string;
  minHeight?: number;
}

export function DropzoneContent({
  acceptIcon = <IconUpload size={52} stroke={1.5} />,
  rejectIcon = <IconX size={52} stroke={1.5} />,
  idleIcon = <IconFileZip size={52} stroke={1.5} />,
  title,
  description,
  minHeight = 220,
}: DropzoneContentProps) {
  return (
    <Group justify="center" gap="xl" mih={minHeight} style={{ pointerEvents: "none" }}>
      <Dropzone.Accept>{acceptIcon}</Dropzone.Accept>
      <Dropzone.Reject>{rejectIcon}</Dropzone.Reject>
      <Dropzone.Idle>{idleIcon}</Dropzone.Idle>

      <div>
        <Text size="xl" inline>
          {title}
        </Text>
        {description ? (
          <Text size="sm" c="dimmed" inline mt="xs">
            {description}
          </Text>
        ) : null}
      </div>
    </Group>
  );
}
