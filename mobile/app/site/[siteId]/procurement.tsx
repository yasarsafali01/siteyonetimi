import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Modal, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { SelectField } from "../../../src/components/ui/SelectField";
import { colors } from "../../../src/theme";
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
} from "../../../src/api/procurement";
import type { PurchaseOrder, PurchaseRequest, PurchaseRequestStatus, Quote, Supplier, SupplierInvoice } from "../../../src/types/procurement";

const STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  taslak: "Taslak",
  onay_bekliyor: "Onay Bekliyor",
  onaylandi: "Onaylandı",
  reddedildi: "Reddedildi",
  siparis_verildi: "Sipariş Verildi",
  tamamlandi: "Tamamlandı",
};

export default function ProcurementScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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
      if (s.length > 0 && !quoteSupplierId) setQuoteSupplierId(s[0].id);
      setError(null);
    } catch {
      setError("Satın alma verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  function supplierName(id: string) {
    return suppliers.find((s) => s.id === id)?.name ?? id.slice(0, 8);
  }

  async function handleCreateSupplier() {
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

  async function handleCreateRequest() {
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

  async function handleAddQuote() {
    if (!detailRequest) return;
    setSubmitting(true);
    try {
      await createQuote(detailRequest.id, { supplierId: quoteSupplierId, amount: Number(quoteAmount) });
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

  async function handleAddInvoice() {
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
    <Screen error={error} onRefresh={() => { setRefreshing(true); refresh(); }} refreshing={refreshing}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tedarikçiler</Text>
        <AppButton small label="Yeni Tedarikçi" onPress={() => setSupDialogOpen(true)} />
      </View>
      {suppliers.length === 0 ? (
        <EmptyState text="Henüz tedarikçi eklenmedi." />
      ) : (
        <View style={styles.chipRow}>
          {suppliers.map((s) => <Chip key={s.id} label={s.name} />)}
        </View>
      )}

      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <Text style={styles.sectionTitle}>Satın Alma Talepleri</Text>
        <AppButton small label="Yeni Talep" onPress={() => setReqDialogOpen(true)} />
      </View>
      {requests.length === 0 ? (
        <EmptyState text="Henüz talep yok." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {requests.map((r) => (
            <ListRow key={r.id} title={r.title} onPress={() => openDetail(r)} right={<Chip label={STATUS_LABELS[r.status]} />} />
          ))}
        </Card>
      )}

      <Text style={styles.sectionTitle}>Siparişler</Text>
      {orders.length === 0 ? (
        <EmptyState text="Henüz sipariş yok." />
      ) : (
        <Card style={{ padding: 0 }}>
          {orders.map((o) => (
            <View key={o.id}>
              <ListRow
                title={supplierName(o.supplierId)}
                subtitle={`${o.amount.toLocaleString("tr-TR")} ₺`}
                right={<Chip label={o.status === "teslim_alindi" ? "Teslim Alındı" : o.status === "olusturuldu" ? "Oluşturuldu" : o.status} />}
              />
              <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingBottom: 10, gap: 4 }}>
                {o.status !== "teslim_alindi" && <AppButton small variant="text" label="Teslim Alındı" onPress={() => handleDeliver(o)} />}
                <AppButton small variant="text" label="Faturalar" onPress={() => openInvoices(o)} />
              </View>
            </View>
          ))}
        </Card>
      )}

      <FormSheet visible={supDialogOpen} title="Yeni Tedarikçi" onClose={() => setSupDialogOpen(false)} onSubmit={handleCreateSupplier} submitting={submitting}>
        <FormField label="Tedarikçi Adı" value={supName} onChangeText={setSupName} autoFocus />
      </FormSheet>

      <FormSheet visible={reqDialogOpen} title="Yeni Satın Alma Talebi" onClose={() => setReqDialogOpen(false)} onSubmit={handleCreateRequest} submitting={submitting}>
        <FormField label="Başlık" value={reqTitle} onChangeText={setReqTitle} autoFocus />
      </FormSheet>

      <Modal visible={Boolean(detailRequest)} animationType="slide" onRequestClose={() => setDetailRequest(null)}>
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <Screen title={detailRequest?.title} action={<AppButton small variant="text" label="Kapat" onPress={() => setDetailRequest(null)} />}>
            {detailRequest && <Chip label={STATUS_LABELS[detailRequest.status]} />}
            <View style={{ flexDirection: "row", gap: 6, marginTop: 12, marginBottom: 16 }}>
              {detailRequest?.status === "taslak" && (
                <AppButton small variant="outlined" label="Onaya Gönder" onPress={() => handleRequestAction("submit")} />
              )}
              {detailRequest?.status === "onay_bekliyor" && (
                <>
                  <AppButton small variant="outlined" label="Onayla" onPress={() => handleRequestAction("approve")} />
                  <AppButton small variant="outlined" color="error" label="Reddet" onPress={() => handleRequestAction("reject")} />
                </>
              )}
            </View>

            <Text style={styles.sectionTitle}>Teklifler</Text>
            {quotes.length === 0 ? (
              <EmptyState text="Henüz teklif yok." />
            ) : (
              quotes.map((q) => (
                <View key={q.id} style={styles.quoteRow}>
                  <Text style={styles.quoteText}>
                    {supplierName(q.supplierId)} — {q.amount.toLocaleString("tr-TR")} ₺ {q.isSelected ? "(Seçildi)" : ""}
                  </Text>
                  {detailRequest?.status === "onaylandi" && !q.isSelected && (
                    <AppButton small variant="text" label="Seç ve Sipariş Ver" onPress={() => handleSelectQuote(q)} />
                  )}
                </View>
              ))
            )}

            {detailRequest?.status === "onaylandi" && (
              <View style={{ marginTop: 12 }}>
                <SelectField label="Tedarikçi" value={quoteSupplierId} onChange={setQuoteSupplierId} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                <FormField label="Tutar" value={quoteAmount} onChangeText={setQuoteAmount} keyboardType="numeric" />
                <AppButton small variant="outlined" label="Teklif Ekle" onPress={handleAddQuote} loading={submitting} />
              </View>
            )}
          </Screen>
        </View>
      </Modal>

      <FormSheet visible={Boolean(invoiceOrder)} title="Fatura Takibi" onClose={() => setInvoiceOrder(null)} onSubmit={handleAddInvoice} submitting={submitting} submitLabel="Ekle">
        {invoices.length === 0 ? (
          <EmptyState text="Henüz fatura yok." />
        ) : (
          invoices.map((inv) => (
            <View key={inv.id} style={styles.quoteRow}>
              <Text style={styles.quoteText}>{inv.amount.toLocaleString("tr-TR")} ₺ — {inv.isPaid ? "Ödendi" : "Ödenmedi"}</Text>
              {!inv.isPaid && <AppButton small variant="text" label="Ödendi İşaretle" onPress={() => handleMarkPaid(inv)} />}
            </View>
          ))
        )}
        <FormField label="Fatura Tutarı" value={invoiceAmount} onChangeText={setInvoiceAmount} keyboardType="numeric" />
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quoteRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  quoteText: { fontSize: 13, color: colors.textPrimary, flex: 1, marginRight: 8 },
});
