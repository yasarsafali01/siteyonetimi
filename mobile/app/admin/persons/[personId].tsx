import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Screen } from "../../../src/components/ui/Screen";
import { Chip } from "../../../src/components/ui/Chip";
import { AppButton } from "../../../src/components/ui/AppButton";
import { FormField } from "../../../src/components/ui/FormField";
import { FormSheet } from "../../../src/components/ui/FormSheet";
import { SegmentedTabs } from "../../../src/components/ui/SegmentedTabs";
import { InlineListManager } from "../../../src/components/ui/InlineListManager";
import { colors } from "../../../src/theme";
import {
  createContactHistory,
  createPersonNote,
  emergencyContacts,
  familyMembers,
  getPerson,
  listContactHistory,
  listPersonNotes,
  listResidencies,
  pets,
  powerOfAttorneys,
  vehicles,
} from "../../../src/api/crm";
import { getPersonBalance } from "../../../src/api/finance";
import { createUser, listUsers } from "../../../src/api/users";
import type { UnitBalance } from "../../../src/types/finance";
import type {
  ContactHistoryEntry,
  EmergencyContact,
  FamilyMember,
  Person,
  Pet,
  PowerOfAttorney,
  UnitResident,
  Vehicle,
  PersonNote,
} from "../../../src/types/crm";
import type { AppUser } from "../../../src/types/user";

const TABS = ["Genel", "Aile & Acil Durum", "Araç & Hayvan", "Vekalet", "İletişim & Not"];

