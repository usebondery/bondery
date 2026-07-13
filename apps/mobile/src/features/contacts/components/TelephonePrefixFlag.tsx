import { countryCodeToFlagEmoji } from "@bondery/helpers/locale";
import { Text, View } from "react-native";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

interface TelephonePrefixFlagProps {
  flag: string;
}

export function TelephonePrefixFlag({ flag }: TelephonePrefixFlagProps) {
  return (
    <View style={{ alignItems: "center", width: 24 }}>
      <Text style={{ fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge }}>
        {countryCodeToFlagEmoji(flag)}
      </Text>
    </View>
  );
}
