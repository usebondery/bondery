"use client";

import { type InlineToken, parseInlineTokens } from "@bondery/helpers";
import type { Contact } from "@bondery/schemas";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useCurrentLocale } from "@/components/shell/UserLocaleProvider";
import { getContactDetail } from "@/lib/api/domains/contacts";
import { getGroupDetail } from "@/lib/api/domains/groups";
import { getInteractionDetail } from "@/lib/api/domains/interactions";
import { getTagDetail } from "@/lib/api/domains/tags";
import { inlineTokenLabel, type TokenLookup } from "@/lib/chat/inlineTokenLabel";
import { dateSpeechText } from "@/lib/i18n/dateSpeechText";
import { useChatPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter } from "@/lib/i18n/useDateFormatter";
import { contactKeys, groupKeys, interactionKeys, tagKeys } from "@/lib/query/keys";
import { type TokenSpeaker, toSpeechText } from "@/lib/speech/speechText";

/** A text part of a chat message. Speech ignores every other part type. */
interface SpeechTextPart {
  text?: string;
  type: string;
}

export interface ChatSpeechResolver {
  /** Language tag for voice matching. Follows the user locale. */
  lang: string;
  /**
   * Waits for uncached chip records, then builds the spoken text.
   *
   * Runs on a click, never on render.
   */
  prepare: (parts: readonly SpeechTextPart[]) => Promise<{ lang: string; text: string }>;
  /** Synchronous speaker. Reads only what the cache already holds. */
  resolve: TokenSpeaker;
}

/** Distinct chip ids in one message, grouped by kind, in first-seen order. */
function collectTokenIds(parts: readonly SpeechTextPart[]): {
  contacts: string[];
  groups: string[];
  interactions: string[];
  tags: string[];
} {
  const contacts = new Set<string>();
  const groups = new Set<string>();
  const interactions = new Set<string>();
  const tags = new Set<string>();

  for (const part of parts) {
    if (part.type !== "text" || typeof part.text !== "string") {
      continue;
    }
    for (const token of parseInlineTokens(part.text)) {
      switch (token.type) {
        case "person":
          contacts.add(token.id);
          break;
        case "group":
          groups.add(token.id);
          break;
        case "interaction":
          interactions.add(token.id);
          break;
        case "tag":
          tags.add(token.id);
          break;
        default:
          break;
      }
    }
  }

  return {
    contacts: [...contacts],
    groups: [...groups],
    interactions: [...interactions],
    tags: [...tags],
  };
}

/**
 * Builds a memoised speaker that reads the same query entries the chips fill.
 *
 * The lookup is hybrid:
 *
 * 1. `getQueryData` first. A visible message has rendered its chips, so the
 *    warm path adds no network request and speech starts at once.
 * 2. `ensureQueryData` for the misses only, awaited together. The cold path
 *    adds at most one request per distinct uncached token, and the first word
 *    waits for it. The button shows its preparing state during that wait.
 * 3. Anything still missing resolves to `null` and the builder skips it.
 *
 * A stale cache speaks the old name. That is acceptable: the next query
 * refresh heals it, and the spoken name then matches the chip again.
 */
export function useChatSpeechResolver(): ChatSpeechResolver {
  const queryClient = useQueryClient();
  const t = useChatPageTranslations();
  const formatter = useDateFormatter();
  const locale = useCurrentLocale();

  const resolve = useMemo<TokenSpeaker>(() => {
    const lookup: TokenLookup = {
      getContact: (id) => queryClient.getQueryData<Contact>(contactKeys.detail(id)),
      getGroup: (id) => queryClient.getQueryData(groupKeys.detail(id)),
      getInteraction: (id) => queryClient.getQueryData(interactionKeys.detail(id)),
      getTag: (id) => queryClient.getQueryData(tagKeys.detail(id)),
    };

    return (token: InlineToken) => {
      switch (token.type) {
        case "text":
          return token.value;
        case "link":
          // Speak the label and drop the URL.
          return token.label;
        case "date":
          return dateSpeechText(new Date(token.iso), formatter);
        case "action":
          // The share card is a button. A voice has nothing to say about it.
          return null;
        case "person": {
          const name = inlineTokenLabel(token, lookup);
          return name ? t("speakTokenPerson", { name }) : null;
        }
        case "group": {
          const name = inlineTokenLabel(token, lookup);
          return name ? t("speakTokenGroup", { name }) : null;
        }
        case "tag": {
          const name = inlineTokenLabel(token, lookup);
          return name ? t("speakTokenTag", { name }) : null;
        }
        case "interaction": {
          const title = inlineTokenLabel(token, lookup);
          return title ? t("speakTokenInteraction", { title }) : null;
        }
      }
    };
  }, [formatter, queryClient, t]);

  const prepare = useMemo(
    () => async (parts: readonly SpeechTextPart[]) => {
      const ids = collectTokenIds(parts);

      const misses: Promise<unknown>[] = [];
      // Cached records stay local. Only a miss touches the network.
      for (const id of ids.contacts) {
        if (queryClient.getQueryData(contactKeys.detail(id)) !== undefined) {
          continue;
        }
        misses.push(
          queryClient.ensureQueryData({
            queryFn: () => getContactDetail(id, "small"),
            queryKey: contactKeys.detail(id),
          }),
        );
      }
      for (const id of ids.groups) {
        if (queryClient.getQueryData(groupKeys.detail(id)) !== undefined) {
          continue;
        }
        misses.push(
          queryClient.ensureQueryData({
            queryFn: () => getGroupDetail(id),
            queryKey: groupKeys.detail(id),
          }),
        );
      }
      for (const id of ids.tags) {
        if (queryClient.getQueryData(tagKeys.detail(id)) !== undefined) {
          continue;
        }
        misses.push(
          queryClient.ensureQueryData({
            queryFn: () => getTagDetail(id),
            queryKey: tagKeys.detail(id),
          }),
        );
      }
      for (const id of ids.interactions) {
        if (queryClient.getQueryData(interactionKeys.detail(id)) !== undefined) {
          continue;
        }
        misses.push(
          queryClient.ensureQueryData({
            queryFn: () => getInteractionDetail(id),
            queryKey: interactionKeys.detail(id),
          }),
        );
      }

      // A failed lookup leaves `null` behind that one token. The rest of the
      // sentence still reads, so a failed request must not stop speech.
      await Promise.all(misses.map((miss) => miss.catch(() => undefined)));

      return { lang: locale, text: toSpeechText(parts, resolve) };
    },
    [locale, queryClient, resolve],
  );

  return useMemo(() => ({ lang: locale, prepare, resolve }), [locale, prepare, resolve]);
}
