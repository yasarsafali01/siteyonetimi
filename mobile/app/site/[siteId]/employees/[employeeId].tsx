import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../../src/components/ui/Screen";
import { SegmentedTabs } from "../../../../src/components/ui/SegmentedTabs";
import { InlineListManager } from "../../../../src/components/ui/InlineListManager";
import { Chip } from "../../../../src/components/ui/Chip";
import { AppButton } from "../../../../src/components/ui/AppButton";
import { colors } from "../../../../src/theme";
import {
  decideLeaveRequest,
  leaveRequests,
  performanceReviews,
  salaryAdvances,
  shifts,
  timesheets,
} from "../../../../src/api/hr";
import type { LeaveRequest, PerformanceReview, SalaryAdvance, Shift, Timesheet } from "../../../../src/types/hr";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  yillik_izin: "Yıllık İzin",
  ucretsiz_izin: "Ücretsiz İzin",
  hastalik_izni: "Hastalık İzni",
  mazeret_izni: "Mazeret İzni",
};
const LEAVE_STATUS_LABELS: Record<string, string> = { bekliyor: "Bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi" };

export default function EmployeeDetailScreen() {
  const { employeeId } = useLocalSearchParams<{ employeeId: string }>();

  const [shiftList, setShiftList] = useState<Shift[]>([]);
  const [timesheetList, setTimesheetList] = useState<Timesheet[]>([]);
  const [leaveList, setLeaveList] = useState<LeaveRequest[]>([]);
  const [advanceList, setAdvanceList] = useState<SalaryAdvance[]>([]);
  const [reviewList, setReviewList] = useState<PerformanceReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  async function refreshAll() {
    if (!employeeId) return;
    try {
      const [sh, ts, lv, sa, pr] = await Promise.all([
        shifts.list(employeeId),
        timesheets.list(employeeId),
        leaveRequests.list(employeeId),
        salaryAdvances.list(employeeId),
        performanceReviews.list(employeeId),
      ]);
      setShiftList(sh);
      setTimesheetList(ts);
      setLeaveList(lv);
      setAdvanceList(sa);
      setReviewList(pr);
      setError(null);
    } catch {
      setError("Personel bilgileri yüklenemedi");
    }
  }

  useFocusEffect(useCallback(() => { refreshAll(); }, [employeeId]));

  async function handleLeaveDecision(leaveId: string, approve: boolean) {
    if (!employeeId) return;
    await decideLeaveRequest(leaveId, approve);
    setLeaveList(await leaveRequests.list(employeeId));
  }

  if (!employeeId) return null;

  return (
    <Screen error={error}>
      <SegmentedTabs tabs={["Vardiya & Puantaj", "İzin Talepleri", "Avans & Performans"]} value={tab} onChange={setTab} />

      {tab === 0 && (
        <>
          <InlineListManager<Shift>
            title="Vardiya Planları"
            items={shiftList}
            getKey={(i) => i.id}
            getPrimary={(i) => new Date(i.shiftDate).toLocaleDateString("tr-TR")}
            getSecondary={(i) => `${i.startTime.slice(0, 5)} - ${i.endTime.slice(0, 5)}`}
            fields={[
              { name: "shiftDate", label: "Tarih (YYYY-AA-GG)", required: true },
              { name: "startTime", label: "Başlangıç (SS:DD)", required: true },
              { name: "endTime", label: "Bitiş (SS:DD)", required: true },
            ]}
            onSubmit={async (v) => {
              await shifts.create(employeeId, v);
              setShiftList(await shifts.list(employeeId));
            }}
          />

          <InlineListManager<Timesheet>
            title="Puantaj"
            items={timesheetList}
            getKey={(i) => i.id}
            getPrimary={(i) => new Date(i.workDate).toLocaleDateString("tr-TR")}
            getSecondary={(i) => [i.checkIn?.slice(0, 5), i.checkOut?.slice(0, 5)].filter(Boolean).join(" - ") || undefined}
            fields={[
              { name: "workDate", label: "Tarih (YYYY-AA-GG)", required: true },
              { name: "checkIn", label: "Giriş (SS:DD)" },
              { name: "checkOut", label: "Çıkış (SS:DD)" },
            ]}
            onSubmit={async (v) => {
              await timesheets.create(employeeId, v);
              setTimesheetList(await timesheets.list(employeeId));
            }}
          />
        </>
      )}

      {tab === 1 && (
        <>
          <Text style={styles.sectionTitle}>İzin Talepleri</Text>
          {leaveList.length === 0 ? (
            <Text style={styles.emptyText}>Henüz izin talebi yok.</Text>
          ) : (
            leaveList.map((l) => (
              <View key={l.id} style={styles.leaveRow}>
                <Text style={styles.leaveText}>
                  {LEAVE_TYPE_LABELS[l.type]} — {new Date(l.startDate).toLocaleDateString("tr-TR")} - {new Date(l.endDate).toLocaleDateString("tr-TR")}
                </Text>
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <Chip label={LEAVE_STATUS_LABELS[l.status]} />
                  {l.status === "bekliyor" && (
                    <>
                      <AppButton small variant="text" label="Onayla" onPress={() => handleLeaveDecision(l.id, true)} />
                      <AppButton small variant="text" color="error" label="Reddet" onPress={() => handleLeaveDecision(l.id, false)} />
                    </>
                  )}
                </View>
              </View>
            ))
          )}

          <InlineListManager<LeaveRequest>
            title="Yeni İzin Talebi Oluştur"
            items={[]}
            getKey={(i) => i.id}
            getPrimary={() => ""}
            fields={[
              { name: "type", label: "Tür (yillik_izin/ucretsiz_izin/hastalik_izni/mazeret_izni)", required: true },
              { name: "startDate", label: "Başlangıç (YYYY-AA-GG)", required: true },
              { name: "endDate", label: "Bitiş (YYYY-AA-GG)", required: true },
            ]}
            onSubmit={async (v) => {
              await leaveRequests.create(employeeId, v);
              setLeaveList(await leaveRequests.list(employeeId));
            }}
          />
        </>
      )}

      {tab === 2 && (
        <>
          <InlineListManager<SalaryAdvance>
            title="Avans İşlemleri"
            items={advanceList}
            getKey={(i) => i.id}
            getPrimary={(i) => `${i.amount.toLocaleString("tr-TR")} ₺`}
            getSecondary={(i) => new Date(i.requestedAt).toLocaleDateString("tr-TR") + (i.note ? ` — ${i.note}` : "")}
            fields={[
              { name: "amount", label: "Tutar", required: true },
              { name: "note", label: "Not" },
            ]}
            onSubmit={async (v) => {
              await salaryAdvances.create(employeeId, { ...v, amount: Number(v.amount) });
              setAdvanceList(await salaryAdvances.list(employeeId));
            }}
          />

          <InlineListManager<PerformanceReview>
            title="Performans Değerlendirmeleri"
            items={reviewList}
            getKey={(i) => i.id}
            getPrimary={(i) => `Puan: ${i.score}/5`}
            getSecondary={(i) => [new Date(i.reviewDate).toLocaleDateString("tr-TR"), i.comment].filter(Boolean).join(" — ")}
            fields={[
              { name: "score", label: "Puan (1-5)", required: true },
              { name: "comment", label: "Yorum" },
            ]}
            onSubmit={async (v) => {
              await performanceReviews.create(employeeId, { ...v, score: Number(v.score) });
              setReviewList(await performanceReviews.list(employeeId));
            }}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  emptyText: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
  leaveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  leaveText: { fontSize: 13, color: colors.textPrimary, flex: 1, marginRight: 8 },
});
