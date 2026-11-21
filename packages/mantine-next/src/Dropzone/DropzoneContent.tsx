import { Group, Text } from "@mantine/core";
import { Dropzone } from "@mantine/dropzone";
import { IconFileZip, IconUpload, IconX } from "@tabler/icons-react";
import type { ReactElement, ReactNode } from "react";

export interface DropzoneContentProps {
  acceptIcon?: ReactNode;
  description?: string;
  idleIcon?: ReactNode;
  minHeight?: number;
  rejectIcon?: ReactNode;
  title: string;
}

const DEFAULT_ACCEPT_ICON = <IconUpload size={52} stroke={1.5} />;
const DEFAULT_REJECT_ICON = <IconX size={52} stroke={1.5} />;
const DEFAULT_IDLE_ICON = <IconFileZip size={52} stroke={1.5} />;

export function DropzoneContent({
  acceptIcon = DEFAULT_ACCEPT_ICON,
  rejectIcon = DEFAULT_REJECT_ICON,
  idleIcon = DEFAULT_IDLE_ICON,
  title,
  description,
  minHeight = 220,
}: DropzoneContentProps): ReactElement {
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
