"use client";

import {
  Stack,
  Text,
  Textarea,
  Button,
  Group,
  Paper,
  Code,
  Collapse,
  Loader,
  Alert,
  CopyButton,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconKey,
  IconCopy,
  IconCheck,
  IconEdit,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconDownload,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import type { Contact } from "@bondery/types";

interface ContactPGPSectionProps {
  contact: Contact;
  savingField: string | null;
  handleChange: (field: string, value: string) => void;
  handleBlur: (field: string, value: string) => void;
}

export function ContactPGPSection({
  contact,
  savingField,
  handleChange,
  handleBlur,
}: ContactPGPSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isViewingKey, setIsViewingKey] = useState(false);
  const [editedKey, setEditedKey] = useState(contact.pgpPublicKey || "");

  const hasPGPKey = contact.pgpPublicKey && contact.pgpPublicKey.trim().length > 0;

  const handleEdit = () => {
    setEditedKey(contact.pgpPublicKey || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedKey(contact.pgpPublicKey || "");
    setIsEditing(false);
  };

  const handleSave = () => {
    // Basic validation for PGP key format
    if (editedKey.trim() && !isValidPGPKey(editedKey)) {
      // Just show a warning but still allow saving
      console.warn("PGP key format may not be valid");
    }

    handleBlur("pgpPublicKey", editedKey);
    setIsEditing(false);
  };

  const isValidPGPKey = (key: string): boolean => {
    if (!key || key.trim().length === 0) return true; // Empty is valid

    const trimmedKey = key.trim();
    return (
      trimmedKey.includes("-----BEGIN PGP PUBLIC KEY BLOCK-----") &&
      trimmedKey.includes("-----END PGP PUBLIC KEY BLOCK-----")
    );
  };

  const handleRemove = () => {
    setEditedKey("");
    handleBlur("pgpPublicKey", "");
    setIsEditing(false);
  };

  const handleDownload = () => {
    if (!contact.pgpPublicKey) return;

    const blob = new Blob([contact.pgpPublicKey], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${contact.firstName || "contact"}_pgp_key.asc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const extractKeyInfo = (key: string) => {
    try {
      // Basic extraction of key info from ASCII-armored PGP key
      const lines = key.split("\n");

      // Look for key size and algorithm info
      let keyType = "Unknown";
      let keySize = null;

      // Check for common key type indicators
      if (key.includes("RSA")) keyType = "RSA";
      else if (key.includes("DSA")) keyType = "DSA";
      else if (key.includes("ECDSA")) keyType = "ECDSA";
      else if (key.includes("EdDSA")) keyType = "EdDSA";

      // Look for size info (like 2048, 4096, etc.)
      const sizeMatch = key.match(/(\d{4})/);
      if (sizeMatch) keySize = sizeMatch[1];

      // Extract fingerprint or key ID if present
      const keyIdMatch = key.match(/[0-9A-F]{8,40}/g);
      let keyId = "Unknown";

      if (keyIdMatch && keyIdMatch.length > 0) {
        // Use the longest match as it's likely the fingerprint
        const longest = keyIdMatch.reduce((a, b) => (a.length > b.length ? a : b));
        if (longest.length >= 16) {
          keyId = `0x${longest.slice(-16)}`; // Last 16 chars for key ID
        }
      }

      return {
        keyId,
        type: keySize ? `${keyType}-${keySize}` : keyType,
      };
    } catch {
      return { keyId: "Unknown", type: "Unknown" };
    }
  };

  const keyInfo = hasPGPKey ? extractKeyInfo(contact.pgpPublicKey!) : null;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group gap="xs">
          <IconKey size={18} />
          <Text fw={500}>PGP Public Key</Text>
          {savingField === "pgpPublicKey" && <Loader size="xs" />}
        </Group>
        {hasPGPKey && !isEditing && (
          <Group gap="xs">
            <Tooltip label="View key">
              <ActionIcon variant="subtle" size="sm" onClick={() => setIsViewingKey(!isViewingKey)}>
                {isViewingKey ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Download key">
              <ActionIcon variant="subtle" size="sm" onClick={handleDownload}>
                <IconDownload size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit key">
              <ActionIcon variant="subtle" size="sm" onClick={handleEdit}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      </Group>

      {!hasPGPKey && !isEditing ? (
        <Paper p="md" withBorder style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
          <Stack gap="sm" align="center">
            <IconKey size={48} stroke={1} color="var(--mantine-color-gray-5)" />
            <Text c="dimmed" ta="center">
              No PGP public key added yet
            </Text>
            <Button
              variant="light"
              leftSection={<IconKey size={16} />}
              onClick={() => setIsEditing(true)}
            >
              Add PGP Key
            </Button>
          </Stack>
        </Paper>
      ) : hasPGPKey && !isEditing ? (
        <Stack gap="sm">
          <Paper p="md" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text size="sm" fw={500} c="dimmed">
                  Key Information
                </Text>
                <CopyButton value={contact.pgpPublicKey || ""}>
                  {({ copied, copy }) => (
                    <Tooltip label={copied ? "Copied!" : "Copy full key"}>
                      <ActionIcon
                        color={copied ? "teal" : "gray"}
                        variant="subtle"
                        onClick={copy}
                        size="sm"
                      >
                        {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      </ActionIcon>
                    </Tooltip>
                  )}
                </CopyButton>
              </Group>
              {keyInfo && (
                <Group gap="md">
                  <Text size="sm">
                    <Text component="span" c="dimmed">
                      Key ID:
                    </Text>
                    <Code ml="xs">{keyInfo.keyId}</Code>
                  </Text>
                  <Text size="sm">
                    <Text component="span" c="dimmed">
                      Type:
                    </Text>
                    <Code ml="xs">{keyInfo.type}</Code>
                  </Text>
                </Group>
              )}
            </Stack>
          </Paper>

          <Collapse in={isViewingKey}>
            <Paper p="md" withBorder style={{ backgroundColor: "var(--mantine-color-gray-0)" }}>
              <Stack gap="xs">
                <Text size="sm" fw={500} c="dimmed">
                  Full PGP Public Key
                </Text>
                <Code block style={{ whiteSpace: "pre-wrap", fontSize: "11px" }}>
                  {contact.pgpPublicKey}
                </Code>
              </Stack>
            </Paper>
          </Collapse>
        </Stack>
      ) : (
        <Stack gap="md">
          <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
            Paste your ASCII-armored PGP public key below. This will be included in your vCard
            exports.
          </Alert>

          {editedKey.trim() && !isValidPGPKey(editedKey) && (
            <Alert icon={<IconInfoCircle size={16} />} color="orange" variant="light">
              The text doesn't appear to be in standard PGP format, but you can still save it.
            </Alert>
          )}

          <Textarea
            placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----
Version: OpenPGP.js v5.0.0
Comment: https://openpgpjs.org

xsBNBGHj...
...
-----END PGP PUBLIC KEY BLOCK-----"
            value={editedKey}
            onChange={(event) => {
              setEditedKey(event.currentTarget.value);
              handleChange("pgpPublicKey", event.currentTarget.value);
            }}
            rows={8}
            style={{ fontFamily: "monospace", fontSize: "12px" }}
          />

          <Group justify="flex-end" gap="xs">
            <Button
              variant="subtle"
              onClick={handleCancel}
              disabled={savingField === "pgpPublicKey"}
            >
              Cancel
            </Button>
            {hasPGPKey && (
              <Button
                color="red"
                variant="subtle"
                leftSection={<IconTrash size={16} />}
                onClick={handleRemove}
                disabled={savingField === "pgpPublicKey"}
              >
                Remove
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={savingField === "pgpPublicKey"}
              loading={savingField === "pgpPublicKey"}
            >
              {hasPGPKey ? "Update" : "Save"}
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  );
}
