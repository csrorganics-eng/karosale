import { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button, Input } from "@/components/ui";
import { theme } from "@/constants/theme";
import { ApiError } from "@/lib/api/client";
import { shopApi, type Address } from "@/lib/api/shop";

type FormField = "name" | "phone" | "line1" | "line2" | "city" | "state" | "pincode";
type AddressType = "home" | "work" | "other";

type FormState = {
  name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  addressType: AddressType;
  isDefault: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  pincode: "",
  addressType: "home",
  isDefault: false,
};

const ADDRESS_TYPES: { id: AddressType; label: string; icon: "home-outline" | "briefcase-outline" | "location-outline" }[] = [
  { id: "home", label: "Home", icon: "home-outline" },
  { id: "work", label: "Work", icon: "briefcase-outline" },
  { id: "other", label: "Other", icon: "location-outline" },
];

type FieldErrors = Partial<Record<FormField, string>>;

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  if (form.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  const phone = form.phone.trim().replace(/\D/g, "");
  if (phone.length < 10) errors.phone = "Enter a valid 10-digit mobile number";
  if (form.line1.trim().length < 5) errors.line1 = "Street address must be at least 5 characters";
  if (form.city.trim().length < 2) errors.city = "Enter a valid city name";
  if (form.state.trim().length < 2) errors.state = "Enter a valid state name";
  if (!/^\d{6}$/.test(form.pincode.trim())) errors.pincode = "Pincode must be exactly 6 digits";
  return errors;
}

