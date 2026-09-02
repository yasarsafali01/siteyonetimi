import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Screen } from "../../src/components/ui/Screen";
import { Card } from "../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../src/components/ui/ListRow";
import { Chip } from "../../src/components/ui/Chip";
import { AppButton } from "../../src/components/ui/AppButton";
import { FormField } from "../../src/components/ui/FormField";
import { FormSheet } from "../../src/components/ui/FormSheet";
import { createInvitation, listInvitations } from "../../src/api/visitor";
import type { VisitorInvitation } from "../../src/types/visitor";
import { useResident } from "../../src/auth/ResidentContext";

const INVITATION_STATUS_LABELS: Record<string, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  kullanildi: "Kullanıldı",
  iptal: "İptal",
};
const STATUS_TONE: Record<string, "default" | "info" | "success" | "warning" | "error"> = {
  bekliyor: "warning",
  onaylandi: "success",
  reddedildi: "error",
  kullanildi: "info",
  iptal: "default",
};

function toIso(local: string) {
  return new Date(local.includes("T") ? local : local.replace(" ", "T")).toISOString();
}

export default function ResidentInvitationsScreen() {
  const { activeResidency } = useResident();
  const [invitations, setInvitations] = useState<VisitorInvitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [validUntil, setValidUntil] = useState("");

  async function refresh() {
    try {
      setInvitations(await listInvitations(activeResidency.siteId));
      setError(null);
    } catch {
      setError("Davetiyeler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [activeResidency.siteId]));

  async function handleCreate() {
    if (!name || !validUntil) {
      setError("Ziyaretçi adı ve geçerlilik bitişi zorunlu");
      return;
    }
    setSubmitting(true);
    try {
      await createInvitation(activeResidency.siteId, {
        unitId: activeResidency.unitId,
        visitorName: name,
        visitorPhone: phone || undefined,
        validUntil: toIso(validUntil),
      });
      setDialogOpen(false);
      setName("");
      setPhone("");
      setValidUntil("");
      await refresh();
    } catch {
      setError("Davetiye oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen
      title="Ziyaretçi Davetiyelerim"
      action={<AppButton small label="Yeni Davetiye" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {invitations.length === 0 ? (
        <EmptyState text="Henüz davetiyeniz yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {invitations.map((inv) => (
            <ListRow
              key={inv.id}
              title={inv.visitorName}
              subtitle={`Kod: ${inv.invitationCode} · Geçerlilik: ${new Date(inv.validUntil).toLocaleString("tr-TR")}`}
              right={<Chip label={INVITATION_STATUS_LABELS[inv.status] ?? inv.status} tone={STATUS_TONE[inv.status] ?? "default"} />}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Ziyaretçi Davetiyesi" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Ziyaretçi Adı" value={name} onChangeText={setName} autoFocus />
        <FormField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <FormField label="Geçerlilik Bitişi" placeholder="2026-09-05T18:00" helperText="Format: YYYY-AA-GGTSS:DD" value={validUntil} onChangeText={setValidUntil} />
      </FormSheet>
    </Screen>
  );
}
