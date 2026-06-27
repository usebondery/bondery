import { Text, View } from "react-native";
import { countryCodeToFlagEmoji } from "@bondery/helpers/locale";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

interface CountryFlagProps {
  countryCode?: string | null;
}

export function CountryFlag({ countryCode }: CountryFlagProps) {
  return (
    <View style={{ width: 24, alignItems: "center" }}>
      <Text style={{ fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge }}>
        {countryCodeToFlagEmoji(countryCode ?? "")}
      </Text>
    </View>
  );
}
