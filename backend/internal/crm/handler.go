package crm

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"siteyonetimi/backend/internal/middleware"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/persons", h.listPersons)
	rg.POST("/persons", h.createPerson)
	rg.GET("/persons/:personId", h.getPerson)
	rg.PUT("/persons/:personId", h.updatePerson)
	rg.DELETE("/persons/:personId", h.deactivatePerson)

	rg.GET("/persons/:personId/residencies", h.listResidencies)
	rg.GET("/units/:unitId/residents", h.listUnitResidents)
	rg.POST("/units/:unitId/residents", h.createUnitResident)
	rg.DELETE("/unit-residents/:id", h.deactivateUnitResident)

	rg.GET("/persons/:personId/family-members", h.listFamilyMembers)
	rg.POST("/persons/:personId/family-members", h.createFamilyMember)
	rg.DELETE("/family-members/:id", h.deleteFamilyMember)

	rg.GET("/persons/:personId/emergency-contacts", h.listEmergencyContacts)
	rg.POST("/persons/:personId/emergency-contacts", h.createEmergencyContact)
	rg.DELETE("/emergency-contacts/:id", h.deleteEmergencyContact)

	rg.GET("/persons/:personId/vehicles", h.listVehicles)
	rg.POST("/persons/:personId/vehicles", h.createVehicle)
	rg.GET("/vehicles/search", h.searchVehicles)
	rg.DELETE("/vehicles/:id", h.deleteVehicle)

	rg.GET("/persons/:personId/pets", h.listPets)
	rg.POST("/persons/:personId/pets", h.createPet)
	rg.DELETE("/pets/:id", h.deletePet)

	rg.GET("/persons/:personId/power-of-attorneys", h.listPowerOfAttorneys)
	rg.POST("/persons/:personId/power-of-attorneys", h.createPowerOfAttorney)
	rg.DELETE("/power-of-attorneys/:id", h.deletePowerOfAttorney)

	rg.GET("/persons/:personId/contact-history", h.listContactHistory)
	rg.POST("/persons/:personId/contact-history", h.createContactHistory)

	rg.GET("/persons/:personId/notes", h.listPersonNotes)
	rg.POST("/persons/:personId/notes", h.createPersonNote)
}

func tenantID(c *gin.Context) uuid.UUID {
	v, _ := c.Get(middleware.ContextKeyTenantID)
	id, _ := v.(uuid.UUID)
	return id
}

func userID(c *gin.Context) *uuid.UUID {
	v, ok := c.Get(middleware.ContextKeyUserID)
	if !ok {
		return nil
	}
	id, ok := v.(uuid.UUID)
	if !ok {
		return nil
	}
	return &id
}

func paramUUID(c *gin.Context, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(c.Param(name))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "geçersiz " + name})
		return uuid.Nil, false
	}
	return id, true
}

