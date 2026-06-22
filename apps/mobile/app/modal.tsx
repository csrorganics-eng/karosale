import { StatusBar } from "expo-status-bar";
import { Platform, StyleSheet } from "react-native";

import { Text, View } from "@/components/Themed";
import { BRAND_NAME, getApiOrigin } from "@/constants/config";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About</Text>
      <Text style={styles.body}>
        This is the native {BRAND_NAME} app. It loads the public product API from your Next.js deployment and opens checkout
        and account flows in the browser until those flows are wired natively.
      </Text>
      <Text style={styles.mono}>API origin: {getApiOrigin()}</Text>
      <StatusBar style={Platform.OS === "ios" ? "light" : "auto"} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 16,
    opacity: 0.9,
  },
  mono: {
    fontSize: 12,
    opacity: 0.65,
    textAlign: "center",
  },
});
