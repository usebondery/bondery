import {
  IconAffiliate,
  IconBellRinging,
  IconMessageChatbot,
  IconRefresh,
  IconTimelineEvent,
  IconUserPlus,
} from "@tabler/icons-react";
import { AiClientLinks } from "./AiClientLinks";
import { AssistantVisual } from "./AssistantVisual";
import { BentoCard, type BentoCardProps } from "./BentoCard";
import { GlobeVisual } from "./GlobeVisual";
import { Reveal } from "./Reveal";
import { SourcesVisual } from "./SourcesVisual";
import { TimelineVisual } from "./TimelineVisual";
import { KeepInTouchVisual, SyncVisual } from "./visuals";

type BentoTile = BentoCardProps & {
  id: string;
  /** Grid placement. The grid is 1 column on phones, 2 on tablets, 6 on desktop. */
  span: "wide" | "narrow" | "half";
};

const SPAN_CLASS: Record<BentoTile["span"], string> = {
  half: "lg:col-span-3",
  narrow: "lg:col-span-2",
  wide: "md:col-span-2 lg:col-span-4",
};

/*
 * Copy rules (see the bondery-brand skill): titles of five words or fewer,
 * descriptions of ten words or fewer.
 */
const TILES: BentoTile[] = [
  {
    description: "Every source merges into one list, duplicates included.",
    icon: IconUserPlus,
    id: "sources",
    span: "wide",
    title: "Everyone you met in one place",
    visual: <SourcesVisual />,
  },
  {
    description: "Notes and history on every person.",
    icon: IconTimelineEvent,
    id: "timeline",
    span: "narrow",
    title: "Remember every conversation",
    visual: <TimelineVisual />,
  },
  {
    description: "Set a cadence. Get nudged when it's due.",
    icon: IconBellRinging,
    id: "keep-in-touch",
    span: "narrow",
    title: "Reach out on time",
    visual: <KeepInTouchVisual />,
  },
  {
    aside: <AiClientLinks />,
    description: "Give Claude or any MCP client your contact book.",
    icon: IconMessageChatbot,
    id: "assistant",
    span: "wide",
    title: "Your network, in your AI",
    visual: <AssistantVisual />,
  },
  {
    description: "Search your network. See who is in a city before you go.",
    icon: IconAffiliate,
    id: "network",
    span: "half",
    title: "Find anyone",
    visual: <GlobeVisual />,
  },
  {
    description: "Profiles refresh from the sources you saved them from.",
    icon: IconRefresh,
    id: "sync",
    span: "half",
    title: "Always up to date",
    visual: <SyncVisual />,
  },
];

/**
 * Six feature tiles on a responsive grid, each pairing a benefit with a product mock.
 */
export function FeatureBento() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
      {TILES.map(({ id, span, ...tile }, index) => (
        <Reveal className={SPAN_CLASS[span]} delay={(index % 2) * 0.08} key={id}>
          <BentoCard {...tile} />
        </Reveal>
      ))}
    </div>
  );
}
