"use client";

import { Table } from "@mantine/core";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

const TABLE_PART = {
  caption: Table.Caption,
  tbody: Table.Tbody,
  td: Table.Td,
  tfoot: Table.Tfoot,
  th: Table.Th,
  thead: Table.Thead,
  tr: Table.Tr,
} as const;

type TableTag = keyof typeof TABLE_PART;

const MANTINE_TABLE_PARTS = new Set<unknown>(Object.values(TABLE_PART));

/** GFM tables often emit native `thead`/`tr`/`th`/`td`; map them to Mantine parts inside `Table`. */
function mapTableChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isValidElement(child)) {
      return child;
    }

    const element = child as ReactElement<{ children?: ReactNode }>;

    if (MANTINE_TABLE_PARTS.has(element.type)) {
      return cloneElement(element, element.props, mapTableChildren(element.props.children));
    }

    if (typeof element.type === "string" && element.type in TABLE_PART) {
      const Component = TABLE_PART[element.type as TableTag];
      const { children: elementChildren, ...rest } = element.props;
      return <Component {...rest}>{mapTableChildren(elementChildren)}</Component>;
    }

    if (element.props.children) {
      return cloneElement(element, element.props, mapTableChildren(element.props.children));
    }

    return child;
  });
}

export function MdxTable({ children }: { children?: ReactNode }) {
  return (
    // `type="native"`: the default `ScrollArea` reserves a 12px `padding-bottom`
    // for a horizontal scrollbar even when the table never overflows, which made
    // every "table → paragraph" gap 32px instead of the prose rhythm's 20px.
    <Table.ScrollContainer minWidth={500} type="native">
      <Table
        highlightOnHover
        horizontalSpacing="md"
        striped
        styles={{
          th: {
            backgroundColor: "var(--mantine-primary-color-light)",
            color: "var(--mantine-primary-color-light-color)",
            fontWeight: 600,
          },
        }}
        verticalSpacing="sm"
        withColumnBorders
        withRowBorders
        withTableBorder
      >
        {mapTableChildren(children)}
      </Table>
    </Table.ScrollContainer>
  );
}
