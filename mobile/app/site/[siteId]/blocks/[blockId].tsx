import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../../src/components/ui/Screen";
import { Card } from "../../../../src/components/ui/Card";
import { ListRow, EmptyState } from "../../../../src/components/ui/ListRow";
import { Chip } from "../../../../src/components/ui/Chip";
import { AppButton } from "../../../../src/components/ui/AppButton";
import { FormField } from "../../../../src/components/ui/FormField";
import { FormSheet } from "../../../../src/components/ui/FormSheet";
import { SelectField } from "../../../../src/components/ui/SelectField";
import { colors } from "../../../../src/theme";
import { createUnit, listUnits } from "../../../../src/api/sites";
import { createUnitResident, deactivateUnitResident, getPerson, listPersons, listUnitResidents } from "../../../../src/api/crm";
import type { Unit, UnitType } from "../../../../src/types/site";
import type { Person, UnitResident } from "../../../../src/types/crm";

const UNIT_TYPES: { value: UnitType; label: string }[] = [
  { value: "daire", label: "Daire" },
  { value: "dukkan", label: "Dükkan" },
  { value: "ofis", label: "Ofis" },
];

interface ResidentRow extends UnitResident {
  personName: string;
}

export default function BlockUnitsScreen() {
  const { blockId } = useLocalSearchParams<{ siteId: string; blockId: string }>();

  const [units, setUnits] = useState<Unit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [unitNumber, setUnitNumber] = useState("");
  const [floor, setFloor] = useState("");
  const [type, setType] = useState<UnitType>("daire");
  const [grossSqm, setGrossSqm] = useState("");
  const [duesCoefficient, setDuesCoefficient] = useState("1");

  const [residentsUnit, setResidentsUnit] = useState<Unit | null>(null);
  const [residents, setResidents] = useState<ResidentRow[]>([]);
  const [personQuery, setPersonQuery] = useState("");
  const [personOptions, setPersonOptions] = useState<Person[]>([]);
  const [relation, setRelation] = useState<"malik" | "kiraci">("malik");

  async function refresh() {
    if (!blockId) return;
    try {
      setUnits(await listUnits(blockId));
      setError(null);
    } catch {
      setError("Bağımsız bölümler yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refresh(); }, [blockId]));

  async function handleCreate() {
    if (!blockId) return;
    setSubmitting(true);
    try {
      await createUnit(blockId, {
        unitNumber,
        floor: floor ? Number(floor) : undefined,
        type,
        grossSqm: grossSqm ? Number(grossSqm) : undefined,
        duesCoefficient: duesCoefficient ? Number(duesCoefficient) : undefined,
      });
      setDialogOpen(false);
      setUnitNumber("");
      setFloor("");
      setGrossSqm("");
      setDuesCoefficient("1");
      await refresh();
    } catch {
      setError("Bağımsız bölüm oluşturulamadı");
    } finally {
      setSubmitting(false);
    }
  }

  async function openResidents(unit: Unit) {
    setResidentsUnit(unit);
    setPersonQuery("");
    setPersonOptions([]);
    await refreshResidents(unit.id);
  }

  async function refreshResidents(unitId: string) {
    const list = await listUnitResidents(unitId);
    const enriched = await Promise.all(
      list.map(async (r) => {
        try {
          const p = await getPerson(r.personId);
          return { ...r, personName: `${p.firstName} ${p.lastName}` };
        } catch {
          return { ...r, personName: "Bilinmiyor" };
        }
      }),
    );
    setResidents(enriched);
  }

  async function handlePersonSearch(query: string) {
    setPersonQuery(query);
    if (!query) {
      setPersonOptions([]);
      return;
    }
    setPersonOptions(await listPersons(query));
  }

  async function handleAddResident(person: Person) {
    if (!residentsUnit) return;
    await createUnitResident(residentsUnit.id, { personId: person.id, relation });
    setPersonQuery("");
    setPersonOptions([]);
    await refreshResidents(residentsUnit.id);
  }

  async function handleRemoveResident(id: string) {
    if (!residentsUnit) return;
    await deactivateUnitResident(id);
    await refreshResidents(residentsUnit.id);
  }

  return (
    <Screen
      title="Bağımsız Bölüm Listesi"
      action={<AppButton small label="Yeni Bölüm" onPress={() => setDialogOpen(true)} />}
      error={error}
      onRefresh={() => { setRefreshing(true); refresh(); }}
      refreshing={refreshing}
    >
      {units.length === 0 ? (
        <EmptyState text="Henüz bağımsız bölüm eklenmedi." />
      ) : (
        <Card style={{ padding: 0 }}>
          {units.map((unit) => (
            <ListRow
              key={unit.id}
              title={unit.unitNumber}
              subtitle={`${UNIT_TYPES.find((t) => t.value === unit.type)?.label ?? unit.type}${unit.floor != null ? ` · Kat ${unit.floor}` : ""} · Katsayı ${unit.duesCoefficient}`}
              onPress={() => openResidents(unit)}
            />
          ))}
        </Card>
      )}

      <FormSheet visible={dialogOpen} title="Yeni Bağımsız Bölüm" onClose={() => setDialogOpen(false)} onSubmit={handleCreate} submitting={submitting}>
        <FormField label="Bağımsız Bölüm No" value={unitNumber} onChangeText={setUnitNumber} autoFocus />
        <FormField label="Kat" value={floor} onChangeText={setFloor} keyboardType="numeric" />
        <SelectField label="Tür" value={type} onChange={(v) => setType(v as UnitType)} options={UNIT_TYPES} />
        <FormField label="Brüt m²" value={grossSqm} onChangeText={setGrossSqm} keyboardType="numeric" />
        <FormField label="Aidat Katsayısı" value={duesCoefficient} onChangeText={setDuesCoefficient} keyboardType="numeric" />
      </FormSheet>

      <FormSheet
        visible={Boolean(residentsUnit)}
        title={`${residentsUnit?.unitNumber ?? ""} No'lu Bölüm — Sakinler`}
        onClose={() => setResidentsUnit(null)}
        onSubmit={() => setResidentsUnit(null)}
        submitLabel="Kapat"
      >
        {residents.length === 0 ? (
          <EmptyState text="Henüz sakin atanmadı." />
        ) : (
          <View style={styles.chipRow}>
            {residents.map((r) => (
              <View key={r.id} style={styles.residentChip}>
                <Chip label={`${r.relation === "malik" ? "Malik" : "Kiracı"}: ${r.personName}`} />
                <AppButton small variant="text" color="error" label="Kaldır" onPress={() => handleRemoveResident(r.id)} />
              </View>
            ))}
          </View>
        )}

        <FormField label="Kişi Ara (ad/soyad)" value={personQuery} onChangeText={handlePersonSearch} />
        <SelectField label="İlişki" value={relation} onChange={(v) => setRelation(v as "malik" | "kiraci")} options={[{ value: "malik", label: "Malik" }, { value: "kiraci", label: "Kiracı" }]} />
        {personOptions.length > 0 && (
          <Card style={{ padding: 0, marginBottom: 12 }}>
            {personOptions.map((p) => (
              <ListRow key={p.id} title={`${p.firstName} ${p.lastName}`} onPress={() => handleAddResident(p)} />
            ))}
          </Card>
        )}
      </FormSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { marginBottom: 12, gap: 8 },
  residentChip: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
