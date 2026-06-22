import { Pressable, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Link } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";

import { Text, View } from "@/components/Themed";
import { BRAND_NAME, getApiOrigin } from "@/constants/config";
import { storefrontUrl } from "@/lib/api";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export default function HomeScreen() {
  const scheme = useColorScheme() ?? "light";
  const tint = Colors[scheme].brand;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{BRAND_NAME}</Text>
      <Text style={styles.subtitle}>Native app shell — browse the catalog in the Shop tab.</Text>
      <Text style={styles.meta}>API: {getApiOrigin()}</Text>

      <Pressable
        style={[styles.button, { backgroundColor: tint }]}
        onPress={() => WebBrowser.openBrowserAsync(storefrontUrl("/shop"))}>
        <FontAwesome name="external-link" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.buttonText}>Open full store (checkout & account)</Text>
      </Pressable>

      <Link href="/modal" asChild>
        <Pressable style={styles.link}>
          <Text style={styles.linkText}>About this app</Text>
        </Pressable>
      </Link>
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
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.85,
    marginBottom: 8,
  },
  meta: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 28,
    textAlign: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    maxWidth: "100%",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    flexShrink: 1,
  },
  link: {
    marginTop: 24,
    padding: 8,
  },
  linkText: {
    fontSize: 15,
    textDecorationLine: "underline",
  },
});
