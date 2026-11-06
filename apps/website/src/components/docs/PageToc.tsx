"use client";

import { Stack, Text } from "@mantine/core";
import { useScrollSpy } from "@mantine/hooks";
import { useLayoutEffect, useRef, useState } from "react";
import { DOCS_ANCHOR_OFFSET } from "@/lib/docs-layout";
import classes from "./PageToc.module.css";

const RAIL_STYLE = {
  position: "sticky",
  top: "calc(var(--site-header-sticky-bottom) + var(--mantine-spacing-sm))",
} as const;

export interface DocsTocItem {
  depth: number;
  id: string;
  title: string;
}

interface PageTocProps {
  items?: DocsTocItem[];
  selector?: string;
  variant: "inline" | "rail";
}

interface TocHeading {
  depth: number;
  getNode?: () => HTMLElement;
  id: string;
  value: string;
}

export function PageToc({ items, selector = "h2[id], h3[id], h4[id]", variant }: PageTocProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ height: number; top: number } | null>(null);
  const spy = useScrollSpy({
    offset: DOCS_ANCHOR_OFFSET,
    selector,
  });
  const headings: TocHeading[] = spy.initialized
    ? spy.data
    : (items ?? []).map((item) => ({
        depth: item.depth,
        id: item.id,
        value: item.title,
      }));
  const headingKey = headings.map((heading) => heading.id).join("|");

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !headingKey) {
      return;
    }

    const place = () => {
      const links = list.querySelectorAll<HTMLElement>("a");
      const activeLink = spy.active >= 0 ? links[spy.active] : undefined;
      const linkRect = activeLink?.getBoundingClientRect();
      if (!activeLink || !linkRect || linkRect.height < 1) {
        setIndicator(null);
        return;
      }
      const listRect = list.getBoundingClientRect();
      const next = {
        height: linkRect.height,
        top: linkRect.top - listRect.top,
      };
      setIndicator((current) =>
        current !== null &&
        Math.abs(current.top - next.top) < 0.5 &&
        Math.abs(current.height - next.height) < 0.5
          ? current
          : next,
      );
    };

    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [headingKey, spy.active]);

  if ((items && items.length < 2) || headings.length === 0) {
    return null;
  }

  return (
    <Stack
      aria-label="On this page"
      component="nav"
      gap="xs"
      style={variant === "rail" ? RAIL_STYLE : undefined}
    >
      <Text fw={600} size="xs">
        On this page
      </Text>
      <div className={classes.list} ref={listRef}>
        {indicator !== null ? (
          <span
            aria-hidden
            className={classes.indicator}
            style={{
              height: indicator.height,
              transform: `translateY(${indicator.top}px)`,
            }}
          />
        ) : null}
        {headings.map((heading, index) => {
          const active = index === spy.active;
          const className = active ? `${classes.link} ${classes.linkActive}` : classes.link;
          return (
            <a
              className={className}
              data-active={active ? "true" : undefined}
              href={`#${heading.id}`}
              key={heading.id}
              onClick={(event) => {
                event.preventDefault();
                const node = heading.getNode?.() ?? document.getElementById(heading.id);
                node?.scrollIntoView({ behavior: "smooth", block: "start" });
                window.history.replaceState(null, "", `#${heading.id}`);
              }}
              style={{
                paddingInlineStart: `calc(10px + ${Math.max(heading.depth - 2, 0)} * 0.85rem)`,
              }}
            >
              {heading.value}
            </a>
          );
        })}
      </div>
    </Stack>
  );
}
