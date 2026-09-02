import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/auth/AuthContext";
import { AppButton } from "../src/components/ui/AppButton";
import { FormField } from "../src/components/ui/FormField";
import { colors, radius, shadow } from "../src/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError("E-posta veya şifre hatalı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <Ionicons name="business" size={26} color="#fff" />
        </View>
        <Text style={styles.title}>Site Yönetim Platformu</Text>
        <Text style={styles.subtitle}>Hesabınızla giriş yapın</Text>

        <FormField label="E-posta" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <FormField label="Şifre" secureTextEntry value={password} onChangeText={setPassword} />
        {error && <Text style={styles.error}>{error}</Text>}
        <AppButton label="Giriş Yap" onPress={handleSubmit} loading={submitting} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  error: {
    color: colors.error,
    marginBottom: 12,
    fontSize: 13,
  },
});
