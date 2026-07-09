import { countryCodeToFlagEmoji } from "@bondery/helpers/locale";
import { Text, View } from "react-native";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

interface CountryFlagProps {
  countryCode?: string | null;
}

export function CountryFlag({ countryCode }: CountryFlagProps) {
  return (
    <View style={{ alignItems: "center", width: 24 }}>
      <Text style={{ fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge }}>
        {countryCodeToFlagEmoji(countryCode ?? "")}
      </Text>
    </View>
  );
}
