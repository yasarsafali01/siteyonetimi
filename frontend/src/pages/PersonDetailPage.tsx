import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
import { getPersonBalance } from "../api/finance";
import { createUser, listUsers } from "../api/users";
import type { UnitBalance } from "../types/finance";
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
import type { AppUser } from "../types/user";
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
  const [balance, setBalance] = useState<UnitBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [loginUser, setLoginUser] = useState<AppUser | null>(null);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState(0);

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
    }
  }

  async function handleCreateLogin(e: FormEvent) {
    e.preventDefault();
    if (!personId) return;
    setSubmitting(true);
    try {
      await createUser({ email: loginEmail, password: loginPassword, fullName: person ? `${person.firstName} ${person.lastName}` : loginEmail, userType: "sakin", personId });
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

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personId]);

  if (!personId) return null;

  return (
    <Box>
      <Box sx={{ p: 4, maxWidth: 720 }}>
        <Button size="small" startIcon={<ArrowBackIcon fontSize="small" />} onClick={() => navigate("/persons")} sx={{ mb: 1 }}>
          Kişiler
        </Button>
        <Typography variant="h5" sx={{ mb: 2 }}>
          {person ? `${person.firstName} ${person.lastName}` : "Kişi Detayı"}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {person && (
          <Box sx={{ mb: 4 }}>
            <Typography color="text.secondary">
              {[person.phone, person.email, person.nationalId].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}
            </Typography>
            {balance && (
              <Chip
                sx={{ mt: 1, mr: 1 }}
                label={`Kalan Bakiye: ${balance.remainingAmount.toLocaleString("tr-TR")} ₺`}
                color={balance.remainingAmount > 0 ? "warning" : "success"}
              />
            )}
            {loginUser ? (
              <Chip sx={{ mt: 1 }} label={`Giriş Hesabı: ${loginUser.email}`} color="info" variant="outlined" />
            ) : (
              <Button size="small" sx={{ mt: 1 }} onClick={() => setLoginDialogOpen(true)}>
                Sakin Giriş Hesabı Oluştur
              </Button>
            )}
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

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
          <Tab label="Aile & Acil Durum" />
          <Tab label="Araç & Evcil Hayvan" />
          <Tab label="Vekalet" />
          <Tab label="İletişim & Notlar" />
        </Tabs>

        {tab === 0 && (
          <>
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
          </>
        )}

        {tab === 1 && (
          <>
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
          </>
        )}

        {tab === 2 && (
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
        )}

        {tab === 3 && (
          <>
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
          </>
        )}
      </Box>

      <Dialog open={loginDialogOpen} onClose={() => setLoginDialogOpen(false)} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleCreateLogin}>
          <DialogTitle>Sakin Giriş Hesabı Oluştur</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Bu kişi, oluşturulan e-posta/şifre ile kendi bağımsız bölümüne ait borç/talep/rezervasyon/ziyaretçi
              verilerini görüntüleyip işlem yapabilir.
            </Typography>
            <TextField label="E-posta" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoFocus fullWidth />
            <TextField label="Şifre" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required fullWidth helperText="En az 8 karakter" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setLoginDialogOpen(false)}>Vazgeç</Button>
            <Button type="submit" variant="contained" disabled={submitting}>Oluştur</Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
