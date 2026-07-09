import { BonderyIcon } from "@bondery/branding";
import { Button, Stack, Text } from "@mantine/core";
import { IconPuzzle } from "@tabler/icons-react";
import { browser } from "wxt/browser";

export function UpdateRequiredView() {
  function openExtensionsPage() {
    const extensionId = browser.runtime.id;
    browser.tabs.create({ url: `chrome://extensions/?id=${extensionId}` });
    window.close();
  }

  return (
    <Stack align="center" gap="md" h={300} justify="center" p="md">
      <BonderyIcon height={48} width={48} />
      <Stack align="center" gap="xs">
        <Text fw={600} size="lg">
          Update Required
        </Text>
        <Text c="dimmed" size="sm" ta="center">
          Your Bondery extension is outdated and may not work correctly. Please update to continue.
        </Text>
      </Stack>
      <Button
        color="red"
        fullWidth
        leftSection={<IconPuzzle size={18} />}
        onClick={openExtensionsPage}
        size="md"
      >
        Open Extensions Page
      </Button>
    </Stack>
  );
}
