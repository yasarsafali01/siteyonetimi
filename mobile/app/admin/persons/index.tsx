import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Screen } from "../../../src/components/ui/Screen";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { Card } from "../../../src/components/ui/Card";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { createPerson, listPersons } from "../../../src/api/crm";
import type { Person } from "../../../src/types/crm";

export default function PersonsScreen() {
  const router = useRouter();
  const [persons, setPersons] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh(q = search) {
    try {
      setPersons(await listPersons(q));
      setError(null);
    } catch {
      setError("Kişiler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, []));

  async function handleCreate() {
    setSubmitting(true);
    try {
      await createPerson({ firstName, lastName, phone: phone || undefined, nationalId: nationalId || undefined });
      setDialogOpen(false);
      setFirstName("");
      setLastName("");
      setPhone("");
      setNationalId("");
      await refresh();
    } catch {
      setError("Kişi oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Kişiler"
      action={<AppButton small label="Yeni Kişi" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      <FormField label="Ara (ad, soyad, TC no)" value={search} onChangeText={(t) => { setSearch(t); refresh(t); }} />

      {persons.length === 0 ? (
        <EmptyState text="Henüz kişi eklenmedi." />
      ) : (
        <Card style={{ padding: 0 }}>
          {persons.map((p) => (
            <ListRow
              key={p.id}
              title={`${p.firstName} ${p.lastName}`}
              subtitle={[p.phone, p.email].filter(Boolean).join(" · ") || undefined}
              onPress={() => router.push(`/admin/persons/${p.id}` as never)}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Kişi" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Ad" value={firstName} onChangeText={setFirstName} autoFocus />
        <FormField label="Soyad" value={lastName} onChangeText={setLastName} />
        <FormField label="Telefon" value={phone} onChangeText={setPhone} />
        <FormField label="TC Kimlik No" value={nationalId} onChangeText={setNationalId} />
      </FormSheet>
    </Screen>
  );
}
