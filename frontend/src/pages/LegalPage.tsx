import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  addLegalDocument,
  createLawyer,
  createLegalCase,
  listLawyers,
  listLegalCases,
  listLegalDocuments,
  setLegalCaseStatus,
} from "../api/legal";
import type { Lawyer, LegalCase, LegalCaseStatus, LegalCaseType, LegalDocument } from "../types/legal";

const TYPE_LABELS: Record<LegalCaseType, string> = { icra: "İcra", dava: "Dava", diger: "Diğer" };
const STATUS_LABELS: Record<LegalCaseStatus, string> = { acik: "Açık", devam_ediyor: "Devam Ediyor", kapandi: "Kapandı" };
const STATUS_COLORS: Record<LegalCaseStatus, "warning" | "info" | "default"> = { acik: "warning", devam_ediyor: "info", kapandi: "default" };

export function LegalPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [lawyerDialogOpen, setLawyerDialogOpen] = useState(false);
  const [lawyerName, setLawyerName] = useState("");
  const [lawyerPhone, setLawyerPhone] = useState("");

  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [caseType, setCaseType] = useState<LegalCaseType>("icra");
  const [caseTitle, setCaseTitle] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [amount, setAmount] = useState("");
  const [lawyerId, setLawyerId] = useState("");

  const [docsCase, setDocsCase] = useState<LegalCase | null>(null);
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [docTitle, setDocTitle] = useState("");
  const [docUrl, setDocUrl] = useState("");

  function lawyerName_(id: string | null) {
    if (!id) return "-";
    return lawyers.find((l) => l.id === id)?.fullName ?? id.slice(0, 8);
  }

  async function refresh() {
    if (!siteId) return;
    try {
      const [l, c] = await Promise.all([listLawyers(), listLegalCases(siteId)]);
      setLawyers(l);
      setCases(c);
      setError(null);
    } catch {
      setError("Hukuk modülü verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function handleCreateLawyer(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createLawyer({ fullName: lawyerName, phone: lawyerPhone || undefined });
      setLawyerDialogOpen(false);
      setLawyerName("");
      setLawyerPhone("");
      await refresh();
    } catch {
      setError("Avukat eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCase(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createLegalCase(siteId, {
        caseType,
        title: caseTitle,
        caseNo: caseNo || undefined,
        amount: amount ? Number(amount) : undefined,
        lawyerId: lawyerId || undefined,
      });
      setCaseDialogOpen(false);
      setCaseTitle("");
      setCaseNo("");
      setAmount("");
      setLawyerId("");
      await refresh();
    } catch {
      setError("Dosya oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: LegalCaseStatus) {
    try {
      await setLegalCaseStatus(id, status);
      await refresh();
    } catch {
      setError("Durum güncellenemedi");
    }
  }

  async function openDocs(cs: LegalCase) {
    setDocsCase(cs);
    setDocTitle("");
    setDocUrl("");
    try {
      setDocs(await listLegalDocuments(cs.id));
    } catch {
      setError("Evraklar yüklenemedi");
    }
  }

  async function handleAddDocument(e: FormEvent) {
    e.preventDefault();
    if (!docsCase) return;
    setSubmitting(true);
    try {
      await addLegalDocument(docsCase.id, { title: docTitle, fileUrl: docUrl });
      setDocTitle("");
      setDocUrl("");
      setDocs(await listLegalDocuments(docsCase.id));
    } catch {
      setError("Evrak eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Avukatlar</Typography>
          <Button size="small" variant="contained" onClick={() => setLawyerDialogOpen(true)}>
            Yeni Avukat
          </Button>
        </Box>
        {lawyers.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz avukat kaydı yok.</Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
            {lawyers.map((l) => (
              <Chip key={l.id} label={l.fullName} />
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">İcra / Dava Dosyaları</Typography>
          <Button size="small" variant="contained" onClick={() => setCaseDialogOpen(true)}>
            Yeni Dosya
          </Button>
        </Box>
        {cases.length === 0 ? (
          <Typography color="text.secondary">Henüz dosya yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Başlık</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell>Avukat</TableCell>
                <TableCell>Tutar</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cases.map((cs) => (
                <TableRow key={cs.id}>
                  <TableCell>{cs.title}{cs.caseNo ? ` (${cs.caseNo})` : ""}</TableCell>
                  <TableCell>{TYPE_LABELS[cs.caseType]}</TableCell>
                  <TableCell>{lawyerName_(cs.lawyerId)}</TableCell>
                  <TableCell>{cs.amount != null ? cs.amount.toLocaleString("tr-TR", { style: "currency", currency: "TRY" }) : "-"}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[cs.status]} color={STATUS_COLORS[cs.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button size="small" onClick={() => openDocs(cs)}>Evraklar</Button>
                      {cs.status === "acik" && (
                        <Button size="small" onClick={() => handleStatusChange(cs.id, "devam_ediyor")}>Devam Ediyor</Button>
                      )}
                      {cs.status !== "kapandi" && (
                        <Button size="small" color="success" onClick={() => handleStatusChange(cs.id, "kapandi")}>Kapat</Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={lawyerDialogOpen} onClose={() => setLawyerDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateLawyer}>
          <DialogTitle>Yeni Avukat</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Ad Soyad" value={lawyerName} onChange={(e) => setLawyerName(e.target.value)} required autoFocus fullWidth />
            <TextField label="Telefon" value={lawyerPhone} onChange={(e) => setLawyerPhone(e.target.value)} fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLawyerDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={caseDialogOpen} onClose={() => setCaseDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleCreateCase}>
          <DialogTitle>Yeni İcra / Dava Dosyası</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Tür" value={caseType} onChange={(e) => setCaseType(e.target.value as LegalCaseType)} fullWidth>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Başlık" value={caseTitle} onChange={(e) => setCaseTitle(e.target.value)} required autoFocus fullWidth />
            <TextField label="Dosya No" value={caseNo} onChange={(e) => setCaseNo(e.target.value)} fullWidth />
            <TextField label="Tutar (TL)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} fullWidth />
            <TextField select label="Avukat" value={lawyerId} onChange={(e) => setLawyerId(e.target.value)} fullWidth>
              <MenuItem value="">Seçilmedi</MenuItem>
              {lawyers.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.fullName}</MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCaseDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(docsCase)} onClose={() => setDocsCase(null)} fullWidth maxWidth="sm">
        <DialogTitle>Evraklar — {docsCase?.title}</DialogTitle>
        <DialogContent>
          {docs.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>Henüz evrak yok.</Typography>
          ) : (
            <Box sx={{ mb: 2 }}>
              {docs.map((d) => (
                <Typography key={d.id} variant="body2">
                  <a href={d.fileUrl} target="_blank" rel="noreferrer">{d.title}</a>
                </Typography>
              ))}
            </Box>
          )}
          <Box component="form" onSubmit={handleAddDocument} sx={{ display: "flex", gap: 1 }}>
            <TextField size="small" label="Başlık" value={docTitle} onChange={(e) => setDocTitle(e.target.value)} required />
            <TextField size="small" label="Dosya URL" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} required fullWidth />
            <Button type="submit" variant="contained" disabled={submitting}>Ekle</Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDocsCase(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
