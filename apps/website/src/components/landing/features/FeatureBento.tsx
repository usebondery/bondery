import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import {
  IconAffiliate,
  IconBellRinging,
  IconMessageChatbot,
  IconTable,
  IconTimelineEvent,
  IconUserPlus,
} from "@tabler/icons-react";
import { AiClientLinks } from "./AiClientLinks";
import { AssistantVisual } from "./AssistantVisual";
import { BentoCard, type BentoCardProps } from "./BentoCard";
import { GlobeVisual } from "./GlobeVisual";
import { Reveal } from "./Reveal";
import { SourcesVisual } from "./SourcesVisual";
import { SpreadsheetVisual } from "./SpreadsheetVisual";
import { TimelineVisual } from "./TimelineVisual";
import { ReminderEmailVisual } from "./visuals";

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
    description: landing.Bento.Sources.Description,
    icon: IconUserPlus,
    id: "sources",
    span: "wide",
    title: landing.Bento.Sources.Title,
    visual: <SourcesVisual />,
  },
  {
    description: landing.Bento.Timeline.Description,
    icon: IconTimelineEvent,
    id: "timeline",
    span: "narrow",
    title: landing.Bento.Timeline.Title,
    visual: <TimelineVisual />,
  },
  {
    description: landing.Bento.KeepInTouch.Description,
    icon: IconBellRinging,
    id: "keep-in-touch",
    span: "narrow",
    title: landing.Bento.KeepInTouch.Title,
    visual: <ReminderEmailVisual />,
  },
  {
    aside: <AiClientLinks />,
    description: landing.Bento.Assistant.Description,
    icon: IconMessageChatbot,
    id: "assistant",
    span: "wide",
    title: landing.Bento.Assistant.Title,
    visual: <AssistantVisual />,
  },
  {
    description: landing.Bento.Network.Description,
    icon: IconAffiliate,
    id: "network",
    span: "half",
    title: landing.Bento.Network.Title,
    visual: <GlobeVisual />,
  },
  {
    description: landing.Bento.Spreadsheet.Description,
    icon: IconTable,
    id: "spreadsheet",
    span: "half",
    title: landing.Bento.Spreadsheet.Title,
    visual: <SpreadsheetVisual />,
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