func handleServiceError(c *gin.Context, err error) {
	if errors.Is(err, ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "kayıt bulunamadı"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": "işlem başarısız"})
}

// --- Persons ---

type personRequest struct {
	FirstName  string  `json:"firstName" binding:"required"`
	LastName   string  `json:"lastName" binding:"required"`
	NationalID *string `json:"nationalId"`
	Phone      *string `json:"phone"`
	Email      *string `json:"email"`
	IsActive   *bool   `json:"isActive"`
}

func (r personRequest) toInput() PersonInput {
	return PersonInput{FirstName: r.FirstName, LastName: r.LastName, NationalID: r.NationalID, Phone: r.Phone, Email: r.Email}
}

func (h *Handler) createPerson(c *gin.Context) {
	var req personRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreatePerson(c.Request.Context(), tenantID(c), req.toInput())
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPersons(c *gin.Context) {
	result, err := h.service.ListPersons(c.Request.Context(), tenantID(c), c.Query("search"))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) getPerson(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.GetPerson(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) updatePerson(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	var req personRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	result, err := h.service.UpdatePerson(c.Request.Context(), tenantID(c), personID, req.toInput(), isActive)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deactivatePerson(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	if err := h.service.DeactivatePerson(c.Request.Context(), tenantID(c), personID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Unit Residents ---

type unitResidentRequest struct {
	PersonID  uuid.UUID  `json:"personId" binding:"required"`
	Relation  string     `json:"relation" binding:"required,oneof=malik kiraci"`
	StartDate *time.Time `json:"startDate"`
	EndDate   *time.Time `json:"endDate"`
}

func (h *Handler) createUnitResident(c *gin.Context) {
	unitID, ok := paramUUID(c, "unitId")
	if !ok {
		return
	}
	var req unitResidentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateUnitResident(c.Request.Context(), tenantID(c), unitID, req.PersonID, req.Relation, req.StartDate, req.EndDate)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listUnitResidents(c *gin.Context) {
	unitID, ok := paramUUID(c, "unitId")
	if !ok {
		return
	}
	result, err := h.service.ListUnitResidents(c.Request.Context(), tenantID(c), unitID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) listResidencies(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.ListResidencesForPerson(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deactivateUnitResident(c *gin.Context) {
	id, ok := paramUUID(c, "id")
	if !ok {
		return
	}
	if err := h.service.DeactivateUnitResident(c.Request.Context(), tenantID(c), id); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Family Members ---

type familyMemberRequest struct {
	FullName string  `json:"fullName" binding:"required"`
	Relation *string `json:"relation"`
	Phone    *string `json:"phone"`
}

func (h *Handler) createFamilyMember(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	var req familyMemberRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateFamilyMember(c.Request.Context(), tenantID(c), personID, req.FullName, req.Relation, req.Phone)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listFamilyMembers(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.ListFamilyMembers(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deleteFamilyMember(c *gin.Context) {
	id, ok := paramUUID(c, "id")
	if !ok {
		return
	}
	if err := h.service.DeleteFamilyMember(c.Request.Context(), tenantID(c), id); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Emergency Contacts ---

type emergencyContactRequest struct {
	FullName string  `json:"fullName" binding:"required"`
	Phone    string  `json:"phone" binding:"required"`
	Relation *string `json:"relation"`
}

func (h *Handler) createEmergencyContact(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	var req emergencyContactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateEmergencyContact(c.Request.Context(), tenantID(c), personID, req.FullName, req.Phone, req.Relation)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listEmergencyContacts(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.ListEmergencyContacts(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deleteEmergencyContact(c *gin.Context) {
	id, ok := paramUUID(c, "id")
	if !ok {
		return
	}
	if err := h.service.DeleteEmergencyContact(c.Request.Context(), tenantID(c), id); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Vehicles ---

type vehicleRequest struct {
	Plate string  `json:"plate" binding:"required"`
	Brand *string `json:"brand"`
	Model *string `json:"model"`
	Color *string `json:"color"`
}

func (h *Handler) createVehicle(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	var req vehicleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateVehicle(c.Request.Context(), tenantID(c), personID, req.Plate, req.Brand, req.Model, req.Color)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listVehicles(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.ListVehicles(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) searchVehicles(c *gin.Context) {
	result, err := h.service.SearchVehicleByPlate(c.Request.Context(), tenantID(c), c.Query("plate"))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deleteVehicle(c *gin.Context) {
	id, ok := paramUUID(c, "id")
	if !ok {
		return
	}
	if err := h.service.DeleteVehicle(c.Request.Context(), tenantID(c), id); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Pets ---

type petRequest struct {
	Name    string  `json:"name" binding:"required"`
	Species *string `json:"species"`
	Breed   *string `json:"breed"`
}

func (h *Handler) createPet(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	var req petRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreatePet(c.Request.Context(), tenantID(c), personID, req.Name, req.Species, req.Breed)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPets(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.ListPets(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deletePet(c *gin.Context) {
	id, ok := paramUUID(c, "id")
	if !ok {
		return
	}
	if err := h.service.DeletePet(c.Request.Context(), tenantID(c), id); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Power of Attorneys ---

type powerOfAttorneyRequest struct {
	AttorneyName string     `json:"attorneyName" binding:"required"`
	DocumentNo   *string    `json:"documentNo"`
	IssuedBy     *string    `json:"issuedBy"`
	ValidUntil   *time.Time `json:"validUntil"`
}

func (h *Handler) createPowerOfAttorney(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	var req powerOfAttorneyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreatePowerOfAttorney(c.Request.Context(), tenantID(c), personID, req.AttorneyName, req.DocumentNo, req.IssuedBy, req.ValidUntil)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPowerOfAttorneys(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.ListPowerOfAttorneys(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deletePowerOfAttorney(c *gin.Context) {
	id, ok := paramUUID(c, "id")
	if !ok {
		return
	}
	if err := h.service.DeletePowerOfAttorney(c.Request.Context(), tenantID(c), id); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Contact History ---

type contactHistoryRequest struct {
	Channel string `json:"channel" binding:"required"`
	Summary string `json:"summary" binding:"required"`
}

func (h *Handler) createContactHistory(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	var req contactHistoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateContactHistory(c.Request.Context(), tenantID(c), personID, req.Channel, req.Summary, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listContactHistory(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.ListContactHistory(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Person Notes ---

type personNoteRequest struct {
	Note string `json:"note" binding:"required"`
}

func (h *Handler) createPersonNote(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	var req personNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreatePersonNote(c.Request.Context(), tenantID(c), personID, req.Note, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPersonNotes(c *gin.Context) {
	personID, ok := paramUUID(c, "personId")
	if !ok {
		return
	}
	result, err := h.service.ListPersonNotes(c.Request.Context(), tenantID(c), personID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
