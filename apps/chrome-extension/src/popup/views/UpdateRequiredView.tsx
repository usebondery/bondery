import React from "react";
import { Button, Stack, Text } from "@mantine/core";
import { IconPuzzle } from "@tabler/icons-react";
import { BonderyIcon } from "@bondery/branding";
import { browser } from "wxt/browser";

export function UpdateRequiredView() {
  function openExtensionsPage() {
    const extensionId = browser.runtime.id;
    browser.tabs.create({ url: `chrome://extensions/?id=${extensionId}` });
    window.close();
  }

  return (
    <Stack p="md" gap="md" align="center" h={300} justify="center">
      <BonderyIcon width={48} height={48} />
      <Stack gap="xs" align="center">
        <Text size="lg" fw={600}>
          Update Required
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          Your Bondery extension is outdated and may not work correctly. Please update to continue.
        </Text>
      </Stack>
      <Button
        color="red"
        fullWidth
        size="md"
        leftSection={<IconPuzzle size={18} />}
        onClick={openExtensionsPage}
      >
        Open Extensions Page
      </Button>
    </Stack>
  );
}
