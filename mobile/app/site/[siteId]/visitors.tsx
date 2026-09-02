import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { SegmentedTabs } from "../../../src/components/ui/SegmentedTabs";
import { colors } from "../../../src/theme";
import {
  checkInWalkIn,
  checkInWithCode,
  checkOut,
  createInvitation,
  decideInvitation,
  listInvitations,
  listVisitorLogs,
} from "../../../src/api/visitor";
import type { InvitationStatus, VisitorInvitation, VisitorLog } from "../../../src/types/visitor";

const STATUS_LABELS: Record<InvitationStatus, string> = {
  bekliyor: "Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  kullanildi: "Kullanıldı",
  iptal: "İptal",
};
const STATUS_TONE: Record<InvitationStatus, "default" | "warning" | "success" | "error"> = {
  bekliyor: "warning",
  onaylandi: "success",
  reddedildi: "error",
  kullanildi: "default",
  iptal: "default",
};

function toIso(local: string) {
  return new Date(local.includes("T") ? local : local.replace(" ", "T")).toISOString();
}

export default function VisitorsScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [invitations, setInvitations] = useState<VisitorInvitation[]>([]);
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [invDialogOpen, setInvDialogOpen] = useState(false);
  const [invName, setInvName] = useState("");
  const [invPhone, setInvPhone] = useState("");
  const [invPlate, setInvPlate] = useState("");
  const [invValidUntil, setInvValidUntil] = useState("");

  const [checkInTab, setCheckInTab] = useState(0);
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);
  const [wName, setWName] = useState("");
  const [wPhone, setWPhone] = useState("");
  const [wIdNumber, setWIdNumber] = useState("");
  const [wPlate, setWPlate] = useState("");
  const [wCard, setWCard] = useState("");
  const [code, setCode] = useState("");
  const [codeCard, setCodeCard] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      const [inv, lg] = await Promise.all([listInvitations(siteId), listVisitorLogs(siteId)]);
      setInvitations(inv);
      setLogs(lg);
      setError(null);
    } catch {
      setError("Ziyaretçi verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreateInvitation() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createInvitation(siteId, {
        visitorName: invName,
        visitorPhone: invPhone || undefined,
        vehiclePlate: invPlate || undefined,
        validUntil: toIso(invValidUntil),
      });
      setInvDialogOpen(false);
      setInvName("");
      setInvPhone("");
      setInvPlate("");
      setInvValidUntil("");
      await refresh();
    } catch {
      setError("Davetiye oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecide(id: string, approve: boolean) {
    try {
      await decideInvitation(id, approve);
      await refresh();
    } catch {
      setError("Davetiye güncellenemedi");
    }
  }

  async function handleWalkIn() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await checkInWalkIn(siteId, {
        visitorName: wName,
        visitorPhone: wPhone || undefined,
        idNumber: wIdNumber || undefined,
        vehiclePlate: wPlate || undefined,
        tempCardNo: wCard || undefined,
      });
      setCheckInDialogOpen(false);
      setWName(""); setWPhone(""); setWIdNumber(""); setWPlate(""); setWCard("");
      await refresh();
    } catch {
      setError("Giriş kaydı oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeCheckIn() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await checkInWithCode(siteId, code, codeCard || undefined);
      setCheckInDialogOpen(false);
      setCode(""); setCodeCard("");
      await refresh();
    } catch {
      setError("Davetiye koduyla giriş yapılamadı — kod geçersiz veya onaylanmamış olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut(logId: string) {
    try {
      await checkOut(logId);
      await refresh();
    } catch {
      setError("Çıkış kaydı yapılamadı");
    }
  }

  return (
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>QR Davetiyeler</Text>
        <AppButton small label="Yeni Davetiye" onPress={() => setInvDialogOpen(true)} />
      </View>
      {invitations.length === 0 ? (
        <EmptyState text="Henüz davetiye yok." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {invitations.map((inv) => (
            <View key={inv.id}>
              <ListRow
                title={inv.visitorName}
                subtitle={`Kod: ${inv.invitationCode}${inv.vehiclePlate ? ` · ${inv.vehiclePlate}` : ""} · ${new Date(inv.validUntil).toLocaleString("tr-TR")}'e kadar`}
                right={<Chip label={STATUS_LABELS[inv.status]} tone={STATUS_TONE[inv.status]} />}
              />
              {inv.status === "bekliyor" && (
                <View style={styles.inlineActions}>
                  <AppButton small variant="text" color="success" label="Onayla" onPress={() => handleDecide(inv.id, true)} />
                  <AppButton small variant="text" color="error" label="Reddet" onPress={() => handleDecide(inv.id, false)} />
                </View>
              )}
            </View>
          ))}
        </Card>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Giriş Çıkış Kayıtları</Text>
        <AppButton small label="Yeni Giriş" onPress={() => setCheckInDialogOpen(true)} />
      </View>
      {logs.length === 0 ? (
        <EmptyState text="Henüz giriş çıkış kaydı yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {logs.map((lg) => (
            <ListRow
              key={lg.id}
              title={lg.visitorName}
              subtitle={`${lg.vehiclePlate ?? "-"} · Giriş: ${new Date(lg.checkedInAt).toLocaleString("tr-TR")}${lg.checkedOutAt ? ` · Çıkış: ${new Date(lg.checkedOutAt).toLocaleString("tr-TR")}` : ""}`}
              right={!lg.checkedOutAt ? <AppButton small variant="outlined" label="Çıkış Yap" onPress={() => handleCheckOut(lg.id)} /> : undefined}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={invDialogOpen} title="Yeni QR Davetiye" onClose={() => setInvDialogOpen(false)} onSubmit={handleCreateInvitation} submitting={submitting}>
        <FormField label="Ziyaretçi Adı" value={invName} onChangeText={setInvName} autoFocus />
        <FormField label="Telefon" value={invPhone} onChangeText={setInvPhone} keyboardType="phone-pad" />
        <FormField label="Araç Plakası" value={invPlate} onChangeText={setInvPlate} />
        <FormField label="Geçerlilik Bitişi" placeholder="2026-09-05T18:00" helperText="Format: YYYY-AA-GGTSS:DD" value={invValidUntil} onChangeText={setInvValidUntil} />
      </FormSheet>

      <FormSheet
        visible={checkInDialogOpen}
        title="Yeni Giriş"
        onClose={() => setCheckInDialogOpen(false)}
        onSubmit={checkInTab === 0 ? handleWalkIn : handleCodeCheckIn}
        submitting={submitting}
      >
        <SegmentedTabs tabs={["Davetiyesiz Giriş", "Davetiye Koduyla"]} value={checkInTab} onChange={setCheckInTab} />
        {checkInTab === 0 ? (
          <>
            <FormField label="Ziyaretçi Adı" value={wName} onChangeText={setWName} autoFocus />
            <FormField label="Telefon" value={wPhone} onChangeText={setWPhone} keyboardType="phone-pad" />
            <FormField label="Kimlik No" value={wIdNumber} onChangeText={setWIdNumber} />
            <FormField label="Araç Plakası" value={wPlate} onChangeText={setWPlate} />
            <FormField label="Geçici Kart No" value={wCard} onChangeText={setWCard} />
          </>
        ) : (
          <>
            <FormField label="Davetiye Kodu" value={code} onChangeText={setCode} autoFocus />
            <FormField label="Geçici Kart No" value={codeCard} onChangeText={setCodeCard} />
          </>
        )}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  inlineActions: { flexDirection: "row", paddingHorizontal: 14, paddingBottom: 8, gap: 4 },
});
