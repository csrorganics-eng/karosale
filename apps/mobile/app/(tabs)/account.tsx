import { Pressable, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";

import { Text, View } from "@/components/Themed";
import { storefrontUrl } from "@/lib/api";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function AccountScreen() {
  const scheme = useColorScheme() ?? "light";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account</Text>
      <Text style={styles.body}>
        Sign-in uses the web app (NextAuth). Open your account in the browser until we add a native auth session bridge.
      </Text>
      <Pressable
        style={[styles.button, { backgroundColor: Colors[scheme].tint }]}
        onPress={() => WebBrowser.openBrowserAsync(storefrontUrl("/account"))}>
        <Text style={styles.buttonText}>Open account in browser</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 24, opacity: 0.85, marginBottom: 24 },
  button: {
    alignSelf: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
