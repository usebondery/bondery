"use client";

import type { SimpleGridProps } from "@mantine/core";
import { SimpleGrid } from "@mantine/core";
import type { ReactElement, ReactNode } from "react";

export interface TileCardGridProps extends Omit<SimpleGridProps, "children"> {
  children: ReactNode;
  /**
   * Narrowest a card may get before the grid drops to fewer columns.
   *
   * The `action` variant holds a logo, a title, a status pill, and a button on one line, so it
   * needs room to keep the title whole. A narrower card would truncate the title, which is the
   * wrong thing to lose.
   */
  minCardWidth?: string;
}

/**
 * Grid for `TileCard`. Columns fit as many cards as the container allows at `minCardWidth`, so a
 * phone shows one and a wide page shows several. Cards stretch to the tallest in the row.
 *
 * A card's width follows the column count, not a maximum: with `auto-fill` and `1fr` each card
 * takes an equal share of the row. Raise `minCardWidth` to get fewer, wider cards.
 */
export function TileCardGrid({
  children,
  minCardWidth = "16rem",
  ...gridProps
}: TileCardGridProps): ReactElement {
  return (
    <SimpleGrid
      minColWidth={minCardWidth}
      spacing="sm"
      type="container"
      verticalSpacing="sm"
      {...gridProps}
    >
      {children}
    </SimpleGrid>
  );
}
