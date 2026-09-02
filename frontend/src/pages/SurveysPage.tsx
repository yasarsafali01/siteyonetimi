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
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  activateSurvey,
  closeSurvey,
  createSurvey,
  getSurveyResults,
  listSurveyOptions,
  listSurveys,
  vote,
} from "../api/survey";
import type { Survey, SurveyOption, SurveyOptionResult, SurveyStatus, SurveyType } from "../types/survey";

const TYPE_LABELS: Record<SurveyType, string> = { anket: "Anket", genel_kurul_oylamasi: "Genel Kurul Oylaması" };
const STATUS_LABELS: Record<SurveyStatus, string> = { taslak: "Taslak", aktif: "Aktif", kapali: "Kapalı" };
const STATUS_COLORS: Record<SurveyStatus, "default" | "success" | "warning"> = { taslak: "default", aktif: "success", kapali: "warning" };

export function SurveysPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SurveyType>("anket");
  const [options, setOptions] = useState<string[]>(["", ""]);

  const [voteSurvey, setVoteSurvey] = useState<Survey | null>(null);
  const [voteOptions, setVoteOptions] = useState<SurveyOption[]>([]);
  const [voteOptionId, setVoteOptionId] = useState("");
  const [voteUnitId, setVoteUnitId] = useState("");

  const [resultsSurvey, setResultsSurvey] = useState<Survey | null>(null);
  const [results, setResults] = useState<SurveyOptionResult[]>([]);

  async function refresh() {
    if (!siteId) return;
    try {
      setSurveys(await listSurveys(siteId));
      setError(null);
    } catch {
      setError("Anketler yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function removeOption(index: number) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createSurvey(siteId, { title, description: description || undefined, type, options: options.filter((o) => o.trim()) });
      setDialogOpen(false);
      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      await refresh();
    } catch {
      setError("Anket oluşturulamadı — en az iki seçenek girin");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleActivate(id: string) {
    try {
      await activateSurvey(id);
      await refresh();
    } catch {
      setError("Anket aktifleştirilemedi");
    }
  }

  async function handleClose(id: string) {
    try {
      await closeSurvey(id);
      await refresh();
    } catch {
      setError("Anket kapatılamadı");
    }
  }

  async function openVoteDialog(sv: Survey) {
    setVoteSurvey(sv);
    setVoteOptionId("");
    setVoteUnitId("");
    try {
      setVoteOptions(await listSurveyOptions(sv.id));
    } catch {
      setError("Seçenekler yüklenemedi");
    }
  }

  async function handleVote(e: FormEvent) {
    e.preventDefault();
    if (!voteSurvey) return;
    setSubmitting(true);
    try {
      await vote(voteSurvey.id, voteOptionId, voteUnitId);
      setVoteSurvey(null);
    } catch {
      setError("Oy kullanılamadı — bu birim daha önce oy kullanmış olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  async function openResults(sv: Survey) {
    setResultsSurvey(sv);
    try {
      setResults(await getSurveyResults(sv.id));
    } catch {
      setError("Sonuçlar yüklenemedi");
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6">Anket ve Oylama</Typography>
          <Button size="small" variant="contained" onClick={() => setDialogOpen(true)}>
            Yeni Anket
          </Button>
        </Box>

        {surveys.length === 0 ? (
          <Typography color="text.secondary">Henüz anket yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Başlık</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {surveys.map((sv) => (
                <TableRow key={sv.id}>
                  <TableCell>{sv.title}</TableCell>
                  <TableCell>{TYPE_LABELS[sv.type]}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[sv.status]} color={STATUS_COLORS[sv.status]} size="small" />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {sv.status === "taslak" && (
                        <Button size="small" onClick={() => handleActivate(sv.id)}>Aktifleştir</Button>
                      )}
                      {sv.status === "aktif" && (
                        <>
                          <Button size="small" onClick={() => openVoteDialog(sv)}>Oy Kullan</Button>
                          <Button size="small" color="warning" onClick={() => handleClose(sv.id)}>Kapat</Button>
                        </>
                      )}
                      <Button size="small" onClick={() => openResults(sv)}>Sonuçlar</Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <Box component="form" onSubmit={handleCreate}>
          <DialogTitle>Yeni Anket</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus fullWidth />
            <TextField label="Açıklama" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} fullWidth />
            <TextField select label="Tür" value={type} onChange={(e) => setType(e.target.value as SurveyType)} fullWidth>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
            <Typography variant="subtitle2">Seçenekler</Typography>
            {options.map((opt, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  label={`Seçenek ${i + 1}`}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  fullWidth
                  size="small"
                />
                {options.length > 2 && (
                  <IconButton size="small" onClick={() => removeOption(i)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button size="small" onClick={() => setOptions((prev) => [...prev, ""])}>Seçenek Ekle</Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(voteSurvey)} onClose={() => setVoteSurvey(null)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleVote}>
          <DialogTitle>Oy Kullan — {voteSurvey?.title}</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField select label="Seçenek" value={voteOptionId} onChange={(e) => setVoteOptionId(e.target.value)} required fullWidth>
              {voteOptions.map((o) => (
                <MenuItem key={o.id} value={o.id}>{o.optionText}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Bağımsız Bölüm (Unit) ID"
              value={voteUnitId}
              onChange={(e) => setVoteUnitId(e.target.value)}
              required
              fullWidth
              helperText="Bir birim bir ankette yalnızca bir kez oy kullanabilir"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setVoteSurvey(null)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Oy Ver</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(resultsSurvey)} onClose={() => setResultsSurvey(null)} fullWidth maxWidth="xs">
        <DialogTitle>Sonuçlar — {resultsSurvey?.title}</DialogTitle>
        <DialogContent>
          {results.length === 0 ? (
            <Typography color="text.secondary">Henüz oy yok.</Typography>
          ) : (
            results.map((r) => (
              <Box key={r.optionId} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                <Typography variant="body2">{r.optionText}</Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold" }}>{r.voteCount}</Typography>
              </Box>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultsSurvey(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
