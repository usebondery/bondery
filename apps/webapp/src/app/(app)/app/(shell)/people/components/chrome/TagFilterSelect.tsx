"use client";

import {
  parseTagIdsQueryParam,
  serializeTagIdsQueryParam,
  TAG_IDS_QUERY_PARAM,
} from "@bondery/helpers/globals/webapp-query";
import { Popover } from "@mantine/core";
import { IconTag } from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { FilterMenuButton } from "@/components/filters/FilterMenuButton";
import { FilterMenuDropdown } from "@/components/filters/FilterMenuDropdown";
import { TagsInput, type TagsInputTag } from "@/components/tags/TagsInput";
import { usePeoplePageTranslations } from "@/lib/i18n/generated/hooks";
import { routeWithQuery } from "@/lib/navigation/route/query";
import { useTagsListQuery } from "@/lib/query/hooks/useTags";

function toTagsInputTag(tag: { color?: string | null; id: string; label: string }): TagsInputTag {
  return {
    color: tag.color,
    id: tag.id,
    label: tag.label,
  };
}

/**
 * People filter menu. A tag change writes `tag_ids` and reloads the list immediately.
 * The contacts list matches any selected tag.
 */
export function TagFilterSelect() {
  const t = usePeoplePageTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: tags = [] } = useTagsListQuery();
  const [opened, setOpened] = useState(false);

  const selectedIds = parseTagIdsQueryParam(searchParams.getAll(TAG_IDS_QUERY_PARAM));
  const selectedIdSet = new Set(selectedIds);
  const workspaceTags = tags.map(toTagsInputTag);
  const tagsById = new Map(workspaceTags.map((tag) => [tag.id, tag]));
  const selectedTags = selectedIds.flatMap((id) => {
    const tag = tagsById.get(id);
    return tag ? [tag] : [];
  });

  const replaceTagIds = (nextTagIds: string[]) => {
    const params = new URLSearchParams(searchParams);
    const value = serializeTagIdsQueryParam(nextTagIds);
    if (value) {
      params.set(TAG_IDS_QUERY_PARAM, value);
    } else {
      params.delete(TAG_IDS_QUERY_PARAM);
    }
    router.replace(routeWithQuery(pathname, params));
  };

  return (
    <Popover onChange={setOpened} position="bottom-end">
      <Popover.Target>
        <FilterMenuButton isActive={selectedIds.length > 0} opened={opened}>
          {t("Filter")}
        </FilterMenuButton>
      </Popover.Target>
      <FilterMenuDropdown
        onReset={() => replaceTagIds([])}
        resetDisabled={selectedIds.length === 0}
        resetLabel={t("ResetFilters")}
      >
        <TagsInput
          label={t("TagFilterLabel")}
          leftSection={<IconTag size={16} />}
          nothingFoundMessage={t("TagFilterNoResults")}
          onRemove={(tagId) => {
            replaceTagIds(selectedIds.filter((id) => id !== tagId));
          }}
          onSelect={(tag) => {
            if (selectedIdSet.has(tag.id)) {
              return false;
            }
            replaceTagIds([...selectedIds, tag.id]);
          }}
          placeholder={t("TagFilterPlaceholder")}
          selected={selectedTags}
          tags={workspaceTags}
          w={260}
          withinPortal={false}
        />
      </FilterMenuDropdown>
    </Popover>
  );
}
