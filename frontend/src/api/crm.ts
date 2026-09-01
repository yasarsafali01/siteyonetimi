import { apiClient } from "./client";
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

export async function listPersons(search = "") {
  const { data } = await apiClient.get<Person[]>("/persons", { params: { search } });
  return data;
}

export async function createPerson(input: { firstName: string; lastName: string; nationalId?: string; phone?: string; email?: string }) {
  const { data } = await apiClient.post<Person>("/persons", input);
  return data;
}

export async function getPerson(personId: string) {
  const { data } = await apiClient.get<Person>(`/persons/${personId}`);
  return data;
}

export async function listResidencies(personId: string) {
  const { data } = await apiClient.get<UnitResident[]>(`/persons/${personId}/residencies`);
  return data;
}

export async function listUnitResidents(unitId: string) {
  const { data } = await apiClient.get<UnitResident[]>(`/units/${unitId}/residents`);
  return data;
}

export async function createUnitResident(unitId: string, input: { personId: string; relation: "malik" | "kiraci" }) {
  const { data } = await apiClient.post<UnitResident>(`/units/${unitId}/residents`, input);
  return data;
}

export async function deactivateUnitResident(id: string) {
  await apiClient.delete(`/unit-residents/${id}`);
}

function makeSubResource<T>(segment: string) {
  return {
    list: async (personId: string) => {
      const { data } = await apiClient.get<T[]>(`/persons/${personId}/${segment}`);
      return data;
    },
    create: async (personId: string, input: Record<string, unknown>) => {
      const { data } = await apiClient.post<T>(`/persons/${personId}/${segment}`, input);
      return data;
    },
    remove: async (id: string) => {
      await apiClient.delete(`/${segment}/${id}`);
    },
  };
}

export const familyMembers = makeSubResource<FamilyMember>("family-members");
export const emergencyContacts = makeSubResource<EmergencyContact>("emergency-contacts");
export const vehicles = makeSubResource<Vehicle>("vehicles");
export const pets = makeSubResource<Pet>("pets");
export const powerOfAttorneys = makeSubResource<PowerOfAttorney>("power-of-attorneys");

export async function listContactHistory(personId: string) {
  const { data } = await apiClient.get<ContactHistoryEntry[]>(`/persons/${personId}/contact-history`);
  return data;
}

export async function createContactHistory(personId: string, input: { channel: string; summary: string }) {
  const { data } = await apiClient.post<ContactHistoryEntry>(`/persons/${personId}/contact-history`, input);
  return data;
}

export async function listPersonNotes(personId: string) {
  const { data } = await apiClient.get<PersonNote[]>(`/persons/${personId}/notes`);
  return data;
}

export async function createPersonNote(personId: string, note: string) {
  const { data } = await apiClient.post<PersonNote>(`/persons/${personId}/notes`, { note });
  return data;
}
