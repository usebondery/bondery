export interface CountryCode {
  code: string;
  dialCode: string;
  flag: string;
  name: string;
  reactMaskExpression?: string;
}

export interface TelephonePrefixOption {
  flag: string;
  label: string;
  reactMaskExpression: string;
  value: string;
}

export const DEFAULT_PHONE_REACT_MASK_EXPRESSION = "000 000 000 000";
