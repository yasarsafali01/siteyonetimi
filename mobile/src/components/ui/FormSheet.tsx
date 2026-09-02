import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { colors, radius } from "../../theme";
import { AppButton } from "./AppButton";

interface FormSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  children: ReactNode;
}

export function FormSheet({ visible, title, onClose, onSubmit, submitting, submitLabel = "Kaydet", children }: FormSheetProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.sheetWrap}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            <View style={styles.footer}>
              <AppButton label="Vazgeç" variant="text" onPress={onClose} />
              <AppButton label={submitLabel} onPress={onSubmit} loading={submitting} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "flex-end",
  },
  sheetWrap: {
    maxHeight: "88%",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 16,
    maxHeight: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  body: {
    paddingHorizontal: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
