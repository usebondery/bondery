import type { BaseType, Selection } from "d3";

/**
 * Visits every element of a d3 selection together with its bound datum.
 *
 * d3 normally hands the element to `selection.each` through `this`. This helper
 * reads it from the callback's `elements` argument instead, so call sites can use
 * arrow functions and a named parameter.
 */
export function eachSelected<Element extends BaseType, Datum>(
  // biome-ignore lint/suspicious/noExplicitAny: callers pass selections with arbitrary parent and group types
  selection: Selection<Element, Datum, any, any>,
  visit: (element: Element, datum: Datum) => void,
): void {
  selection.each((datum, index, elements) => {
    const element = elements[index];
    if (element) {
      visit(element, datum);
    }
  });
}
