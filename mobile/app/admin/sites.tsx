import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../../src/components/ui/Screen";
import { ListRow, EmptyState } from "../../src/components/ui/ListRow";
import { Card } from "../../src/components/ui/Card";
import { AppButton } from "../../src/components/ui/AppButton";
import { FormField } from "../../src/components/ui/FormField";
import { FormSheet } from "../../src/components/ui/FormSheet";
import { colors } from "../../src/theme";
import { createSite, listSites } from "../../src/api/sites";
import type { Site } from "../../src/types/site";

export default function SitesScreen() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    try {
      setSites(await listSites());
      setError(null);
    } catch {
      setError("Siteler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, []));

  async function handleCreate() {
    setSubmitting(true);
    try {
      await createSite({ name, address: address || undefined });
      setDialogOpen(false);
      setName("");
      setAddress("");
      await refresh();
    } catch {
      setError("Site oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Site Listesi"
      action={<AppButton small label="Yeni Site" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {sites.length === 0 ? (
        <EmptyState text="Henüz site eklenmedi." />
      ) : (
        <Card style={{ padding: 0 }}>
          {sites.map((site) => (
            <ListRow
              key={site.id}
              title={site.name}
              subtitle={site.address ?? undefined}
              onPress={() => router.push(`/site/${site.id}` as never)}
              right={<Ionicons name="business" size={16} color={colors.textSecondary} style={{ marginRight: 4 }} />}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Site" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Site Adı" value={name} onChangeText={setName} autoFocus />
        <FormField label="Adres" value={address} onChangeText={setAddress} />
      </FormSheet>
    </Screen>
  );
}
