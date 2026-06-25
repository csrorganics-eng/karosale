import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/AppHeader";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";

export default function CategoriesScreen() {
  const router = useRouter();
  const { data } = useQuery({ queryKey: ["categories"], queryFn: () => shopApi.categories() });

  return (
    <View style={styles.flex}>
      <AppHeader title="Categories" />
      <FlatList
        data={data?.categories ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: "/(tabs)/shop", params: { category: item.slug } })}>
            <Text style={styles.emoji}>{item.icon ?? "🌱"}</Text>
            <View style={styles.body}>
              <Text style={styles.name}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  emoji: { fontSize: 32, marginRight: 14 },
  body: { flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: theme.colors.text },
  desc: { marginTop: 4, fontSize: 13, color: theme.colors.textMuted },
  chevron: { fontSize: 24, color: theme.colors.textMuted },
});
