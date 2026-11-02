"use client";

import {
  errorNotificationTemplate,
  Kbd,
  loadingNotificationTemplate,
  ModalTitle,
  parseShortcutKeys,
  successNotificationTemplate,
} from "@bondery/mantine-next";
import type { Activity, InteractionParticipant, PersonPreview } from "@bondery/schemas";
import {
  Button,
  Center,
  Group,
  Loader,
  Popover,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useDebouncedCallback, useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCalendarPlus,
  IconCopy,
  IconSearch,
  IconTimelineEventText,
  IconTrash,
} from "@tabler/icons-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { FilterMenuButton } from "@/components/filters/FilterMenuButton";
import { FilterMenuDropdown } from "@/components/filters/FilterMenuDropdown";
import { DatePickerWithPresets } from "@/components/interactions/DatePickerWithPresets";
import { InteractionsList } from "@/components/interactions/InteractionsList";
import { openStandardConfirmModal } from "@/components/modals/openStandardConfirmModal";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { peopleSearchActions } from "@/components/shell/PeopleSearchSpotlight";
import { ShellScrollLoadMore } from "@/components/shell/ShellScrollLoadMore";
import { useCommonTranslations, useInteractionsPageTranslations } from "@/lib/i18n/generated/hooks";
import { calendarParamFromPicker } from "@/lib/interactions/interactionListRange";
import { routeWithQuery } from "@/lib/navigation/route/query";
import { DEBOUNCE_MS, HOTKEYS } from "@/lib/platform/config";
import { useContactsSelectableListQuery } from "@/lib/query/hooks/useContacts";
import {
  useCreateInteractionMutation,
  useDeleteInteractionMutation,
  useInteractionsInfiniteQuery,
} from "@/lib/query/hooks/useInteractions";
import {
  parseInteractionsListParams,
  sameInteractionsTimelineFilter,
  timelineFilterFromParsed,
} from "@/lib/query/interactionsListParams";
import { SELECTABLE_CONTACTS } from "@/lib/query/sharedListParams";
import { openNewActivityModal } from "./components/NewActivityModal";

type ActivityParticipantRef = string | InteractionParticipant;

function InteractionsSearchInput({
  initialValue,
  loading,
  onChange,
  placeholder,
}: {
  initialValue: string;
  loading: boolean;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <TextInput
      aria-label={placeholder}
      leftSection={<IconSearch size={16} />}
      loading={loading}
      onChange={(event) => {
        const next = event.currentTarget.value;
        setValue(next);
        onChange(next);
      }}
      placeholder={placeholder}
      style={{ flex: 1 }}
      value={value}
    />
  );
}

