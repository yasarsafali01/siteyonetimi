import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Alert, Box, Button, Chip, Tab, Tabs, Typography } from "@mui/material";
import {
  decideLeaveRequest,
  leaveRequests,
  performanceReviews,
  salaryAdvances,
  shifts,
  timesheets,
} from "../api/hr";
import type { LeaveRequest, PerformanceReview, SalaryAdvance, Shift, Timesheet } from "../types/hr";
import { InlineListManager } from "../components/InlineListManager";

const LEAVE_TYPE_LABELS: Record<string, string> = {
  yillik_izin: "Yıllık İzin",
  ucretsiz_izin: "Ücretsiz İzin",
  hastalik_izni: "Hastalık İzni",
  mazeret_izni: "Mazeret İzni",
};
const LEAVE_STATUS_LABELS: Record<string, string> = { bekliyor: "Bekliyor", onaylandi: "Onaylandı", reddedildi: "Reddedildi" };

export function EmployeeDetailPage() {
  const { siteId, employeeId } = useParams<{ siteId: string; employeeId: string }>();
  const navigate = useNavigate();

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

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  async function handleLeaveDecision(leaveId: string, approve: boolean) {
    if (!employeeId) return;
    await decideLeaveRequest(leaveId, approve);
    setLeaveList(await leaveRequests.list(employeeId));
  }

  if (!employeeId) return null;

  return (
    <Box>
      <Box sx={{ p: 4, maxWidth: 720 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Button size="small" startIcon={<ArrowBackIcon fontSize="small" />} onClick={() => navigate(`/sites/${siteId}/employees`)} sx={{ mb: 2 }}>
          Personel Listesi
        </Button>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Vardiya & Puantaj" />
          <Tab label="İzin Talepleri" />
          <Tab label="Avans & Performans" />
        </Tabs>

        {tab === 0 && (
          <>
            <InlineListManager<Shift>
              title="Vardiya Planları"
              items={shiftList}
              getKey={(i) => i.id}
              getPrimary={(i) => new Date(i.shiftDate).toLocaleDateString("tr-TR")}
              getSecondary={(i) => `${i.startTime.slice(0, 5)} - ${i.endTime.slice(0, 5)}`}
              fields={[
                { name: "shiftDate", label: "Tarih", type: "date", required: true },
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
                { name: "workDate", label: "Tarih", type: "date", required: true },
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
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                İzin Talepleri
              </Typography>
              {leaveList.length === 0 ? (
                <Typography color="text.secondary" sx={{ mb: 1 }}>Henüz izin talebi yok.</Typography>
              ) : (
                leaveList.map((l) => (
                  <Box key={l.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="body2">
                      {LEAVE_TYPE_LABELS[l.type]} — {new Date(l.startDate).toLocaleDateString("tr-TR")} - {new Date(l.endDate).toLocaleDateString("tr-TR")}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <Chip label={LEAVE_STATUS_LABELS[l.status]} size="small" />
                      {l.status === "bekliyor" && (
                        <>
                          <Button size="small" onClick={() => handleLeaveDecision(l.id, true)}>
                            Onayla
                          </Button>
                          <Button size="small" color="error" onClick={() => handleLeaveDecision(l.id, false)}>
                            Reddet
                          </Button>
                        </>
                      )}
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            <InlineListManager<LeaveRequest>
              title="Yeni İzin Talebi Oluştur"
              items={[]}
              getKey={(i) => i.id}
              getPrimary={() => ""}
              fields={[
                { name: "type", label: "Tür (yillik_izin/ucretsiz_izin/hastalik_izni/mazeret_izni)", required: true },
                { name: "startDate", label: "Başlangıç", type: "date", required: true },
                { name: "endDate", label: "Bitiş", type: "date", required: true },
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
                { name: "amount", label: "Tutar", type: "number", required: true },
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
                { name: "score", label: "Puan (1-5)", type: "number", required: true },
                { name: "comment", label: "Yorum" },
              ]}
              onSubmit={async (v) => {
                await performanceReviews.create(employeeId, { ...v, score: Number(v.score) });
                setReviewList(await performanceReviews.list(employeeId));
              }}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
