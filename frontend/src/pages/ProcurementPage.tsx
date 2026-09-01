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
  approveRequest,
  createInvoice,
  createQuote,
  createRequest,
  createSupplier,
  listInvoices,
  listOrders,
  listQuotes,
  listRequests,
  listSuppliers,
  markDelivered,
  markInvoicePaid,
  rejectRequest,
  selectQuote,
  submitRequest,
} from "../api/procurement";
import type {
  PurchaseOrder,
  PurchaseRequest,
  PurchaseRequestStatus,
  Quote,
  Supplier,
  SupplierInvoice,
} from "../types/procurement";

const STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  taslak: "Taslak",
  onay_bekliyor: "Onay Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  siparis_verildi: "Sipariş Verildi",
  tamamlandi: "Tamamlandı",
};

export function ProcurementPage() {
  const { siteId } = useParams<{ siteId: string }>();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [supDialogOpen, setSupDialogOpen] = useState(false);
  const [supName, setSupName] = useState("");

  const [reqDialogOpen, setReqDialogOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState("");

  const [detailRequest, setDetailRequest] = useState<PurchaseRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteSupplierId, setQuoteSupplierId] = useState("");
  const [quoteAmount, setQuoteAmount] = useState("");

  const [invoiceOrder, setInvoiceOrder] = useState<PurchaseOrder | null>(null);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [invoiceAmount, setInvoiceAmount] = useState("");

  async function refresh() {
    if (!siteId) return;
    try {
      const [s, r, o] = await Promise.all([listSuppliers(siteId), listRequests(siteId), listOrders(siteId)]);
      setSuppliers(s);
      setRequests(r);
      setOrders(o);
      setError(null);
    } catch {
      setError("Satın alma verileri yüklenemedi");
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  function supplierName(id: string) {
    return suppliers.find((s) => s.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreateSupplier(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createSupplier(siteId, { name: supName });
      setSupDialogOpen(false);
      setSupName("");
      await refresh();
    } catch {
      setError("Tedarikçi oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateRequest(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createRequest(siteId, { title: reqTitle });
      setReqDialogOpen(false);
      setReqTitle("");
      await refresh();
    } catch {
      setError("Talep oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(r: PurchaseRequest) {
    setDetailRequest(r);
    setQuotes(await listQuotes(r.id));
  }

  async function handleRequestAction(action: "submit" | "approve" | "reject") {
    if (!detailRequest) return;
    const fn = action === "submit" ? submitRequest : action === "approve" ? approveRequest : rejectRequest;
    const updated = await fn(detailRequest.id);
    setDetailRequest(updated);
    await refresh();
  }

  async function handleAddQuote(e: FormEvent) {
    e.preventDefault();
    if (!detailRequest) return;
    setSubmitting(true);
    try {
      await createQuote(detailRequest.id, { supplierId: quoteSupplierId, amount: Number(quoteAmount) });
      setQuoteSupplierId("");
      setQuoteAmount("");
      setQuotes(await listQuotes(detailRequest.id));
    } catch {
      setError("Teklif eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSelectQuote(quote: Quote) {
    if (!detailRequest) return;
    try {
      await selectQuote(detailRequest.id, quote.id);
      setQuotes(await listQuotes(detailRequest.id));
      await refresh();
      setDetailRequest(null);
    } catch {
      setError("Teklif seçilemedi");
    }
  }

  async function handleDeliver(order: PurchaseOrder) {
    try {
      await markDelivered(order.id);
      await refresh();
    } catch {
      setError("Teslim alma işlemi yapılamadı");
    }
  }

  async function openInvoices(order: PurchaseOrder) {
    setInvoiceOrder(order);
    setInvoices(await listInvoices(order.id));
  }

  async function handleAddInvoice(e: FormEvent) {
    e.preventDefault();
    if (!invoiceOrder) return;
    setSubmitting(true);
    try {
      await createInvoice(invoiceOrder.id, { amount: Number(invoiceAmount), invoiceDate: new Date().toISOString().slice(0, 10) });
      setInvoiceAmount("");
      setInvoices(await listInvoices(invoiceOrder.id));
    } catch {
      setError("Fatura eklenemedi");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkPaid(invoice: SupplierInvoice) {
    try {
      await markInvoicePaid(invoice.id);
      if (invoiceOrder) setInvoices(await listInvoices(invoiceOrder.id));
    } catch {
      setError("Ödendi işaretlenemedi");
    }
  }

  return (
    <Box>
      <Box sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Tedarikçiler</Typography>
          <Button size="small" variant="contained" onClick={() => setSupDialogOpen(true)}>
            Yeni Tedarikçi
          </Button>
        </Box>
        {suppliers.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz tedarikçi eklenmedi.</Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
            {suppliers.map((s) => (
              <Chip key={s.id} label={s.name} />
            ))}
          </Box>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Typography variant="h6">Satın Alma Talepleri</Typography>
          <Button size="small" variant="contained" onClick={() => setReqDialogOpen(true)}>
            Yeni Talep
          </Button>
        </Box>
        {requests.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 4 }}>Henüz talep yok.</Typography>
        ) : (
          <Table size="small" sx={{ mb: 4 }}>
            <TableHead>
              <TableRow>
                <TableCell>Başlık</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{STATUS_LABELS[r.status]}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openDetail(r)}>
                      Detay
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Typography variant="h6" sx={{ mb: 1 }}>Siparişler</Typography>
        {orders.length === 0 ? (
          <Typography color="text.secondary">Henüz sipariş yok.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tedarikçi</TableCell>
                <TableCell>Tutar</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{supplierName(o.supplierId)}</TableCell>
                  <TableCell>{o.amount.toLocaleString("tr-TR")} ₺</TableCell>
                  <TableCell>{o.status === "teslim_alindi" ? "Teslim Alındı" : o.status === "olusturuldu" ? "Oluşturuldu" : o.status}</TableCell>
                  <TableCell>
                    {o.status !== "teslim_alindi" && (
                      <Button size="small" onClick={() => handleDeliver(o)}>
                        Teslim Alındı
                      </Button>
                    )}
                    <Button size="small" onClick={() => openInvoices(o)}>
                      Faturalar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      <Dialog open={supDialogOpen} onClose={() => setSupDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateSupplier}>
          <DialogTitle>Yeni Tedarikçi</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField label="Tedarikçi Adı" value={supName} onChange={(e) => setSupName(e.target.value)} required autoFocus fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSupDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={reqDialogOpen} onClose={() => setReqDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateRequest}>
          <DialogTitle>Yeni Satın Alma Talebi</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <TextField label="Başlık" value={reqTitle} onChange={(e) => setReqTitle(e.target.value)} required autoFocus fullWidth />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReqDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Kaydet</Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(detailRequest)} onClose={() => setDetailRequest(null)} fullWidth maxWidth="sm">
        <DialogTitle>{detailRequest?.title}</DialogTitle>
        <DialogContent>
          {detailRequest && (
            <Chip label={STATUS_LABELS[detailRequest.status]} size="small" sx={{ mb: 2 }} />
          )}
          <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
            {detailRequest?.status === "taslak" && (
              <Button size="small" variant="outlined" onClick={() => handleRequestAction("submit")}>
                Onaya Gönder
              </Button>
            )}
            {detailRequest?.status === "onay_bekliyor" && (
              <>
                <Button size="small" variant="outlined" onClick={() => handleRequestAction("approve")}>
                  Onayla
                </Button>
                <Button size="small" variant="outlined" color="error" onClick={() => handleRequestAction("reject")}>
                  Reddet
                </Button>
              </>
            )}
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Teklifler</Typography>
          {quotes.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>Henüz teklif yok.</Typography>
          ) : (
            quotes.map((q) => (
              <Box key={q.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="body2">
                  {supplierName(q.supplierId)} — {q.amount.toLocaleString("tr-TR")} ₺ {q.isSelected ? "(Seçildi)" : ""}
                </Typography>
                {detailRequest?.status === "onaylandi" && !q.isSelected && (
                  <Button size="small" onClick={() => handleSelectQuote(q)}>
                    Seç ve Sipariş Ver
                  </Button>
                )}
              </Box>
            ))
          )}

          {detailRequest?.status === "onaylandi" && (
            <Box component="form" onSubmit={handleAddQuote} sx={{ display: "flex", gap: 1, mt: 2 }}>
              <TextField select size="small" label="Tedarikçi" value={quoteSupplierId} onChange={(e) => setQuoteSupplierId(e.target.value)} sx={{ minWidth: 140 }} required>
                {suppliers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField size="small" type="number" label="Tutar" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} required />
              <Button type="submit" size="small" variant="outlined" disabled={submitting}>
                Teklif Ekle
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailRequest(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(invoiceOrder)} onClose={() => setInvoiceOrder(null)} fullWidth maxWidth="xs">
        <DialogTitle>Fatura Takibi</DialogTitle>
        <DialogContent>
          {invoices.length === 0 ? (
            <Typography color="text.secondary" sx={{ mb: 2 }}>Henüz fatura yok.</Typography>
          ) : (
            invoices.map((inv) => (
              <Box key={inv.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="body2">
                  {inv.amount.toLocaleString("tr-TR")} ₺ — {inv.isPaid ? "Ödendi" : "Ödenmedi"}
                </Typography>
                {!inv.isPaid && (
                  <Button size="small" onClick={() => handleMarkPaid(inv)}>
                    Ödendi İşaretle
                  </Button>
                )}
              </Box>
            ))
          )}
          <Box component="form" onSubmit={handleAddInvoice} sx={{ display: "flex", gap: 1, mt: 2 }}>
            <TextField size="small" type="number" label="Fatura Tutarı" value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} required />
            <Button type="submit" size="small" variant="outlined" disabled={submitting}>
              Ekle
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvoiceOrder(null)}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
