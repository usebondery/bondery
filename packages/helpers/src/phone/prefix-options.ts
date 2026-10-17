import { countryCodes } from "#phone/country-codes.js";
import { canonicalizeDialCode, formatDialCodeForDisplay } from "#phone/phone-normalize.js";
import { DEFAULT_PHONE_REACT_MASK_EXPRESSION, type TelephonePrefixOption } from "#phone/types.js";

/** Lexicographic order on dial digits (`+420` before `+43`). */
export function compareTelephonePrefixByDialDigits(a: string, b: string): number {
  const dialDigits = (value: string) => value.replace(/\D/g, "");
  return dialDigits(a).localeCompare(dialDigits(b));
}

export const TELEPHONE_PREFIX_OPTIONS: ReadonlyArray<TelephonePrefixOption> = Array.from(
  (() => {
    const map = new Map<string, TelephonePrefixOption>();

    countryCodes.forEach((country) => {
      const value = canonicalizeDialCode(country.dialCode);
      if (!value || map.has(value)) {
        return;
      }

      map.set(value, {
        countryCode: country.code,
        displayPrefix: formatDialCodeForDisplay(country.dialCode),
        flag: country.flag,
        label: country.name,
        reactMaskExpression: country.reactMaskExpression || DEFAULT_PHONE_REACT_MASK_EXPRESSION,
        value,
      });
    });

    const sorted = Array.from(map.values()).sort((a, b) =>
      compareTelephonePrefixByDialDigits(a.value, b.value),
    );

    const usPrefix = map.get("+1");
    if (usPrefix) {
      usPrefix.flag = "us";
      return [usPrefix, ...sorted.filter((option) => option.value !== "+1")];
    }

    return sorted;
  })(),
);

export function findTelephonePrefixOption(prefix: string): TelephonePrefixOption | undefined {
  const value = canonicalizeDialCode(prefix);
  if (!value) {
    return undefined;
  }

  return TELEPHONE_PREFIX_OPTIONS.find((option) => option.value === value);
}

export function getTelephonePrefixSearchTexts(option: TelephonePrefixOption): string[] {
  return [
    option.label,
    option.displayPrefix,
    option.value,
    option.countryCode,
    option.value.replace(/\D/g, ""),
  ];
}

export function getTelephoneReactMaskExpression(prefix: string): string {
  const option = findTelephonePrefixOption(prefix);
  return option?.reactMaskExpression || DEFAULT_PHONE_REACT_MASK_EXPRESSION;
}
