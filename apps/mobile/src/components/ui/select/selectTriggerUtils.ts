/** Trailing affordance slot (`ActionIcon` `sm` = 32×32). */
export const SELECT_TRIGGER_TRAILING_ICON_SIZE = 18;

export const SELECT_TRIGGER_TRAILING_SLOT_SIZE_PX = 32;

export function shouldShowSelectClear(
  clearable: boolean,
  showValueStyle: boolean,
  disabled: boolean,
): boolean {
  return Boolean(clearable && showValueStyle && !disabled);
}
