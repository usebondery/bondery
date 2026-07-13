import { countryCodes } from "#phone/country-codes.js";
import { DEFAULT_PHONE_REACT_MASK_EXPRESSION, type TelephonePrefixOption } from "#phone/types.js";

export const TELEPHONE_PREFIX_OPTIONS: ReadonlyArray<TelephonePrefixOption> = Array.from(
  (() => {
    const map = new Map<string, TelephonePrefixOption>();

    countryCodes.forEach((country) => {
      if (map.has(country.dialCode)) {
        return;
      }

      map.set(country.dialCode, {
        flag: country.flag,
        label: country.dialCode,
        reactMaskExpression: country.reactMaskExpression || DEFAULT_PHONE_REACT_MASK_EXPRESSION,
        value: country.dialCode,
      });
    });

    const usPrefix = map.get("+1");
    if (usPrefix) {
      usPrefix.flag = "us";
      map.delete("+1");
      return [usPrefix, ...Array.from(map.values())];
    }

    return Array.from(map.values());
  })(),
);

export function getTelephoneReactMaskExpression(prefix: string): string {
  const option = TELEPHONE_PREFIX_OPTIONS.find((prefixOption) => prefixOption.value === prefix);
  return option?.reactMaskExpression || DEFAULT_PHONE_REACT_MASK_EXPRESSION;
}
