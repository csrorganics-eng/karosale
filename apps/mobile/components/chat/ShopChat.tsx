/**
 * ShopChat — Full-screen AI chat modal for CSR Organics mobile app.
 *
 * Features:
 * - Non-streaming POST /api/chat (same backend as web)
 * - Persistent clientKey in SecureStore
 * - Animated typing indicator (three dots)
 * - Quick prompt chips for common questions
 * - Product / order tool-calling handled server-side
 * - Apple-inspired bubble UI
 */
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { theme } from "@/constants/theme";
import { shopApi } from "@/lib/api/shop";
import { getOrCreateChatClientKey } from "@/lib/chat-key";
import { ApiError } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
};

const QUICK_PROMPTS = [
  { icon: "search-outline" as const, text: "Show organic vegetables" },
  { icon: "receipt-outline" as const, text: "Track my latest order" },
  { icon: "star-outline" as const, text: "What are bestsellers?" },
  { icon: "leaf-outline" as const, text: "Recommend seeds for monsoon" },
  { icon: "gift-outline" as const, text: "Any active offers?" },
];

const WELCOME = `Hi! 👋 I'm your CSR Organics assistant. I can help you:

• Find certified organic products
• Track your orders
• Recommend products for your needs
• Answer questions about our store

What can I help you with today?`;

