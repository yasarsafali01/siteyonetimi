import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Alert, AppBar, Box, Button, Chip, Toolbar, Typography } from "@mui/material";
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
} from "../api/crm";
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
} from "../types/crm";
import { InlineListManager } from "../components/InlineListManager";

export function PersonDetailPage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();

  const [person, setPerson] = useState<Person | null>(null);
  const [residencies, setResidencies] = useState<UnitResident[]>([]);
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [emergency, setEmergency] = useState<EmergencyContact[]>([]);
  const [vehicleList, setVehicleList] = useState<Vehicle[]>([]);
  const [petList, setPetList] = useState<Pet[]>([]);
  const [poaList, setPoaList] = useState<PowerOfAttorney[]>([]);
  const [history, setHistory] = useState<ContactHistoryEntry[]>([]);
  const [notes, setNotes] = useState<PersonNote[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refreshAll() {
    if (!personId) return;
    try {
      const [p, res, fam, emg, veh, pt, poa, hist, nts] = await Promise.all([
        getPerson(personId),
        listResidencies(personId),
        familyMembers.list(personId),
        emergencyContacts.list(personId),
        vehicles.list(personId),
        pets.list(personId),
        powerOfAttorneys.list(personId),
        listContactHistory(personId),
        listPersonNotes(personId),
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
      setError(null);
    } catch {
      setError("Kişi bilgileri yüklenemedi");
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  if (!personId) return null;

  return (
    <Box>
      <AppBar position="static">
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6">{person ? `${person.firstName} ${person.lastName}` : "Kişi Detayı"}</Typography>
          <Button color="inherit" onClick={() => navigate("/persons")}>
            Kişiler
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 4, maxWidth: 720 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {person && (
          <Box sx={{ mb: 4 }}>
            <Typography color="text.secondary">
              {[person.phone, person.email, person.nationalId].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}
            </Typography>
          </Box>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Bağımsız Bölümler (Malik / Kiracı)
          </Typography>
          {residencies.length === 0 ? (
            <Typography color="text.secondary">Henüz bir bağımsız bölüme bağlanmadı.</Typography>
          ) : (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {residencies.map((r) => (
                <Chip key={r.id} label={`${r.relation === "malik" ? "Malik" : "Kiracı"} · ${r.unitId.slice(0, 8)}`} />
              ))}
            </Box>
          )}
        </Box>

        <InlineListManager<FamilyMember>
          title="Aile Bireyleri"
          items={family}
          getKey={(i) => i.id}
          getPrimary={(i) => i.fullName}
          getSecondary={(i) => [i.relation, i.phone].filter(Boolean).join(" · ") || undefined}
          fields={[
            { name: "fullName", label: "Ad Soyad", required: true },
            { name: "relation", label: "Yakınlık" },
            { name: "phone", label: "Telefon" },
          ]}
          onSubmit={async (v) => {
            await familyMembers.create(personId, v);
            setFamily(await familyMembers.list(personId));
          }}
          onDelete={async (i) => {
            await familyMembers.remove(i.id);
            setFamily(await familyMembers.list(personId));
          }}
        />

        <InlineListManager<EmergencyContact>
          title="Acil Durum Kişileri"
          items={emergency}
          getKey={(i) => i.id}
          getPrimary={(i) => i.fullName}
          getSecondary={(i) => [i.phone, i.relation].filter(Boolean).join(" · ") || undefined}
          fields={[
            { name: "fullName", label: "Ad Soyad", required: true },
            { name: "phone", label: "Telefon", required: true },
            { name: "relation", label: "Yakınlık" },
          ]}
          onSubmit={async (v) => {
            await emergencyContacts.create(personId, v);
            setEmergency(await emergencyContacts.list(personId));
          }}
          onDelete={async (i) => {
            await emergencyContacts.remove(i.id);
            setEmergency(await emergencyContacts.list(personId));
          }}
        />

        <InlineListManager<Vehicle>
          title="Araçlar"
          items={vehicleList}
          getKey={(i) => i.id}
          getPrimary={(i) => i.plate}
          getSecondary={(i) => [i.brand, i.model, i.color].filter(Boolean).join(" · ") || undefined}
          fields={[
            { name: "plate", label: "Plaka", required: true },
            { name: "brand", label: "Marka" },
            { name: "model", label: "Model" },
            { name: "color", label: "Renk" },
          ]}
          onSubmit={async (v) => {
            await vehicles.create(personId, v);
            setVehicleList(await vehicles.list(personId));
          }}
          onDelete={async (i) => {
            await vehicles.remove(i.id);
            setVehicleList(await vehicles.list(personId));
          }}
        />

        <InlineListManager<Pet>
          title="Evcil Hayvanlar"
          items={petList}
          getKey={(i) => i.id}
          getPrimary={(i) => i.name}
          getSecondary={(i) => [i.species, i.breed].filter(Boolean).join(" · ") || undefined}
          fields={[
            { name: "name", label: "Adı", required: true },
            { name: "species", label: "Tür" },
            { name: "breed", label: "Cins" },
          ]}
          onSubmit={async (v) => {
            await pets.create(personId, v);
            setPetList(await pets.list(personId));
          }}
          onDelete={async (i) => {
            await pets.remove(i.id);
            setPetList(await pets.list(personId));
          }}
        />

        <InlineListManager<PowerOfAttorney>
          title="Vekalet Bilgileri"
          items={poaList}
          getKey={(i) => i.id}
          getPrimary={(i) => i.attorneyName}
          getSecondary={(i) => [i.documentNo, i.issuedBy].filter(Boolean).join(" · ") || undefined}
          fields={[
            { name: "attorneyName", label: "Vekil Adı", required: true },
            { name: "documentNo", label: "Belge No" },
            { name: "issuedBy", label: "Veren Makam" },
          ]}
          onSubmit={async (v) => {
            await powerOfAttorneys.create(personId, v);
            setPoaList(await powerOfAttorneys.list(personId));
          }}
          onDelete={async (i) => {
            await powerOfAttorneys.remove(i.id);
            setPoaList(await powerOfAttorneys.list(personId));
          }}
        />

        <InlineListManager<ContactHistoryEntry>
          title="İletişim Geçmişi"
          items={history}
          getKey={(i) => i.id}
          getPrimary={(i) => i.summary}
          getSecondary={(i) => `${i.channel} · ${new Date(i.createdAt).toLocaleString("tr-TR")}`}
          fields={[
            { name: "channel", label: "Kanal (telefon, e-posta, vb.)", required: true },
            { name: "summary", label: "Özet", required: true },
          ]}
          onSubmit={async (v) => {
            await createContactHistory(personId, { channel: v.channel, summary: v.summary });
            setHistory(await listContactHistory(personId));
          }}
        />

        <InlineListManager<PersonNote>
          title="Notlar"
          items={notes}
          getKey={(i) => i.id}
          getPrimary={(i) => i.note}
          getSecondary={(i) => new Date(i.createdAt).toLocaleString("tr-TR")}
          fields={[{ name: "note", label: "Not", required: true }]}
          onSubmit={async (v) => {
            await createPersonNote(personId, v.note);
            setNotes(await listPersonNotes(personId));
          }}
        />
      </Box>
    </Box>
  );
}