export default function PersonDetailScreen() {
  const { personId } = useLocalSearchParams<{ personId: string }>();

  const [person, setPerson] = useState<Person | null>(null);
  const [residencies, setResidencies] = useState<UnitResident[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [emergency, setEmergency] = useState<EmergencyContact[]>([]);
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [petList, setPetList] = useState<Pet[]>([]);
  const [poaList, setPoaList] = useState<PowerOfAttorney[]>([]);
  const [history, setHistory] = useState<ContactHistoryEntry[]>([]);
  const [notes, setNotes] = useState<PersonNote[]>([]);
  const [balance, setBalance] = useState<UnitBalance | null>(null);
  const [loginUser, setLoginUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState(0);

  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refreshAll() {
    if (!personId) return;
    try {
      const [p, res, fam, emg, veh, pt, poa, hist, nts, bal, users] = await Promise.all([
        getPerson(personId),
        listResidencies(personId),
        familyMembers.list(personId),
        emergencyContacts.list(personId),
        vehicles.list(personId),
        pets.list(personId),
        powerOfAttorneys.list(personId),
        listContactHistory(personId),
        listPersonNotes(personId),
        getPersonBalance(personId),
        listUsers(),
      ]);
      setPerson(p);
      setResidencies(res);
      setFamily(fam);
      setEmergency(emg);
      setVehicleList(veh);
      setPetList(pt);
      setPoaList(poa);
      setHistory(hist);
      setNotes(nts);
      setBalance(bal);
      setLoginUser(users.find((u) => u.personId === personId) ?? null);
      setError(null);
    } catch {
      setError("Kişi bilgileri yüklenemedi");
    } finally {
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { refreshAll(); }, [personId]));

  async function handleCreateLogin() {
    if (!personId) return;
    setSubmitting(true);
    try {
      await createUser({
        email: loginEmail,
        password: loginPassword,
        fullName: person ? `${person.firstName} ${person.lastName}` : loginEmail,
        userType: "sakin",
        personId,
      });
      setLoginDialogOpen(false);
      setLoginEmail("");
      setLoginPassword("");
      await refreshAll();
    } catch {
      setError("Giriş hesabı oluşturulamadı — e-posta zaten kullanılıyor olabilir");
    } finally {
      setSubmitting(false);
    }
  }

  if (!personId) return null;

  return (
    <Screen
      title={person ? `${person.firstName} ${person.lastName}` : "Kişi Detayı"}
      error={error}
      onRefresh={() => { setRefreshing(true); refreshAll(); }}
      refreshing={refreshing}
    >
      {person && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
            {[person.phone, person.email, person.nationalId].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {balance && (
              <Chip
                label={`Kalan Bakiye: ${balance.remainingAmount.toLocaleString("tr-TR")} ₺`}
                tone={balance.remainingAmount > 0 ? "warning" : "success"}
              />
            )}
            {loginUser ? (
              <Chip label={`Giriş: ${loginUser.email}`} tone="info" />
            ) : (
              <AppButton small variant="outlined" label="Sakin Girişi Oluştur" onPress={() => setLoginDialogOpen(true)} />
            )}
          </View>
        </View>
      )}

      <SegmentedTabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 0 && (
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 }}>
            Bağımsız Bölümler (Malik / Kiracı)
          </Text>
          {residencies.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>Henüz bir bağımsız bölüme bağlanmadı.</Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {residencies.map((r) => (
                <Chip key={r.id} label={`${r.relation === "malik" ? "Malik" : "Kiracı"} · ${r.unitId.slice(0, 8)}`} tone="primary" />
              ))}
            </View>
          )}
        </View>
      )}

      {tab === 1 && (
        <>
          <InlineListManager<FamilyMember>
            title="Aile Bireyleri"
            items={family}
            getKey={(i) => i.id}
            getPrimary={(i) => i.fullName}
            getSecondary={(i) => [i.relation, i.phone].filter(Boolean).join(" · ") || undefined}
            fields={[{ name: "fullName", label: "Ad Soyad", required: true }, { name: "relation", label: "Yakınlık" }, { name: "phone", label: "Telefon" }]}
            onSubmit={async (v) => { await familyMembers.create(personId, v); setFamily(await familyMembers.list(personId)); }}
            onDelete={async (i) => { await familyMembers.remove(i.id); setFamily(await familyMembers.list(personId)); }}
          />
          <InlineListManager<EmergencyContact>
            title="Acil Durum Kişileri"
            items={emergency}
            getKey={(i) => i.id}
            getPrimary={(i) => i.fullName}
            getSecondary={(i) => [i.phone, i.relation].filter(Boolean).join(" · ") || undefined}
            fields={[{ name: "fullName", label: "Ad Soyad", required: true }, { name: "phone", label: "Telefon", required: true }, { name: "relation", label: "Yakınlık" }]}
            onSubmit={async (v) => { await emergencyContacts.create(personId, v); setEmergency(await emergencyContacts.list(personId)); }}
            onDelete={async (i) => { await emergencyContacts.remove(i.id); setEmergency(await emergencyContacts.list(personId)); }}
          />
        </>
      )}

      {tab === 2 && (
        <>
          <InlineListManager<Vehicle>
            title="Araçlar"
            items={vehicleList}
            getKey={(i) => i.id}
            getPrimary={(i) => i.plate}
            getSecondary={(i) => [i.brand, i.model, i.color].filter(Boolean).join(" · ") || undefined}
            fields={[{ name: "plate", label: "Plaka", required: true }, { name: "brand", label: "Marka" }, { name: "model", label: "Model" }, { name: "color", label: "Renk" }]}
            onSubmit={async (v) => { await vehicles.create(personId, v); setVehicleList(await vehicles.list(personId)); }}
            onDelete={async (i) => { await vehicles.remove(i.id); setVehicleList(await vehicles.list(personId)); }}
          />
          <InlineListManager<Pet>
            title="Evcil Hayvanlar"
            items={petList}
            getKey={(i) => i.id}
            getPrimary={(i) => i.name}
            getSecondary={(i) => [i.species, i.breed].filter(Boolean).join(" · ") || undefined}
            fields={[{ name: "name", label: "Adı", required: true }, { name: "species", label: "Tür" }, { name: "breed", label: "Cins" }]}
            onSubmit={async (v) => { await pets.create(personId, v); setPetList(await pets.list(personId)); }}
            onDelete={async (i) => { await pets.remove(i.id); setPetList(await pets.list(personId)); }}
          />
        </>
      )}

      {tab === 3 && (
        <InlineListManager<PowerOfAttorney>
          title="Vekalet Bilgileri"
          items={poaList}
          getKey={(i) => i.id}
          getPrimary={(i) => i.attorneyName}
          getSecondary={(i) => [i.documentNo, i.issuedBy].filter(Boolean).join(" · ") || undefined}
          fields={[{ name: "attorneyName", label: "Vekil Adı", required: true }, { name: "documentNo", label: "Belge No" }, { name: "issuedBy", label: "Veren Makam" }]}
          onSubmit={async (v) => { await powerOfAttorneys.create(personId, v); setPoaList(await powerOfAttorneys.list(personId)); }}
          onDelete={async (i) => { await powerOfAttorneys.remove(i.id); setPoaList(await powerOfAttorneys.list(personId)); }}
        />
      )}

      {tab === 4 && (
        <>
          <InlineListManager<ContactHistoryEntry>
            title="İletişim Geçmişi"
            items={history}
            getKey={(i) => i.id}
            getPrimary={(i) => i.summary}
            getSecondary={(i) => `${i.channel} · ${new Date(i.createdAt).toLocaleString("tr-TR")}`}
            fields={[{ name: "channel", label: "Kanal", required: true }, { name: "summary", label: "Özet", required: true }]}
            onSubmit={async (v) => { await createContactHistory(personId, { channel: v.channel, summary: v.summary }); setHistory(await listContactHistory(personId)); }}
          />
          <InlineListManager<PersonNote>
            title="Notlar"
            items={notes}
            getKey={(i) => i.id}
            getPrimary={(i) => i.note}
            getSecondary={(i) => new Date(i.createdAt).toLocaleString("tr-TR")}
            fields={[{ name: "note", label: "Not", required: true }]}
            onSubmit={async (v) => { await createPersonNote(personId, v.note); setNotes(await listPersonNotes(personId)); }}
          />
        </>
      )}

      <FormSheet visible={loginDialogOpen} title="Sakin Giriş Hesabı Oluştur" onClose={() => setLoginDialogOpen(false)} onSubmit={handleCreateLogin} submitting={submitting} submitLabel="Oluştur">
        <FormField label="E-posta" value={loginEmail} onChangeText={setLoginEmail} autoCapitalize="none" keyboardType="email-address" autoFocus />
        <FormField label="Şifre" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry helperText="En az 8 karakter" />
      </FormSheet>
    </Screen>
  );
}