// ── Animated typing dots ────────────────────────────────────────────────────
function TypingDots() {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((dots.length - i) * 150),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={td.wrap}>
      {dots.map((dot, i) => (
        <Animated.View
          key={i}
          style={[
            td.dot,
            {
              opacity: dot,
              transform: [
                {
                  translateY: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const td = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 5, alignItems: "center", paddingVertical: 4 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textMuted,
  },
});

// ── Message bubble ──────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <View style={[mb.row, isUser ? mb.rowUser : mb.rowAssistant]}>
      {!isUser && (
        <View style={mb.avatar}>
          <Text style={mb.avatarEmoji}>🌿</Text>
        </View>
      )}
      <View style={[mb.bubble, isUser ? mb.bubbleUser : mb.bubbleAssistant]}>
        <Text style={[mb.text, isUser ? mb.textUser : mb.textAssistant]}>{msg.text}</Text>
      </View>
    </View>
  );
}

const mb = StyleSheet.create({
  row: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end", gap: 8 },
  rowUser: { justifyContent: "flex-end" },
  rowAssistant: { justifyContent: "flex-start" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarEmoji: { fontSize: 16 },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  text: { fontSize: 15, lineHeight: 21 },
  textUser: { color: "#fff" },
  textAssistant: { color: theme.colors.text },
});

// ── Main chat modal ─────────────────────────────────────────────────────────
type Props = { visible: boolean; onClose: () => void };

export function ShopChat({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message | "typing">>(null);

  // Check if chat is available
  const { data: statusData } = useQuery({
    queryKey: ["chat-status"],
    queryFn: () => shopApi.chatStatus(),
    staleTime: 60_000,
  });
  const chatEnabled = statusData?.enabled ?? false;

  // Load client key once
  useEffect(() => {
    void getOrCreateChatClientKey().then(setClientKey);
  }, []);

  // Auto-scroll to bottom when messages update
  const scrollToBottom = () => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };
  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages.length, thinking]);

  const addMsg = (role: Message["role"], text: string) => {
    const msg: Message = { id: `${Date.now()}-${role}`, role, text, ts: Date.now() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  };

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || thinking || !clientKey || !chatEnabled) return;
    setInput("");
    setError(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addMsg("user", msg);
    setThinking(true);

    try {
      const result = await shopApi.chat(clientKey, msg);
      addMsg("assistant", result.reply || "Sorry, I couldn't process that. Please try again.");
    } catch (e) {
      const errMsg =
        e instanceof ApiError && e.status === 429
          ? "You're sending messages too fast. Please wait a moment."
          : e instanceof ApiError
            ? e.message
            : "Network error. Please check your connection.";
      setError(errMsg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setThinking(false);
    }
  };

  // List data: messages + optional typing indicator sentinel
  const listData: (Message | "typing")[] = thinking
    ? ([...messages, "typing"] as (Message | "typing")[])
    : messages;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[chat.flex, { paddingTop: Platform.OS === "android" ? insets.top : 0 }]}>

        {/* ── Header ── */}
        <LinearGradient
          colors={[theme.colors.primary, "#2d6b52"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={chat.header}>
          <View style={chat.headerLeft}>
            <View style={chat.headerAvatar}>
              <Text style={{ fontSize: 20 }}>🌿</Text>
            </View>
            <View>
              <Text style={chat.headerTitle}>Shop companion</Text>
              <Text style={chat.headerSub}>
                {chatEnabled ? "● Online · Ask me anything" : "● Setting up…"}
              </Text>
            </View>
          </View>
          <Pressable onPress={onClose} style={chat.closeBtn} accessibilityLabel="Close chat">
            <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.9)" />
          </Pressable>
        </LinearGradient>

        {/* ── Messages ── */}
        <KeyboardAvoidingView
          style={chat.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}>

          <FlatList
            ref={listRef}
            data={listData}
            keyExtractor={(item) =>
              typeof item === "string" ? "typing" : item.id
            }
            contentContainerStyle={chat.messageList}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              messages.length === 0 && !thinking ? (
                <View style={chat.welcomeWrap}>
                  {/* Welcome card */}
                  <View style={chat.welcomeCard}>
                    <Text style={chat.welcomeText}>{WELCOME}</Text>
                  </View>

                  {/* Quick prompts */}
                  {chatEnabled && (
                    <View style={chat.quickSection}>
                      <Text style={chat.quickLabel}>Quick questions</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={chat.quickRow}>
                        {QUICK_PROMPTS.map((p) => (
                          <Pressable
                            key={p.text}
                            style={chat.quickChip}
                            onPress={() => void send(p.text)}>
                            <Ionicons name={p.icon} size={14} color={theme.colors.primary} />
                            <Text style={chat.quickChipText}>{p.text}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {!chatEnabled && statusData && (
                    <View style={chat.unavailableCard}>
                      <Ionicons name="information-circle-outline" size={22} color={theme.colors.textMuted} />
                      <Text style={chat.unavailableText}>
                        The AI assistant is not configured on this server. Please contact support.
                      </Text>
                    </View>
                  )}
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              if (item === "typing") {
                return (
                  <View style={[mb.row, mb.rowAssistant]}>
                    <View style={mb.avatar}>
                      <Text style={mb.avatarEmoji}>🌿</Text>
                    </View>
                    <View style={[mb.bubble, mb.bubbleAssistant]}>
                      <TypingDots />
                    </View>
                  </View>
                );
              }
              return <MessageBubble msg={item} />;
            }}
          />

          {/* Error pill */}
          {error ? (
            <Pressable
              style={chat.errorPill}
              onPress={() => setError(null)}
              accessibilityLabel="Dismiss error">
              <Ionicons name="warning-outline" size={14} color={theme.colors.error} />
              <Text style={chat.errorText}>{error}</Text>
              <Ionicons name="close" size={14} color={theme.colors.textMuted} />
            </Pressable>
          ) : null}

          {/* ── Input bar ── */}
          {Platform.OS === "ios" ? (
            <BlurView intensity={80} tint="light" style={chat.inputBlur}>
              <InputBar
                value={input}
                onChangeText={setInput}
                onSend={() => void send()}
                disabled={!chatEnabled || thinking || !clientKey}
                thinking={thinking}
                insetBottom={insets.bottom}
              />
            </BlurView>
          ) : (
            <View style={[chat.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <InputBar
                value={input}
                onChangeText={setInput}
                onSend={() => void send()}
                disabled={!chatEnabled || thinking || !clientKey}
                thinking={thinking}
                insetBottom={0}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ── Extracted input bar ─────────────────────────────────────────────────────
function InputBar({
  value,
  onChangeText,
  onSend,
  disabled,
  thinking,
  insetBottom,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
  thinking: boolean;
  insetBottom: number;
}) {
  return (
    <View style={[ib.wrap, { paddingBottom: Math.max(insetBottom, 12) }]}>
      <TextInput
        style={ib.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={thinking ? "Getting your answer…" : "Ask about products, orders…"}
        placeholderTextColor={theme.colors.textMuted}
        returnKeyType="send"
        onSubmitEditing={onSend}
        editable={!disabled}
        multiline
        maxLength={1000}
      />
      <Pressable
        style={[ib.sendBtn, (!value.trim() || disabled) && ib.sendBtnDisabled]}
        onPress={onSend}
        disabled={!value.trim() || disabled}
        accessibilityLabel="Send message">
        <Ionicons
          name="arrow-up"
          size={18}
          color={!value.trim() || disabled ? theme.colors.textMuted : "#fff"}
        />
      </Pressable>
    </View>
  );
}

const ib = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 1,
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
});

// ── Chat modal styles ───────────────────────────────────────────────────────
const chat = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "ios" ? 14 : 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  headerSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: { padding: 6 },

  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },

  welcomeWrap: { gap: 16, marginBottom: 8 },
  welcomeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  welcomeText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 22,
  },

  quickSection: { gap: 8 },
  quickLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingLeft: 2,
  },
  quickRow: { gap: 8, paddingBottom: 4 },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  quickChipText: { fontSize: 13, fontWeight: "600", color: theme.colors.text },

  unavailableCard: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: 14,
    padding: 14,
  },
  unavailableText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 20,
  },

  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.error + "12",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error + "30",
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
  },

  inputBlur: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  inputBar: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
});
