package crm

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("kayıt bulunamadı")

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// --- Persons ---

type PersonInput struct {
	FirstName  string
	LastName   string
	NationalID *string
	Phone      *string
	Email      *string
}

func (s *Service) CreatePerson(ctx context.Context, tenantID uuid.UUID, in PersonInput) (Person, error) {
	var p Person
	err := s.pool.QueryRow(ctx,
		`INSERT INTO persons (tenant_id, first_name, last_name, national_id, phone, email)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, first_name, last_name, national_id, phone, email, is_active, created_at, updated_at`,
		tenantID, in.FirstName, in.LastName, in.NationalID, in.Phone, in.Email,
	).Scan(&p.ID, &p.TenantID, &p.FirstName, &p.LastName, &p.NationalID, &p.Phone, &p.Email, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func (s *Service) ListPersons(ctx context.Context, tenantID uuid.UUID, search string) ([]Person, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, first_name, last_name, national_id, phone, email, is_active, created_at, updated_at
		 FROM persons
		 WHERE tenant_id = $1
		   AND ($2 = '' OR first_name ILIKE '%' || $2 || '%' OR last_name ILIKE '%' || $2 || '%' OR national_id ILIKE '%' || $2 || '%')
		 ORDER BY first_name, last_name`, tenantID, search,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	persons := []Person{}
	for rows.Next() {
		var p Person
		if err := rows.Scan(&p.ID, &p.TenantID, &p.FirstName, &p.LastName, &p.NationalID, &p.Phone, &p.Email, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		persons = append(persons, p)
	}
	return persons, rows.Err()
}

func (s *Service) GetPerson(ctx context.Context, tenantID, personID uuid.UUID) (Person, error) {
	var p Person
	err := s.pool.QueryRow(ctx,
		`SELECT id, tenant_id, first_name, last_name, national_id, phone, email, is_active, created_at, updated_at
		 FROM persons WHERE id = $1 AND tenant_id = $2`, personID, tenantID,
	).Scan(&p.ID, &p.TenantID, &p.FirstName, &p.LastName, &p.NationalID, &p.Phone, &p.Email, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	return p, err
}

func (s *Service) UpdatePerson(ctx context.Context, tenantID, personID uuid.UUID, in PersonInput, isActive bool) (Person, error) {
	var p Person
	err := s.pool.QueryRow(ctx,
		`UPDATE persons SET first_name = $1, last_name = $2, national_id = $3, phone = $4, email = $5, is_active = $6, updated_at = now()
		 WHERE id = $7 AND tenant_id = $8
		 RETURNING id, tenant_id, first_name, last_name, national_id, phone, email, is_active, created_at, updated_at`,
		in.FirstName, in.LastName, in.NationalID, in.Phone, in.Email, isActive, personID, tenantID,
	).Scan(&p.ID, &p.TenantID, &p.FirstName, &p.LastName, &p.NationalID, &p.Phone, &p.Email, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Person{}, ErrNotFound
	}
	return p, err
}

func (s *Service) DeactivatePerson(ctx context.Context, tenantID, personID uuid.UUID) error {
	return s.deactivate(ctx, "persons", tenantID, personID)
}

func (s *Service) deactivate(ctx context.Context, table string, tenantID, id uuid.UUID) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE `+table+` SET is_active = FALSE, updated_at = now() WHERE id = $1 AND tenant_id = $2`,
		id, tenantID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) delete(ctx context.Context, table string, tenantID, id uuid.UUID) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM `+table+` WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Unit Residents (malik / kiracı bağlama) ---

func (s *Service) CreateUnitResident(ctx context.Context, tenantID, unitID, personID uuid.UUID, relation string, startDate, endDate *time.Time) (UnitResident, error) {
	var r UnitResident
	err := s.pool.QueryRow(ctx,
		`INSERT INTO unit_residents (tenant_id, unit_id, person_id, relation, start_date, end_date)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, unit_id, person_id, relation, start_date, end_date, is_active, created_at, updated_at`,
		tenantID, unitID, personID, relation, startDate, endDate,
	).Scan(&r.ID, &r.TenantID, &r.UnitID, &r.PersonID, &r.Relation, &r.StartDate, &r.EndDate, &r.IsActive, &r.CreatedAt, &r.UpdatedAt)
	return r, err
}

func (s *Service) ListUnitResidents(ctx context.Context, tenantID, unitID uuid.UUID) ([]UnitResident, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, unit_id, person_id, relation, start_date, end_date, is_active, created_at, updated_at
		 FROM unit_residents WHERE tenant_id = $1 AND unit_id = $2 ORDER BY created_at DESC`, tenantID, unitID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []UnitResident{}
	for rows.Next() {
		var r UnitResident
		if err := rows.Scan(&r.ID, &r.TenantID, &r.UnitID, &r.PersonID, &r.Relation, &r.StartDate, &r.EndDate, &r.IsActive, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

func (s *Service) ListResidencesForPerson(ctx context.Context, tenantID, personID uuid.UUID) ([]UnitResident, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, unit_id, person_id, relation, start_date, end_date, is_active, created_at, updated_at
		 FROM unit_residents WHERE tenant_id = $1 AND person_id = $2 ORDER BY created_at DESC`, tenantID, personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []UnitResident{}
	for rows.Next() {
		var r UnitResident
		if err := rows.Scan(&r.ID, &r.TenantID, &r.UnitID, &r.PersonID, &r.Relation, &r.StartDate, &r.EndDate, &r.IsActive, &r.CreatedAt, &r.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, r)
	}
	return list, rows.Err()
}

func (s *Service) DeactivateUnitResident(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.deactivate(ctx, "unit_residents", tenantID, id)
}

// --- Family Members ---

func (s *Service) CreateFamilyMember(ctx context.Context, tenantID, personID uuid.UUID, fullName string, relation, phone *string) (FamilyMember, error) {
	var f FamilyMember
	err := s.pool.QueryRow(ctx,
		`INSERT INTO family_members (tenant_id, person_id, full_name, relation, phone) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, person_id, full_name, relation, phone, created_at`,
		tenantID, personID, fullName, relation, phone,
	).Scan(&f.ID, &f.TenantID, &f.PersonID, &f.FullName, &f.Relation, &f.Phone, &f.CreatedAt)
	return f, err
}

func (s *Service) ListFamilyMembers(ctx context.Context, tenantID, personID uuid.UUID) ([]FamilyMember, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, person_id, full_name, relation, phone, created_at
		 FROM family_members WHERE tenant_id = $1 AND person_id = $2 ORDER BY created_at`, tenantID, personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []FamilyMember{}
	for rows.Next() {
		var f FamilyMember
		if err := rows.Scan(&f.ID, &f.TenantID, &f.PersonID, &f.FullName, &f.Relation, &f.Phone, &f.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, f)
	}
	return list, rows.Err()
}

func (s *Service) DeleteFamilyMember(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.delete(ctx, "family_members", tenantID, id)
}

// --- Emergency Contacts ---

func (s *Service) CreateEmergencyContact(ctx context.Context, tenantID, personID uuid.UUID, fullName, phone string, relation *string) (EmergencyContact, error) {
	var e EmergencyContact
	err := s.pool.QueryRow(ctx,
		`INSERT INTO emergency_contacts (tenant_id, person_id, full_name, phone, relation) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, person_id, full_name, phone, relation, created_at`,
		tenantID, personID, fullName, phone, relation,
	).Scan(&e.ID, &e.TenantID, &e.PersonID, &e.FullName, &e.Phone, &e.Relation, &e.CreatedAt)
	return e, err
}

func (s *Service) ListEmergencyContacts(ctx context.Context, tenantID, personID uuid.UUID) ([]EmergencyContact, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, person_id, full_name, phone, relation, created_at
		 FROM emergency_contacts WHERE tenant_id = $1 AND person_id = $2 ORDER BY created_at`, tenantID, personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []EmergencyContact{}
	for rows.Next() {
		var e EmergencyContact
		if err := rows.Scan(&e.ID, &e.TenantID, &e.PersonID, &e.FullName, &e.Phone, &e.Relation, &e.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, e)
	}
	return list, rows.Err()
}

func (s *Service) DeleteEmergencyContact(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.delete(ctx, "emergency_contacts", tenantID, id)
}

// --- Vehicles ---

func (s *Service) CreateVehicle(ctx context.Context, tenantID, personID uuid.UUID, plate string, brand, model, color *string) (Vehicle, error) {
	var v Vehicle
	err := s.pool.QueryRow(ctx,
		`INSERT INTO vehicles (tenant_id, person_id, plate, brand, model, color) VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, person_id, plate, brand, model, color, created_at`,
		tenantID, personID, plate, brand, model, color,
	).Scan(&v.ID, &v.TenantID, &v.PersonID, &v.Plate, &v.Brand, &v.Model, &v.Color, &v.CreatedAt)
	return v, err
}

func (s *Service) ListVehicles(ctx context.Context, tenantID, personID uuid.UUID) ([]Vehicle, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, person_id, plate, brand, model, color, created_at
		 FROM vehicles WHERE tenant_id = $1 AND person_id = $2 ORDER BY created_at`, tenantID, personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Vehicle{}
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(&v.ID, &v.TenantID, &v.PersonID, &v.Plate, &v.Brand, &v.Model, &v.Color, &v.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, v)
	}
	return list, rows.Err()
}

func (s *Service) SearchVehicleByPlate(ctx context.Context, tenantID uuid.UUID, plate string) ([]Vehicle, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, person_id, plate, brand, model, color, created_at
		 FROM vehicles WHERE tenant_id = $1 AND plate ILIKE '%' || $2 || '%' ORDER BY created_at DESC`, tenantID, plate,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Vehicle{}
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(&v.ID, &v.TenantID, &v.PersonID, &v.Plate, &v.Brand, &v.Model, &v.Color, &v.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, v)
	}
	return list, rows.Err()
}

func (s *Service) DeleteVehicle(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.delete(ctx, "vehicles", tenantID, id)
}

// --- Pets ---

func (s *Service) CreatePet(ctx context.Context, tenantID, personID uuid.UUID, name string, species, breed *string) (Pet, error) {
	var p Pet
	err := s.pool.QueryRow(ctx,
		`INSERT INTO pets (tenant_id, person_id, name, species, breed) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, person_id, name, species, breed, created_at`,
		tenantID, personID, name, species, breed,
	).Scan(&p.ID, &p.TenantID, &p.PersonID, &p.Name, &p.Species, &p.Breed, &p.CreatedAt)
	return p, err
}

func (s *Service) ListPets(ctx context.Context, tenantID, personID uuid.UUID) ([]Pet, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, person_id, name, species, breed, created_at
		 FROM pets WHERE tenant_id = $1 AND person_id = $2 ORDER BY created_at`, tenantID, personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Pet{}
	for rows.Next() {
		var p Pet
		if err := rows.Scan(&p.ID, &p.TenantID, &p.PersonID, &p.Name, &p.Species, &p.Breed, &p.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (s *Service) DeletePet(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.delete(ctx, "pets", tenantID, id)
}

// --- Power of Attorneys ---

func (s *Service) CreatePowerOfAttorney(ctx context.Context, tenantID, personID uuid.UUID, attorneyName string, documentNo, issuedBy *string, validUntil *time.Time) (PowerOfAttorney, error) {
	var poa PowerOfAttorney
	err := s.pool.QueryRow(ctx,
		`INSERT INTO power_of_attorneys (tenant_id, person_id, attorney_name, document_no, issued_by, valid_until)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, tenant_id, person_id, attorney_name, document_no, issued_by, valid_until, created_at`,
		tenantID, personID, attorneyName, documentNo, issuedBy, validUntil,
	).Scan(&poa.ID, &poa.TenantID, &poa.PersonID, &poa.AttorneyName, &poa.DocumentNo, &poa.IssuedBy, &poa.ValidUntil, &poa.CreatedAt)
	return poa, err
}

func (s *Service) ListPowerOfAttorneys(ctx context.Context, tenantID, personID uuid.UUID) ([]PowerOfAttorney, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, person_id, attorney_name, document_no, issued_by, valid_until, created_at
		 FROM power_of_attorneys WHERE tenant_id = $1 AND person_id = $2 ORDER BY created_at DESC`, tenantID, personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []PowerOfAttorney{}
	for rows.Next() {
		var poa PowerOfAttorney
		if err := rows.Scan(&poa.ID, &poa.TenantID, &poa.PersonID, &poa.AttorneyName, &poa.DocumentNo, &poa.IssuedBy, &poa.ValidUntil, &poa.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, poa)
	}
	return list, rows.Err()
}

func (s *Service) DeletePowerOfAttorney(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.delete(ctx, "power_of_attorneys", tenantID, id)
}

// --- Contact History ---

func (s *Service) CreateContactHistory(ctx context.Context, tenantID, personID uuid.UUID, channel, summary string, createdBy *uuid.UUID) (ContactHistoryEntry, error) {
	var c ContactHistoryEntry
	err := s.pool.QueryRow(ctx,
		`INSERT INTO contact_history (tenant_id, person_id, channel, summary, created_by) VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, tenant_id, person_id, channel, summary, created_by, created_at`,
		tenantID, personID, channel, summary, createdBy,
	).Scan(&c.ID, &c.TenantID, &c.PersonID, &c.Channel, &c.Summary, &c.CreatedBy, &c.CreatedAt)
	return c, err
}

func (s *Service) ListContactHistory(ctx context.Context, tenantID, personID uuid.UUID) ([]ContactHistoryEntry, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, person_id, channel, summary, created_by, created_at
		 FROM contact_history WHERE tenant_id = $1 AND person_id = $2 ORDER BY created_at DESC`, tenantID, personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []ContactHistoryEntry{}
	for rows.Next() {
		var c ContactHistoryEntry
		if err := rows.Scan(&c.ID, &c.TenantID, &c.PersonID, &c.Channel, &c.Summary, &c.CreatedBy, &c.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}
	return list, rows.Err()
}

// --- Person Notes ---

func (s *Service) CreatePersonNote(ctx context.Context, tenantID, personID uuid.UUID, note string, createdBy *uuid.UUID) (PersonNote, error) {
	var n PersonNote
	err := s.pool.QueryRow(ctx,
		`INSERT INTO person_notes (tenant_id, person_id, note, created_by) VALUES ($1, $2, $3, $4)
		 RETURNING id, tenant_id, person_id, note, created_by, created_at`,
		tenantID, personID, note, createdBy,
	).Scan(&n.ID, &n.TenantID, &n.PersonID, &n.Note, &n.CreatedBy, &n.CreatedAt)
	return n, err
}

func (s *Service) ListPersonNotes(ctx context.Context, tenantID, personID uuid.UUID) ([]PersonNote, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, person_id, note, created_by, created_at
		 FROM person_notes WHERE tenant_id = $1 AND person_id = $2 ORDER BY created_at DESC`, tenantID, personID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []PersonNote{}
	for rows.Next() {
		var n PersonNote
		if err := rows.Scan(&n.ID, &n.TenantID, &n.PersonID, &n.Note, &n.CreatedBy, &n.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, n)
	}
	return list, rows.Err()
}
