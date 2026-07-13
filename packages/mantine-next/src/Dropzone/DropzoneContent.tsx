import { Group, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileZip, IconUpload, IconX } from "@tabler/icons-react";
import type { ReactNode } from "react";

export interface DropzoneContentProps {
  acceptIcon?: ReactNode;
  description?: string;
  idleIcon?: ReactNode;
  minHeight?: number;
  rejectIcon?: ReactNode;
  title: string;
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
    <Group gap="xl" justify="center" mih={minHeight} style={{ pointerEvents: "none" }}>
      <Dropzone.Accept>{acceptIcon}</Dropzone.Accept>
      <Dropzone.Reject>{rejectIcon}</Dropzone.Reject>
      <Dropzone.Idle>{idleIcon}</Dropzone.Idle>

      <div>
        <Text inline size="xl">
          {title}
        </Text>
        {description ? (
          <Text c="dimmed" inline mt="xs" size="sm">
            {description}
          </Text>
        ) : null}
      </div>
    </Group>
  );
}
