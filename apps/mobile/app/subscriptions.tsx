import { Text, View } from "react-native";
import { AppHeader } from "@/components/layout/AppHeader";
import { theme } from "@/constants/theme";

export default function SubscriptionsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Subscriptions" />
      <View style={{ padding: 24 }}>
        <Text style={{ fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 }}>Subscribe & save</Text>
        <Text style={{ marginTop: 8, color: theme.colors.textMuted, lineHeight: 22 }}>
          Manage recurring orders from product pages. Full subscription management is coming in the next update.
        </Text>
      </View>
    </View>
  );
}
