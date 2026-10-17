export interface CountryCode {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
  reactMaskExpression?: string;
}

export interface TelephonePrefixOption {
  countryCode: string;
  /** Calling code for UI (e.g. `+1 268`). */
  displayPrefix: string;
  flag: string;
  /** Country name (e.g. `Czech Republic`). */
  label: string;
  reactMaskExpression: string;
  /** Canonical E.164 prefix for storage (e.g. `+1268`). */
  value: string;
}

export const DEFAULT_PHONE_REACT_MASK_EXPRESSION = "000 000 000 000";
