import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Screen } from "../../../../src/components/ui/Screen";
import { Card } from "../../../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../../../src/components/ui/ListRow";
import { AppButton } from "../../../../src/components/ui/AppButton";
import { FormField } from "../../../../src/components/ui/FormField";
import { FormSheet } from "../../../../src/components/ui/FormSheet";
import { createEmployee, listEmployees } from "../../../../src/api/hr";
import type { Employee } from "../../../../src/types/hr";

export default function EmployeesScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      setEmployees(await listEmployees(siteId));
      setError(null);
    } catch {
      setError("Personel listesi yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createEmployee(siteId, { firstName, lastName, position: position || undefined, phone: phone || undefined });
      setDialogOpen(false);
      setFirstName("");
      setLastName("");
      setPosition("");
      setPhone("");
      await refresh();
    } catch {
      setError("Personel oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Personel"
      action={<AppButton small label="Yeni Personel" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {employees.length === 0 ? (
        <EmptyState text="Henüz personel eklenmedi." />
      ) : (
        <Card style={{ padding: 0 }}>
          {employees.map((emp) => (
            <ListRow
              key={emp.id}
              title={`${emp.firstName} ${emp.lastName}`}
              subtitle={emp.position ?? undefined}
              onPress={() => router.push(`/site/${siteId}/employees/${emp.id}` as never)}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Personel" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Ad" value={firstName} onChangeText={setFirstName} autoFocus />
        <FormField label="Soyad" value={lastName} onChangeText={setLastName} />
        <FormField label="Görev" value={position} onChangeText={setPosition} />
        <FormField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      </FormSheet>
    </Screen>
  );
}
