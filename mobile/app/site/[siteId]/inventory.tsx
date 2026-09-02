import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Card } from "../../../src/components/ui/Card";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { ListRow, EmptyState } from "../../../src/components/ui/ListRow";
import { colors } from "../../../src/theme";
import { assignAsset, createAsset, createCount, getDepreciation, listAssets, listCounts, returnAsset } from "../../../src/api/inventory";
import { getCurrentUserId } from "../../../src/api/client";
import type { Asset, AssetCount, AssetStatus, Depreciation } from "../../../src/types/inventory";

const STATUS_LABELS: Record<AssetStatus, string> = { depoda: "Depoda", zimmetli: "Zimmetli", hurda: "Hurda", kayip: "Kayıp" };
const STATUS_TONE: Record<AssetStatus, "default" | "info" | "error" | "warning"> = { depoda: "default", zimmetli: "info", hurda: "error", kayip: "warning" };

export default function InventoryScreen() {
  const { siteId } = useLocalSearchParams<{ siteId: string }>();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [counts, setCounts] = useState<AssetCount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [serialNo, setSerialNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [usefulLifeYears, setUsefulLifeYears] = useState("");

  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  const [depreciation, setDepreciation] = useState<Depreciation | null>(null);

  async function refresh() {
    if (!siteId) return;
    try {
      const [a, c] = await Promise.all([listAssets(siteId), listCounts(siteId)]);
      setAssets(a);
      setCounts(c);
      setError(null);
    } catch {
      setError("Demirbaş verileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [siteId]));

  async function handleCreate() {
    if (!siteId) return;
    setSubmitting(true);
    try {
      await createAsset(siteId, {
        name,
        serialNo: serialNo || undefined,
        purchaseDate: purchaseDate || undefined,
        purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
        usefulLifeYears: usefulLifeYears ? Number(usefulLifeYears) : undefined,
      });
      setCreateOpen(false);
      setName("");
      setSerialNo("");
      setPurchaseDate("");
      setPurchasePrice("");
      setUsefulLifeYears("");
      await refresh();
    } catch {
      setError("Demirbaş oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(asset: Asset) {
    setDetailAsset(asset);
    try {
      setDepreciation(await getDepreciation(asset.id));
    } catch {
      setDepreciation(null);
    }
  }

  async function handleAssignToMe(asset: Asset) {
    const uid = await getCurrentUserId();
    if (!uid) return;
    try {
      await assignAsset(asset.id, uid, "Bana zimmetlendi");
      await refresh();
      setDetailAsset(null);
    } catch {
      setError("Zimmet işlemi yapılamadı");
    }
  }

  async function handleReturn(asset: Asset) {
    try {
      await returnAsset(asset.id);
      await refresh();
      setDetailAsset(null);
    } catch {
      setError("İade işlemi yapılamadı");
    }
  }

  async function handleCreateCount() {
    if (!siteId) return;
    try {
      await createCount(siteId, "Sayım");
      await refresh();
    } catch {
      setError("Sayım oluşturulamadı");
    }
  }

  return (
    <Screen
      title="Demirbaş ve Envanter"
      action={<AppButton small label="Yeni Demirbaş" onPress={() => setCreateOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {assets.length === 0 ? (
        <EmptyState text="Henüz demirbaş eklenmedi." />
      ) : (
        <Card style={{ padding: 0, marginBottom: 20 }}>
          {assets.map((a) => (
            <ListRow
              key={a.id}
              title={a.name}
              subtitle={a.serialNo ?? undefined}
              right={<Chip label={STATUS_LABELS[a.status]} tone={STATUS_TONE[a.status]} />}
              onPress={() => openDetail(a)}
            />
          ))}
        </Card>
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary }}>Sayım İşlemleri</Text>
        <AppButton small label="Yeni Sayım" onPress={handleCreateCount} />
      </View>
      {counts.length === 0 ? (
        <EmptyState text="Henüz sayım yapılmadı." />
      ) : (
        counts.map((c) => (
          <Text key={c.id} style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
            {new Date(c.countDate).toLocaleDateString("tr-TR")} {c.note ? `— ${c.note}` : ""}
          </Text>
        ))
      )}

      <FormSheet visible={createOpen} title="Yeni Demirbaş" onClose={() => setCreateOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Ad" value={name} onChangeText={setName} autoFocus />
        <FormField label="Seri No" value={serialNo} onChangeText={setSerialNo} />
        <FormField label="Satın Alma Tarihi (YYYY-MM-DD)" value={purchaseDate} onChangeText={setPurchaseDate} />
        <FormField label="Satın Alma Fiyatı" value={purchasePrice} onChangeText={setPurchasePrice} keyboardType="numeric" />
        <FormField label="Faydalı Ömür (yıl)" value={usefulLifeYears} onChangeText={setUsefulLifeYears} keyboardType="numeric" />
      </FormSheet>

      <FormSheet
        visible={Boolean(detailAsset)}
        title={detailAsset?.name ?? ""}
        onClose={() => setDetailAsset(null)}
        onSubmit={() => (detailAsset?.status !== "zimmetli" ? detailAsset && handleAssignToMe(detailAsset) : detailAsset && handleReturn(detailAsset))}
        submitLabel={detailAsset?.status !== "zimmetli" ? "Bana Zimmetle" : "İade Al"}
      >
        {detailAsset && <Chip label={STATUS_LABELS[detailAsset.status]} tone={STATUS_TONE[detailAsset.status]} />}
        {depreciation && depreciation.purchasePrice > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 13, marginBottom: 4 }}>Yıllık amortisman: {depreciation.annualAmount.toLocaleString("tr-TR")} ₺</Text>
            <Text style={{ fontSize: 13, marginBottom: 4 }}>Birikmiş amortisman: {depreciation.accumulatedAmount.toLocaleString("tr-TR")} ₺</Text>
            <Text style={{ fontSize: 13 }}>Net defter değeri: {depreciation.bookValue.toLocaleString("tr-TR")} ₺</Text>
          </View>
        )}
      </FormSheet>
    </Screen>
  );
}
