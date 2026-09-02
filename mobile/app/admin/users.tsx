import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Text } from "react-native";
import { Screen } from "../../src/components/ui/Screen";
import { ListRow, EmptyState } from "../../src/components/ui/ListRow";
import { Card } from "../../src/components/ui/Card";
import { Chip } from "../../src/components/ui/Chip";
import { AppButton } from "../../src/components/ui/AppButton";
import { FormField } from "../../src/components/ui/FormField";
import { SelectField } from "../../src/components/ui/SelectField";
import { FormSheet } from "../../src/components/ui/FormSheet";
import { colors } from "../../src/theme";
import { createUser, listUsers } from "../../src/api/users";
import type { AppUser, UserType } from "../../src/types/user";

const TYPE_LABELS: Record<UserType, string> = { yonetici: "Yönetici", sakin: "Sakin" };

export default function UsersScreen() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("yonetici");
  const [personId, setPersonId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    try {
      setUsers(await listUsers());
      setError(null);
    } catch {
      setError("Kullanıcılar yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, []));

  async function handleCreate() {
    setSubmitting(true);
    try {
      await createUser({ email, password, fullName, userType, personId: userType === "sakin" ? personId : undefined });
      setDialogOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setPersonId("");
      await refresh();
    } catch {
      setError("Kullanıcı oluşturulamadı — e-posta zaten kullanılıyor veya sakin için kişi id'si geçersiz olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Kullanıcılar"
      action={<AppButton small label="Yeni Kullanıcı" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 14 }}>
        Yönetici hesapları tüm modüllere erişebilir. Sakin hesapları bir kişiye bağlıdır ve sadece kendi bağımsız
        bölümüne ait veriye erişebilir — sakin hesabı açmanın en kolay yolu Kişi Detayı sayfasındaki butondur.
      </Text>

      {users.length === 0 ? (
        <EmptyState text="Kullanıcı bulunamadı." />
      ) : (
        <Card style={{ padding: 0 }}>
          {users.map((u) => (
            <ListRow
              key={u.id}
              title={u.fullName}
              subtitle={u.email}
              right={<Chip label={u.isSuperAdmin ? "Süper Admin" : TYPE_LABELS[u.userType]} tone={u.userType === "yonetici" ? "primary" : "default"} />}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Kullanıcı" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Ad Soyad" value={fullName} onChangeText={setFullName} autoFocus />
        <FormField label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <FormField label="Şifre" value={password} onChangeText={setPassword} secureTextEntry helperText="En az 8 karakter" />
        <SelectField
          label="Kullanıcı Tipi"
          value={userType}
          onChange={(v) => setUserType(v as UserType)}
          options={[{ label: "Yönetici", value: "yonetici" }, { label: "Sakin", value: "sakin" }]}
        />
        {userType === "sakin" && (
          <FormField label="Kişi (Person) ID" value={personId} onChangeText={setPersonId} helperText="Kişiler sayfasından ilgili kişinin id'si" />
        )}
      </FormSheet>
    </Screen>
  );
}