export function InteractionsClient() {
  const t = useInteractionsPageTranslations();
  const tCommon = useCommonTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const parsed = parseInteractionsListParams({
    end_date: searchParams.get("end_date"),
    search: searchParams.get("search"),
    start_date: searchParams.get("start_date"),
  });
  const requestedFilter = timelineFilterFromParsed(parsed);
  const [listFilter, setListFilter] = useState(requestedFilter);
  if (!parsed.invalidRange && !sameInteractionsTimelineFilter(listFilter, requestedFilter)) {
    setListFilter(requestedFilter);
  }
  const urlSearch = parsed.search ?? "";
  const [isSearchPending, startSearchTransition] = useTransition();
  const [dateFilterOpened, setDateFilterOpened] = useState(false);
  const { data: contactsData } = useContactsSelectableListQuery(SELECTABLE_CONTACTS);
  const {
    data: interactionsData,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    isFetchNextPageError,
    refetch,
  } = useInteractionsInfiniteQuery(listFilter);
  const contactsHasMore = contactsData?.pagination.hasMore ?? false;
  const contacts = contactsData?.contacts ?? [];
  const activities = interactionsData?.pages.flatMap((page) => page.activities) ?? [];
  const hasMore = hasNextPage ?? false;
  const deleteInteractionMutation = useDeleteInteractionMutation();
  const createInteractionMutation = useCreateInteractionMutation();

  useHotkeys([
    [HOTKEYS.LOG_INTERACTION, () => openNewActivityModal({ contacts, contactsHasMore })],
    [HOTKEYS.FIND_PERSON, () => peopleSearchActions.open()],
  ]);

  const contactsById = new Map(contacts.map((contact) => [contact.id, contact]));

  const resolveParticipants = (activity: Activity): PersonPreview[] => {
    return (activity.participants || []).flatMap((participant: ActivityParticipantRef) => {
      const participantId = typeof participant === "string" ? participant : participant.id;
      const knownContact = contactsById.get(participantId);

      if (knownContact) {
        return [knownContact];
      }

      if (!participantId || typeof participant === "string") {
        return [];
      }

      return [
        {
          avatar: participant.avatar || null,
          firstName: participant.firstName || t("UnknownPerson"),
          headline: participant.headline,
          id: participantId,
          lastName: participant.lastName || null,
          location: participant.location,
          middleName: participant.middleName,
        },
      ];
    });
  };

  const handleActivityClick = (activity: Activity) => {
    openNewActivityModal({
      activity,
      contacts,
      contactsHasMore,
    });
  };

  const handleDelete = (activity: Activity) => {
    openStandardConfirmModal({
      cancelLabel: t("Cancel"),
      confirmColor: "red",
      confirmLabel: t("DeleteAction"),
      message: <Text size="sm">{t("DeleteConfirmMessage")}</Text>,
      onConfirm: async () => {
        try {
          await deleteInteractionMutation.mutateAsync(activity.id);

          notifications.show(
            successNotificationTemplate({
              description: t("ActivityDeleted"),
              title: t("SuccessTitle"),
            }),
          );
        } catch {
          notifications.show(
            errorNotificationTemplate({
              description: t("DeleteFailed"),
              title: t("ErrorTitle"),
            }),
          );
        }
      },
      title: (
        <ModalTitle
          icon={<IconTrash size={20} />}
          isDangerous={true}
          text={t("DeleteConfirmTitle")}
        />
      ),
    });
  };

  const handleDuplicate = async (activity: Activity) => {
    const participantIds = (activity.participants || [])
      .map((participant: ActivityParticipantRef) =>
        typeof participant === "string" ? participant : participant.id,
      )
      .filter((id): id is string => Boolean(id));

    const loadingNotificationId = notifications.show({
      ...loadingNotificationTemplate({
        description: t("DuplicateInteraction.LoadingDescription"),
        title: tCommon("feedback.duplicating"),
      }),
    });

    try {
      await createInteractionMutation.mutateAsync({
        date: activity.date,
        description: activity.description || "",
        participantIds,
        title: activity.title || "",
        type: activity.type,
      });

      notifications.update({
        ...successNotificationTemplate({
          description: t("ActivityDuplicated"),
          icon: <IconCopy size={18} />,
          title: t("SuccessTitle"),
        }),
        id: loadingNotificationId,
      });
    } catch {
      notifications.update({
        ...errorNotificationTemplate({
          description: t("DuplicateFailed"),
          title: t("ErrorTitle"),
        }),
        id: loadingNotificationId,
      });
    }
  };

  const sortedInteractionsActivities = [...activities].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const replaceParams = (mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    mutate(params);
    router.replace(routeWithQuery(pathname, params));
  };
  const commitSearch = useDebouncedCallback((value: string) => {
    const trimmed = value.trim();
    startSearchTransition(() => {
      replaceParams((params) => {
        if (trimmed) {
          params.set("search", trimmed);
        } else {
          params.delete("search");
        }
      });
    });
  }, DEBOUNCE_MS.search);
  const writeDate = (key: "end_date" | "start_date", value: string | undefined) => {
    replaceParams((params) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
  };
  const urlStart = parsed.start_date ?? null;
  const urlEnd = parsed.end_date ?? null;
  const [startDate, setStartDate] = useState(urlStart);
  const [endDate, setEndDate] = useState(urlEnd);
  const [seenUrlStart, setSeenUrlStart] = useState(urlStart);
  const [seenUrlEnd, setSeenUrlEnd] = useState(urlEnd);
  if (seenUrlStart !== urlStart) {
    setSeenUrlStart(urlStart);
    setStartDate(urlStart);
  }
  if (seenUrlEnd !== urlEnd) {
    setSeenUrlEnd(urlEnd);
    setEndDate(urlEnd);
  }
  const dateFilterActive = Boolean(startDate || endDate);
  const resetDateFilter = () => {
    setStartDate(null);
    setEndDate(null);
    replaceParams((params) => {
      params.delete("start_date");
      params.delete("end_date");
    });
  };
  const filteredEmpty =
    activities.length === 0 &&
    Boolean(listFilter.search || listFilter.start_date || listFilter.end_date);

  return (
    <PageWrapper>
      <Stack gap="lg">
        <PageHeader
          helpDoc="concepts.interactions"
          helpLabel={t("HeaderDescription")}
          icon={IconTimelineEventText}
          primaryAction={
            <Tooltip
              label={
                <Group gap="xs" wrap="nowrap">
                  <Text inherit size="xs">
                    {t("AddActivity")}
                  </Text>
                  <Kbd keys={parseShortcutKeys(HOTKEYS.LOG_INTERACTION)} size="xs" />
                </Group>
              }
            >
              <Button
                leftSection={<IconCalendarPlus size={16} />}
                onClick={() => {
                  openNewActivityModal({
                    contacts,
                    contactsHasMore,
                  });
                }}
                size="md"
              >
                {t("AddActivity")}
              </Button>
            </Tooltip>
          }
          title={t("PageTitle")}
        />

        <Stack className="mx-auto w-full max-w-2xl" gap="md">
          <Group gap="sm" wrap="nowrap">
            <InteractionsSearchInput
              initialValue={urlSearch}
              loading={isSearchPending || (isFetching && !isFetchingNextPage)}
              onChange={commitSearch}
              placeholder={t("SearchPlaceholder")}
            />
            <Popover onChange={setDateFilterOpened} position="bottom-end">
              <Popover.Target>
                <FilterMenuButton isActive={dateFilterActive} opened={dateFilterOpened}>
                  {t("DateFilter")}
                </FilterMenuButton>
              </Popover.Target>
              <FilterMenuDropdown
                onReset={resetDateFilter}
                resetDisabled={!dateFilterActive}
                resetLabel={t("ResetFilters")}
              >
                <Group align="flex-start" gap="sm" wrap="nowrap">
                  <DatePickerWithPresets
                    clearable
                    label={t("StartDateLabel")}
                    maxDate={endDate ?? undefined}
                    onChange={(value) => {
                      const next = calendarParamFromPicker(value) ?? null;
                      setStartDate(next);
                      writeDate("start_date", next ?? undefined);
                    }}
                    placeholder={t("PickDate")}
                    popoverProps={{ withinPortal: false }}
                    value={startDate}
                    valueFormat="YYYY-MM-DD"
                    w={180}
                  />
                  <DatePickerWithPresets
                    clearable
                    label={t("EndDateLabel")}
                    minDate={startDate ?? undefined}
                    onChange={(value) => {
                      const next = calendarParamFromPicker(value) ?? null;
                      setEndDate(next);
                      writeDate("end_date", next ?? undefined);
                    }}
                    placeholder={t("PickDate")}
                    popoverProps={{ withinPortal: false }}
                    value={endDate}
                    valueFormat="YYYY-MM-DD"
                    w={180}
                  />
                </Group>
                {parsed.invalidRange ? (
                  <Text c="red" size="sm">
                    {t("InvalidDateRange")}
                  </Text>
                ) : null}
              </FilterMenuDropdown>
            </Popover>
          </Group>
          {!interactionsData ? (
            isError ? (
              <ShellScrollLoadMore
                errorLabel={t("LoadMoreError")}
                fallbackLabel={t("LoadMoreBatch")}
                hasMore
                isFetchingNextPage={false}
                isFetchNextPageError
                onLoadMore={() => {
                  void refetch();
                }}
                retryLabel={t("LoadMoreRetry")}
              />
            ) : (
              <Center>
                <Loader />
              </Center>
            )
          ) : (
            <>
              {filteredEmpty ? (
                <Text c="dimmed" size="sm" ta="center">
                  {listFilter.search
                    ? t("NoMatchingSearch", { search: listFilter.search })
                    : t("NoMatchingActivities")}
                </Text>
              ) : (
                <InteractionsList
                  actionsLabel={t("TableColumnActions")}
                  activities={sortedInteractionsActivities}
                  deleteLabel={t("DeleteAction")}
                  duplicateLabel={t("DuplicateAction")}
                  editLabel={t("EditAction")}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onEdit={handleActivityClick}
                  onOpen={handleActivityClick}
                  resolveParticipants={resolveParticipants}
                />
              )}
              <ShellScrollLoadMore
                errorLabel={t("LoadMoreError")}
                fallbackLabel={t("LoadMoreBatch")}
                hasMore={hasMore}
                isFetchingNextPage={isFetchingNextPage}
                isFetchNextPageError={isFetchNextPageError}
                onLoadMore={() => {
                  void fetchNextPage();
                }}
                retryLabel={t("LoadMoreRetry")}
              />
            </>
          )}
        </Stack>
      </Stack>
    </PageWrapper>
  );
}
