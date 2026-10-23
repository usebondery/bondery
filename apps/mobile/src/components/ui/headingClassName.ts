export type HeadingOrder = 1 | 2 | 3 | 4 | 5 | 6;

const HEADING_CLASS_NAME: Record<HeadingOrder, string> = {
  1: "text-[28px] font-bold",
  2: "text-[22px] font-bold",
  3: "text-[18px] font-bold",
  4: "text-[16px] font-bold",
  5: "text-[15px] font-semibold",
  6: "text-[13px] font-semibold",
};

/** Uniwind type classes for `Heading` order. Size and weight only. Color is `c="default"`. */
export function headingClassName(order: HeadingOrder): string {
  return HEADING_CLASS_NAME[order];
}
