"use client";

import type { TablerIcon } from "@tabler/icons-react";
import {
  IconAdjustmentsHorizontal,
  IconAlertCircle,
  IconAppWindow,
  IconArchive,
  IconBell,
  IconBook,
  IconBoxMultiple,
  IconCalendar,
  IconCircleArrowUp,
  IconCloud,
  IconCode,
  IconContainer,
  IconCreditCard,
  IconDeviceMobile,
  IconDevices,
  IconDownload,
  IconFileExport,
  IconFileImport,
  IconGauge,
  IconGitMerge,
  IconGraph,
  IconHeartbeat,
  IconHeartHandshake,
  IconHistory,
  IconHome,
  IconKey,
  IconLanguage,
  IconLifebuoy,
  IconListCheck,
  IconMap,
  IconMapPin,
  IconMessage,
  IconNetwork,
  IconPencil,
  IconPuzzle,
  IconRefresh,
  IconRobot,
  IconRocket,
  IconRoute,
  IconSearch,
  IconServer,
  IconSettings,
  IconShield,
  IconSparkles,
  IconStack2,
  IconTags,
  IconTerminal,
  IconUpload,
  IconUser,
  IconUserCircle,
  IconUsers,
  IconWebhook,
} from "@tabler/icons-react";

/**
 * Icons a docs page or folder can name. The key is the `icon` value in page
 * frontmatter or in `meta.json`, written without the `Icon` prefix.
 *
 * The allow-list keeps the docs bundle small: only the icons below are imported.
 * Add an entry when a new page needs an icon that is not here yet.
 */
const DOCS_ICONS: Record<string, TablerIcon> = {
  AdjustmentsHorizontal: IconAdjustmentsHorizontal,
  AlertCircle: IconAlertCircle,
  AppWindow: IconAppWindow,
  Archive: IconArchive,
  Bell: IconBell,
  Book: IconBook,
  BoxMultiple: IconBoxMultiple,
  Calendar: IconCalendar,
  CircleArrowUp: IconCircleArrowUp,
  Cloud: IconCloud,
  Code: IconCode,
  Container: IconContainer,
  CreditCard: IconCreditCard,
  DeviceMobile: IconDeviceMobile,
  Devices: IconDevices,
  Download: IconDownload,
  FileExport: IconFileExport,
  FileImport: IconFileImport,
  Gauge: IconGauge,
  GitMerge: IconGitMerge,
  Graph: IconGraph,
  Heartbeat: IconHeartbeat,
  HeartHandshake: IconHeartHandshake,
  History: IconHistory,
  Home: IconHome,
  Key: IconKey,
  Language: IconLanguage,
  Lifebuoy: IconLifebuoy,
  ListCheck: IconListCheck,
  Map: IconMap,
  MapPin: IconMapPin,
  Message: IconMessage,
  Network: IconNetwork,
  Pencil: IconPencil,
  Puzzle: IconPuzzle,
  Refresh: IconRefresh,
  Robot: IconRobot,
  Rocket: IconRocket,
  Route: IconRoute,
  Search: IconSearch,
  Server: IconServer,
  Settings: IconSettings,
  Shield: IconShield,
  Sparkles: IconSparkles,
  Stack2: IconStack2,
  Tags: IconTags,
  Terminal: IconTerminal,
  Upload: IconUpload,
  User: IconUser,
  UserCircle: IconUserCircle,
  Users: IconUsers,
  Webhook: IconWebhook,
};

type DocsIconProps = {
  /** Tabler name without the `Icon` prefix, for example `Server`. */
  name: string;
  size?: number;
};

/** Tabler icon for a docs navigation name. An unknown name throws, so a typo fails the build. */
export function DocsIcon({ name, size = 18 }: DocsIconProps) {
  const Icon = DOCS_ICONS[name];

  if (!Icon) {
    throw new Error(`Unknown docs icon "${name}". Add it to DOCS_ICONS in DocsIcon.tsx.`);
  }

  return <Icon size={size} stroke={1.7} />;
}
