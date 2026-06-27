import { Text, View } from "react-native";
import { countryCodeToFlagEmoji } from "@bondery/helpers/locale";
import { MOBILE_TYPOGRAPHY } from "../../../theme/tokens";

interface TelephonePrefixFlagProps {
  flag: string;
}

export function TelephonePrefixFlag({ flag }: TelephonePrefixFlagProps) {
  return (
    <View style={{ width: 24, alignItems: "center" }}>
      <Text style={{ fontSize: MOBILE_TYPOGRAPHY.fontSize.bodyLarge }}>
        {countryCodeToFlagEmoji(flag)}
      </Text>
    </View>
  );
}
