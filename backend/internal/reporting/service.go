package reporting

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// Dashboard, sitenin genel durumunu özetleyen KPI'ları finans, talep, bakım ve
// rezervasyon modüllerinden tek sorguda toplar.
func (s *Service) Dashboard(ctx context.Context, tenantID, siteID uuid.UUID) (Dashboard, error) {
	var d Dashboard
	err := s.pool.QueryRow(ctx,
		`SELECT
		   (SELECT count(*) FROM units WHERE tenant_id = $1 AND site_id = $2),
		   (SELECT COALESCE(SUM(c.amount), 0) FROM charges c WHERE c.tenant_id = $1 AND c.site_id = $2)
		     - (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN charges c2 ON c2.id = p.charge_id WHERE c2.tenant_id = $1 AND c2.site_id = $2),
		   (SELECT COALESCE(SUM(amount), 0) FROM charges WHERE tenant_id = $1 AND site_id = $2 AND created_at >= date_trunc('month', now())),
		   (SELECT COALESCE(SUM(p.amount), 0) FROM payments p JOIN charges c3 ON c3.id = p.charge_id WHERE c3.tenant_id = $1 AND c3.site_id = $2 AND p.paid_at >= date_trunc('month', now())::date),
		   (SELECT count(*) FROM requests WHERE tenant_id = $1 AND site_id = $2 AND status NOT IN ('cozuldu', 'kapatildi')),
		   (SELECT count(*) FROM work_orders WHERE tenant_id = $1 AND site_id = $2 AND status IN ('planlandi', 'devam_ediyor')),
		   (SELECT count(*) FROM facility_reservations WHERE tenant_id = $1 AND site_id = $2 AND status = 'bekliyor')`,
		tenantID, siteID,
	).Scan(&d.TotalUnits, &d.TotalOutstandingDebt, &d.ChargedThisMonth, &d.CollectedThisMonth, &d.OpenRequests, &d.ActiveWorkOrders, &d.PendingReservations)
	return d, err
}

// CollectionRate, son N ay için tahakkuk/tahsilat kırılımını ve tahsilat oranını döner.
func (s *Service) CollectionRate(ctx context.Context, tenantID, siteID uuid.UUID, months int) ([]CollectionRatePeriod, error) {
	if months <= 0 {
		months = 6
	}
	rows, err := s.pool.Query(ctx,
		`WITH months AS (
		   SELECT to_char(date_trunc('month', now()) - (n || ' months')::interval, 'YYYY-MM') AS period
		   FROM generate_series(0, $3 - 1) AS n
		 ),
		 charged AS (
		   SELECT to_char(created_at, 'YYYY-MM') AS period, SUM(amount) AS total
		   FROM charges WHERE tenant_id = $1 AND site_id = $2 GROUP BY 1
		 ),
		 collected AS (
		   SELECT to_char(p.paid_at, 'YYYY-MM') AS period, SUM(p.amount) AS total
		   FROM payments p JOIN charges c ON c.id = p.charge_id
		   WHERE c.tenant_id = $1 AND c.site_id = $2 GROUP BY 1
		 )
		 SELECT m.period, COALESCE(ch.total, 0), COALESCE(co.total, 0)
		 FROM months m
		 LEFT JOIN charged ch ON ch.period = m.period
		 LEFT JOIN collected co ON co.period = m.period
		 ORDER BY m.period`,
		tenantID, siteID, months,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []CollectionRatePeriod{}
	for rows.Next() {
		var p CollectionRatePeriod
		if err := rows.Scan(&p.Period, &p.Charged, &p.Collected); err != nil {
			return nil, err
		}
		if p.Charged > 0 {
			p.RatePct = p.Collected / p.Charged * 100
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

// Debtors, bakiyesi pozitif olan (borçlu) bağımsız bölümleri en yüksek borçtan aza sıralar.
func (s *Service) Debtors(ctx context.Context, tenantID, siteID uuid.UUID) ([]Debtor, error) {
	rows, err := s.pool.Query(ctx,
		`WITH unit_totals AS (
		   SELECT u.id AS unit_id, u.unit_number, b.name AS block_name,
		          COALESCE((SELECT SUM(amount) FROM charges c WHERE c.unit_id = u.id AND c.tenant_id = $1), 0) AS total_charged,
		          COALESCE((SELECT SUM(p.amount) FROM payments p JOIN charges c2 ON c2.id = p.charge_id WHERE c2.unit_id = u.id AND c2.tenant_id = $1), 0) AS total_paid
		   FROM units u JOIN blocks b ON b.id = u.block_id
		   WHERE u.tenant_id = $1 AND u.site_id = $2
		 )
		 SELECT unit_id, unit_number, block_name, total_charged, total_paid, total_charged - total_paid AS remaining
		 FROM unit_totals
		 WHERE total_charged - total_paid > 0
		 ORDER BY remaining DESC`,
		tenantID, siteID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []Debtor{}
	for rows.Next() {
		var d Debtor
		if err := rows.Scan(&d.UnitID, &d.UnitNumber, &d.BlockName, &d.TotalCharged, &d.TotalPaid, &d.RemainingAmount); err != nil {
			return nil, err
		}
		list = append(list, d)
	}
	return list, rows.Err()
}
