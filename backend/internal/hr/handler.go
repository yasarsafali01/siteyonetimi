package hr

import (
	"errors"
	"net/http"

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
	rg.GET("/sites/:siteId/employees", h.listEmployees)
	rg.POST("/sites/:siteId/employees", h.createEmployee)
	rg.DELETE("/employees/:employeeId", h.deactivateEmployee)

	rg.GET("/employees/:employeeId/shifts", h.listShifts)
	rg.POST("/employees/:employeeId/shifts", h.createShift)

	rg.GET("/employees/:employeeId/timesheets", h.listTimesheets)
	rg.POST("/employees/:employeeId/timesheets", h.createTimesheet)

	rg.GET("/employees/:employeeId/leave-requests", h.listLeaveRequests)
	rg.POST("/employees/:employeeId/leave-requests", h.createLeaveRequest)
	rg.POST("/leave-requests/:leaveId/decide", h.decideLeaveRequest)

	rg.GET("/employees/:employeeId/salary-advances", h.listSalaryAdvances)
	rg.POST("/employees/:employeeId/salary-advances", h.createSalaryAdvance)

	rg.GET("/employees/:employeeId/performance-reviews", h.listPerformanceReviews)
	rg.POST("/employees/:employeeId/performance-reviews", h.createPerformanceReview)
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

// --- Employees ---

type employeeRequest struct {
	FirstName  string  `json:"firstName" binding:"required"`
	LastName   string  `json:"lastName" binding:"required"`
	Position   *string `json:"position"`
	Phone      *string `json:"phone"`
	NationalID *string `json:"nationalId"`
	HireDate   *string `json:"hireDate"`
}

func (h *Handler) createEmployee(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	var req employeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateEmployee(c.Request.Context(), tenantID(c), siteID, EmployeeInput{
		FirstName: req.FirstName, LastName: req.LastName, Position: req.Position, Phone: req.Phone, NationalID: req.NationalID, HireDate: req.HireDate,
	})
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listEmployees(c *gin.Context) {
	siteID, ok := paramUUID(c, "siteId")
	if !ok {
		return
	}
	result, err := h.service.ListEmployees(c.Request.Context(), tenantID(c), siteID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *Handler) deactivateEmployee(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	if err := h.service.DeactivateEmployee(c.Request.Context(), tenantID(c), employeeID); err != nil {
		handleServiceError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}

// --- Shifts ---

type shiftRequest struct {
	ShiftDate string `json:"shiftDate" binding:"required"`
	StartTime string `json:"startTime" binding:"required"`
	EndTime   string `json:"endTime" binding:"required"`
}

func (h *Handler) createShift(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	var req shiftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateShift(c.Request.Context(), tenantID(c), employeeID, req.ShiftDate, req.StartTime, req.EndTime)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listShifts(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	result, err := h.service.ListShifts(c.Request.Context(), tenantID(c), employeeID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Timesheets ---

type timesheetRequest struct {
	WorkDate string  `json:"workDate" binding:"required"`
	CheckIn  *string `json:"checkIn"`
	CheckOut *string `json:"checkOut"`
	Note     *string `json:"note"`
}

func (h *Handler) createTimesheet(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	var req timesheetRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateTimesheet(c.Request.Context(), tenantID(c), employeeID, req.WorkDate, req.CheckIn, req.CheckOut, req.Note)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listTimesheets(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	result, err := h.service.ListTimesheets(c.Request.Context(), tenantID(c), employeeID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Leave Requests ---

type leaveRequestRequest struct {
	Type      string  `json:"type" binding:"required,oneof=yillik_izin ucretsiz_izin hastalik_izni mazeret_izni"`
	StartDate string  `json:"startDate" binding:"required"`
	EndDate   string  `json:"endDate" binding:"required"`
	Reason    *string `json:"reason"`
}

func (h *Handler) createLeaveRequest(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	var req leaveRequestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateLeaveRequest(c.Request.Context(), tenantID(c), employeeID, req.Type, req.StartDate, req.EndDate, req.Reason)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listLeaveRequests(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	result, err := h.service.ListLeaveRequests(c.Request.Context(), tenantID(c), employeeID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

type decideRequest struct {
	Approve bool `json:"approve"`
}

func (h *Handler) decideLeaveRequest(c *gin.Context) {
	leaveID, ok := paramUUID(c, "leaveId")
	if !ok {
		return
	}
	var req decideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.DecideLeaveRequest(c.Request.Context(), tenantID(c), leaveID, req.Approve, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Salary Advances ---

type salaryAdvanceRequest struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
	Note   *string `json:"note"`
}

func (h *Handler) createSalaryAdvance(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	var req salaryAdvanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreateSalaryAdvance(c.Request.Context(), tenantID(c), employeeID, req.Amount, req.Note, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listSalaryAdvances(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	result, err := h.service.ListSalaryAdvances(c.Request.Context(), tenantID(c), employeeID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}

// --- Performance Reviews ---

type performanceReviewRequest struct {
	Score   int     `json:"score" binding:"required,min=1,max=5"`
	Comment *string `json:"comment"`
}

func (h *Handler) createPerformanceReview(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	var req performanceReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	result, err := h.service.CreatePerformanceReview(c.Request.Context(), tenantID(c), employeeID, req.Score, req.Comment, userID(c))
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *Handler) listPerformanceReviews(c *gin.Context) {
	employeeID, ok := paramUUID(c, "employeeId")
	if !ok {
		return
	}
	result, err := h.service.ListPerformanceReviews(c.Request.Context(), tenantID(c), employeeID)
	if err != nil {
		handleServiceError(c, err)
		return
	}
	c.JSON(http.StatusOK, result)
}