function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  optional,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  error?: string;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  optional?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={fi.wrap}>
      <Text style={fi.label}>
        {label}
        {optional ? <Text style={fi.optional}> (optional)</Text> : <Text style={fi.required}> *</Text>}
      </Text>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        keyboardType={keyboardType}
        multiline={multiline}
        style={error ? fi.inputError : undefined}
      />
      {error ? (
        <View style={fi.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={theme.colors.error} />
          <Text style={fi.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const fi = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: theme.colors.text },
  optional: { fontWeight: "400", color: theme.colors.textMuted },
  required: { color: theme.colors.error },
  inputError: { borderColor: theme.colors.error, borderWidth: 1.5 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errorText: { fontSize: 12, color: theme.colors.error },
});

export default function AddressesScreen() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const set = (field: keyof FormState) => (value: string | boolean | AddressType) =>
    setForm((f) => ({ ...f, [field]: value }));

  const { data, isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => shopApi.addresses(),
  });

  const create = useMutation({
    mutationFn: () =>
      shopApi.createAddress({
        ...form,
        phone: form.phone.trim().replace(/\s/g, ""),
        name: form.name.trim(),
        line1: form.line1.trim(),
        line2: form.line2.trim() || null,
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["addresses"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFieldErrors({});
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        // Try to extract Zod field errors from the API response
        const details = e.details as
          | { fieldErrors?: Record<string, string[]> }
          | undefined;
        if (details?.fieldErrors) {
          const mapped: FieldErrors = {};
          for (const [k, msgs] of Object.entries(details.fieldErrors)) {
            mapped[k as FormField] = msgs[0];
          }
          setFieldErrors(mapped);
          Alert.alert(
            "Please fix the highlighted fields",
            Object.values(mapped).join("\n"),
          );
        } else {
          Alert.alert("Could not save address", e.message);
        }
      } else {
        Alert.alert("Error", "Could not save the address. Please try again.");
      }
    },
  });

  const handleSave = () => {
    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Focus the first broken field via a friendly alert summary
      const messages = Object.values(errors);
      Alert.alert("Please check these fields", messages.join("\n"));
      return;
    }
    setFieldErrors({});
    create.mutate();
  };

  const cancelForm = () => {
    setShowForm(false);
    setForm(EMPTY_FORM);
    setFieldErrors({});
  };

  return (
    <View style={styles.flex}>
      <AppHeader title="Addresses" showSearch={false} />

      {showForm ? (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            contentContainerStyle={styles.formScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <Text style={styles.formTitle}>New delivery address</Text>

            <FieldInput
              label="Full name"
              value={form.name}
              onChangeText={set("name")}
              placeholder="e.g. Priya Sharma"
              error={fieldErrors.name}
            />
            <FieldInput
              label="Mobile number"
              value={form.phone}
              onChangeText={(v) => set("phone")(v.replace(/[^\d\s+]/g, ""))}
              placeholder="e.g. 9876543210"
              keyboardType="phone-pad"
              error={fieldErrors.phone}
            />
            <FieldInput
              label="Street address"
              value={form.line1}
              onChangeText={set("line1")}
              placeholder="House / Flat no., Street, Area"
              error={fieldErrors.line1}
              multiline
            />
            <FieldInput
              label="Landmark / Apartment"
              value={form.line2}
              onChangeText={set("line2")}
              placeholder="e.g. Near City Mall (optional)"
              optional
            />
            <FieldInput
              label="City"
              value={form.city}
              onChangeText={set("city")}
              placeholder="e.g. Mumbai"
              error={fieldErrors.city}
            />
            <FieldInput
              label="State"
              value={form.state}
              onChangeText={set("state")}
              placeholder="e.g. Maharashtra"
              error={fieldErrors.state}
            />
            <FieldInput
              label="Pincode"
              value={form.pincode}
              onChangeText={(v) => set("pincode")(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="6-digit pincode"
              keyboardType="number-pad"
              error={fieldErrors.pincode}
            />

            {/* Address type */}
            <Text style={styles.typeLabel}>Address type</Text>
            <View style={styles.typeRow}>
              {ADDRESS_TYPES.map((t) => (
                <Pressable
                  key={t.id}
                  style={[styles.typeChip, form.addressType === t.id && styles.typeChipActive]}
                  onPress={() => set("addressType")(t.id)}>
                  <Ionicons
                    name={t.icon}
                    size={18}
                    color={form.addressType === t.id ? "#fff" : theme.colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.typeChipText,
                      form.addressType === t.id && styles.typeChipTextActive,
                    ]}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Set as default */}
            <Pressable
              style={styles.defaultRow}
              onPress={() => set("isDefault")(!form.isDefault)}>
              <View
                style={[styles.checkbox, form.isDefault && styles.checkboxChecked]}>
                {form.isDefault ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
              <Text style={styles.defaultText}>Set as default delivery address</Text>
            </Pressable>

            <View style={styles.formButtons}>
              <Button
                label="Save address"
                onPress={handleSave}
                loading={create.isPending}
                variant="warm"
                style={styles.saveBtn}
              />
              <Button
                label="Cancel"
                onPress={cancelForm}
                variant="outline"
                style={styles.cancelBtn}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <>
          <Button
            label="+ Add new address"
            onPress={() => setShowForm(true)}
            style={styles.addBtn}
          />
          <FlatList
            data={data?.addresses ?? []}
            keyExtractor={(a) => a.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyEmoji}>📍</Text>
                  <Text style={styles.emptyTitle}>No saved addresses</Text>
                  <Text style={styles.emptySub}>
                    Add an address to speed up checkout.
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }: { item: Address }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.typePill}>
                    <Ionicons
                      name={
                        item.addressType === "work"
                          ? "briefcase-outline"
                          : item.addressType === "other"
                            ? "location-outline"
                            : "home-outline"
                      }
                      size={13}
                      color={theme.colors.primary}
                    />
                    <Text style={styles.typePillText}>
                      {item.addressType.charAt(0).toUpperCase() + item.addressType.slice(1)}
                    </Text>
                  </View>
                  {item.isDefault ? (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>Default</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardLine}>
                  {item.line1}
                  {item.line2 ? `, ${item.line2}` : ""}
                </Text>
                <Text style={styles.cardLine}>
                  {item.city}, {item.state} — {item.pincode}
                </Text>
                <Text style={styles.cardPhone}>📞 {item.phone}</Text>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: theme.colors.background },

  addBtn: { margin: 16 },

  formScroll: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  formTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    color: theme.colors.text,
    marginBottom: 6,
  },

  typeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text,
    marginTop: 4,
  },
  typeRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  typeChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeChipText: { fontSize: 13, fontWeight: "600", color: theme.colors.textMuted },
  typeChipTextActive: { color: "#fff" },

  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  defaultText: { fontSize: 14, color: theme.colors.text, fontWeight: "500" },

  formButtons: { gap: 10, marginTop: 8 },
  saveBtn: {},
  cancelBtn: {},

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyWrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 24 },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    marginTop: 10,
    color: theme.colors.text,
  },
  emptySub: { color: theme.colors.textMuted, marginTop: 6, textAlign: "center" },

  card: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.card,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
    gap: 4,
  },
  cardHeader: { flexDirection: "row", gap: 8, marginBottom: 6 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.primary + "30",
  },
  typePillText: { fontSize: 11, fontWeight: "700", color: theme.colors.primary },
  defaultPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.success + "18",
    borderWidth: 1,
    borderColor: theme.colors.success + "40",
  },
  defaultPillText: { fontSize: 11, fontWeight: "700", color: theme.colors.success },
  cardName: { fontWeight: "700", fontSize: 16, color: theme.colors.text },
  cardLine: { color: theme.colors.textMuted, lineHeight: 20 },
  cardPhone: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
});
