"use client";

import { formatContactName } from "@bondery/helpers/contact";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { ActionIconButton, ButtonLink } from "@bondery/mantine-next";
import type { RelationshipGraphEdge, RelationshipGraphNode } from "@bondery/schemas";
import {
  ActionIcon,
  Box,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  useMantineTheme,
} from "@mantine/core";
import { useDebouncedCallback, useMediaQuery } from "@mantine/hooks";
import {
  IconAffiliate,
  IconCurrentLocation,
  IconMinus,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/shell/PageHeader";
import { PageWrapper } from "@/components/shell/PageWrapper";
import { QueryLoadError } from "@/components/shell/QueryLoadError";
import { useGraphPageTranslations } from "@/lib/i18n/generated/hooks";
import { routeAssert } from "@/lib/navigation/route/assert";
import { routePerson } from "@/lib/navigation/route/person";
import { DEBOUNCE_MS } from "@/lib/platform/config";
import { useRelationshipGraphQuery } from "@/lib/query/hooks/useContacts";
import {
  type CollapsedRelationshipEdge,
  collapseRelationshipEdges,
  relationshipPairKey,
} from "./collapseRelationshipEdges";
import { GraphSelectionPanel } from "./GraphSelectionPanel";
import { GraphPageSkeleton } from "./loading";
import type { RelationshipGraphControls } from "./RelationshipGraph";
import { RelationshipSentence } from "./RelationshipSentence";

const RelationshipGraph = dynamic(
  () => import("./RelationshipGraph").then((mod) => mod.RelationshipGraph),
  { ssr: false },
);

interface GraphClientProps {
  focus: string | null;
}

function uniqueEdges(edges: readonly RelationshipGraphEdge[]): RelationshipGraphEdge[] {
  const seen = new Set<string>();
  const unique: RelationshipGraphEdge[] = [];
  for (const edge of edges) {
    const key = `${edge.sourcePersonId}\0${edge.targetPersonId}\0${edge.relationshipType}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(edge);
  }
  return unique;
}

function neighborIds(nodeId: string, edges: readonly CollapsedRelationshipEdge[]): string[] {
  const ids: string[] = [];
  for (const edge of edges) {
    let other: string | null = null;
    if (edge.sourcePersonId === nodeId) {
      other = edge.targetPersonId;
    } else if (edge.targetPersonId === nodeId) {
      other = edge.sourcePersonId;
    }
    if (other && !ids.includes(other)) {
      ids.push(other);
    }
  }
  return ids;
}

const GRAPH_CARD_RADIUS_PX = 12;
const GRAPH_CHROME_Z_INDEX = 5;

function GraphSearchField(props: {
  label: string;
  loading: boolean;
  onValue: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <TextInput
      aria-label={props.label}
      leftSection={<IconSearch size={16} />}
      loading={props.loading}
      onChange={(event) => props.onValue(event.currentTarget.value)}
      placeholder={props.placeholder}
      value={props.value}
    />
  );
}

function stepIndex(index: number, delta: number, length: number): number {
  if (length === 0) {
    return -1;
  }
  if (index < 0) {
    return delta > 0 ? 0 : length - 1;
  }
  const next = index + delta;
  if (next < 0) {
    return length - 1;
  }
  if (next >= length) {
    return 0;
  }
  return next;
}

export function GraphClient({ focus }: GraphClientProps) {
  const t = useGraphPageTranslations();
  const router = useRouter();
  const theme = useMantineTheme();
  const showCanvas =
    useMediaQuery(`(min-width: ${theme.breakpoints.sm})`, false, {
      getInitialValueInEffect: true,
    }) ?? false;
  const query = useRelationshipGraphQuery(focus);
  const controlsRef = useRef<RelationshipGraphControls | null>(null);
  const neighborCursor = useRef(-1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>(null);
  const [graphCard, setGraphCard] = useState<HTMLDivElement | null>(null);

  const applySearch = useDebouncedCallback((value: string) => {
    setSearchQuery(value);
    setSearchLoading(false);
  }, DEBOUNCE_MS.localFilter);

  const handleSearch = (value: string) => {
    setSearchInput(value);
    setSearchLoading(true);
    applySearch(value);
  };

  const graph = query.data;
  const visibleEdges = graph?.edges ?? [];
  const collapsed = useMemo(() => collapseRelationshipEdges(visibleEdges), [visibleEdges]);
  const visibleNodes = graph?.nodes ?? [];
  const nodesById = useMemo(() => {
    const map = new Map<string, RelationshipGraphNode>();
    for (const node of graph?.nodes ?? []) {
      map.set(node.id, node);
    }
    return map;
  }, [graph?.nodes]);
  const selectedNode = visibleNodes.find((node) => node.id === selectedNodeId) ?? null;
  const selectedHub = graph?.hubs.find((hub) => hub.id === selectedHubId) ?? null;
  const cardEdges = useMemo(() => {
    if (!selectedNode) {
      return [];
    }
    return uniqueEdges(visibleEdges).filter(
      (edge) => edge.sourcePersonId === selectedNode.id || edge.targetPersonId === selectedNode.id,
    );
  }, [selectedNode, visibleEdges]);
  const trimmedQuery = searchQuery.trim().toLocaleLowerCase();
  const mobileEdges = useMemo(() => {
    const rows = uniqueEdges(visibleEdges);
    if (!trimmedQuery) {
      return rows;
    }
    return rows.filter((edge) => {
      const source = nodesById.get(edge.sourcePersonId);
      const target = nodesById.get(edge.targetPersonId);
      const sourceName = source ? formatContactName(source).toLocaleLowerCase() : "";
      const targetName = target ? formatContactName(target).toLocaleLowerCase() : "";
      return sourceName.includes(trimmedQuery) || targetName.includes(trimmedQuery);
    });
  }, [nodesById, trimmedQuery, visibleEdges]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const inField =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      if (event.key === "Escape") {
        if (inField) {
          setSearchInput("");
          setSearchQuery("");
          applySearch.cancel();
          return;
        }
        if (selectedNodeId || selectedEdgeKey || selectedHubId) {
          setSelectedNodeId(null);
          setSelectedEdgeKey(null);
          setSelectedHubId(null);
          neighborCursor.current = -1;
          return;
        }
        setSearchInput("");
        setSearchQuery("");
        applySearch.cancel();
        return;
      }
      if (inField || (target instanceof HTMLElement && target.closest("a, button"))) {
        return;
      }
      if (event.key === "Enter" && selectedNode) {
        event.preventDefault();
        router.push(routePerson(selectedNode.id));
        return;
      }
      if (!selectedNode) {
        return;
      }
      if (
        event.key !== "ArrowRight" &&
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowDown" &&
        event.key !== "ArrowUp"
      ) {
        return;
      }
      const neighbors = neighborIds(selectedNode.id, collapsed);
      if (neighbors.length === 0) {
        return;
      }
      event.preventDefault();
      const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = stepIndex(neighborCursor.current, delta, neighbors.length);
      neighborCursor.current = nextIndex;
      const nextId = neighbors[nextIndex];
      if (nextId) {
        setSelectedNodeId(nextId);
        setSelectedEdgeKey(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    applySearch,
    collapsed,
    router,
    selectedEdgeKey,
    selectedHubId,
    selectedNode,
    selectedNodeId,
  ]);

  if (query.isPending) {
    return <GraphPageSkeleton />;
  }
  if (query.isError || !graph) {
    return (
      <PageWrapper>
        <QueryLoadError onRetry={() => void query.refetch()} />
      </PageWrapper>
    );
  }

  const noPeople = graph.nodes.length === 0 && graph.unlinkedCount === 0;
  const noLinks = graph.nodes.length === 0 && graph.unlinkedCount > 0;

  return (
    <PageWrapper fill={showCanvas}>
      <Stack gap="xl" mih={showCanvas ? 0 : undefined} style={showCanvas ? { flex: 1 } : undefined}>
        <PageHeader
          action={
            focus ? (
              <ButtonLink href={routeAssert(WEBAPP_ROUTES.GRAPH)} variant="default">
                {t("ClearFocus")}
              </ButtonLink>
            ) : null
          }
          helpDoc="concepts.graph"
          helpLabel={t("HelpLabel")}
          icon={IconAffiliate}
          title={t("Title")}
        />
        {noPeople || noLinks ? (
          <Stack align="center" gap="sm" py="xl">
            <Title order={3}>{noPeople ? t("EmptyNoPeopleTitle") : t("EmptyNoLinksTitle")}</Title>
            <Text c="dimmed" maw={460} ta="center">
              {noPeople ? t("EmptyNoPeopleBody") : t("EmptyNoLinksBody")}
            </Text>
            <ButtonLink href={routeAssert(WEBAPP_ROUTES.PEOPLE)}>{t("GoToPeople")}</ButtonLink>
          </Stack>
        ) : !showCanvas ? (
          <Stack gap="xs">
            <GraphSearchField
              label={t("SearchLabel")}
              loading={searchLoading}
              onValue={handleSearch}
              placeholder={t("SearchPlaceholder")}
              value={searchInput}
            />
            {mobileEdges.map((edge) => (
              <RelationshipSentence
                edge={edge}
                emphasized={
                  relationshipPairKey(edge.sourcePersonId, edge.targetPersonId) === selectedEdgeKey
                }
                key={`${edge.id}:${edge.relationshipType}`}
                linkNames
                nodesById={nodesById}
              />
            ))}
          </Stack>
        ) : (
          <Group align="stretch" gap="md" style={{ flex: 1, minHeight: 0 }} wrap="nowrap">
            <Box pos="relative" style={{ flex: 1, minHeight: 240 }}>
              <Paper
                h="100%"
                pos="relative"
                radius={GRAPH_CARD_RADIUS_PX}
                ref={setGraphCard}
                shadow="sm"
                style={{ overflow: "hidden" }}
                withBorder
              >
                {visibleNodes.length > 0 ? (
                  <RelationshipGraph
                    ariaLabel={t("CanvasLabel")}
                    clipRoot={graphCard}
                    controlsRef={controlsRef}
                    edges={collapsed}
                    groups={graph.groups}
                    hubs={graph.hubs}
                    nodes={visibleNodes}
                    onClearSelection={() => {
                      setSelectedNodeId(null);
                      setSelectedEdgeKey(null);
                      setSelectedHubId(null);
                      neighborCursor.current = -1;
                    }}
                    onHover={() => undefined}
                    onOpenPerson={(personId: string) => router.push(routePerson(personId))}
                    onSelectEdge={(edgeKey: string, personId: string) => {
                      setSelectedEdgeKey(edgeKey);
                      setSelectedNodeId(personId);
                      setSelectedHubId(null);
                      neighborCursor.current = -1;
                    }}
                    onSelectHub={(hubId: string) => {
                      setSelectedHubId(hubId);
                      setSelectedNodeId(null);
                      setSelectedEdgeKey(null);
                      neighborCursor.current = -1;
                    }}
                    onSelectNode={(personId: string) => {
                      setSelectedNodeId(personId);
                      setSelectedEdgeKey(null);
                      setSelectedHubId(null);
                      neighborCursor.current = -1;
                    }}
                    searchQuery={searchQuery}
                    selectedEdgeKey={selectedEdgeKey}
                    selectedHubId={selectedHub?.id ?? null}
                    selectedNodeId={selectedNode?.id ?? null}
                  />
                ) : null}
              </Paper>
              <ActionIcon.Group
                aria-label={t("CanvasLabel")}
                orientation="vertical"
                style={{
                  left: 12,
                  position: "absolute",
                  top: 12,
                  zIndex: GRAPH_CHROME_Z_INDEX,
                }}
              >
                <Tooltip label={t("ZoomReset")}>
                  <ActionIcon
                    aria-label={t("ZoomReset")}
                    onClick={() => controlsRef.current?.resetZoom()}
                    size="lg"
                    variant="default"
                  >
                    <Text size="xs">1×</Text>
                  </ActionIcon>
                </Tooltip>
                <ActionIconButton
                  aria-label={t("ZoomIn")}
                  icon={<IconPlus />}
                  onClick={() => controlsRef.current?.zoomIn()}
                  size="lg"
                  variant="default"
                />
                <ActionIconButton
                  aria-label={t("ZoomOut")}
                  icon={<IconMinus />}
                  onClick={() => controlsRef.current?.zoomOut()}
                  size="lg"
                  variant="default"
                />
                {visibleNodes.some((node) => node.myself) ? (
                  <Tooltip label={t("CenterMyself")}>
                    <ActionIcon
                      aria-label={t("CenterMyself")}
                      onClick={() => controlsRef.current?.centerMyself()}
                      size="lg"
                      variant="default"
                    >
                      <IconCurrentLocation size={20} stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>
                ) : null}
              </ActionIcon.Group>
              <Paper
                p="xs"
                pos="absolute"
                radius="md"
                right={12}
                shadow="sm"
                style={{ width: "min(320px, calc(100% - 96px))", zIndex: GRAPH_CHROME_Z_INDEX }}
                top={12}
              >
                <GraphSearchField
                  label={t("SearchLabel")}
                  loading={searchLoading}
                  onValue={handleSearch}
                  placeholder={t("SearchPlaceholder")}
                  value={searchInput}
                />
              </Paper>
            </Box>
            {selectedHub ? (
              <GraphSelectionPanel
                hub={selectedHub}
                membersLabel={t("HubMembersLabel")}
                nodesById={nodesById}
              />
            ) : null}
            {selectedNode ? (
              <GraphSelectionPanel
                cardEdges={cardEdges}
                nodesById={nodesById}
                openPersonLabel={t("OpenPerson")}
                person={selectedNode}
                selectedEdgeKey={selectedEdgeKey}
              />
            ) : null}
          </Group>
        )}
      </Stack>
    </PageWrapper>
  );
}
