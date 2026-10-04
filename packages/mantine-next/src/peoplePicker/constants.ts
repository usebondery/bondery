/** First fetch and each autoload page for people Combobox pickers. */
export const PEOPLE_PICKER_PAGE_SIZE = 10;

/** Visible option rows in the picker dropdown viewport. */
export const PEOPLE_PICKER_VIEWPORT_ROWS = 5;

/**
 * Max height for `ScrollArea.Autosize` (~5.3 × `PersonSearchOptionRow`) so row 6 peeks.
 * Two-line rows (name + headline/location) are about 54px including option padding.
 */
export const PEOPLE_PICKER_DROPDOWN_MAX_HEIGHT = 286;

/**
 * Fixed width for PersonChip and notes `@` mention people dropdowns so names
 * are not clipped to the chip/caret width.
 */
export const PEOPLE_PICKER_DROPDOWN_WIDTH = 280;
