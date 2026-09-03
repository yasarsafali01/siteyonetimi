# Site Yönetim Platformu

Çok kiracılı (multi-tenant) site / apartman / rezidans yönetim SaaS platformu. Yönetim şirketlerinin birden çok siteyi; aidat, muhasebe, arıza-talep, güvenlik, rezervasyon, duyuru ve daha fazlasını tek panelden yönetmesini sağlar.

Kapsamın tamamı (26 modül) için bkz. [docs/ANALIZ.md](docs/ANALIZ.md).

## Mimari

```
Kullanıcı (Web / Mobil)
        │
        ▼
  React (web) ── React Native (mobil)
        │  JWT (access + refresh)
        ▼
     Go API (Gin, REST, /api/v1)
        │
        ├── PostgreSQL  (kalıcı veri, multi-tenant)
        └── Redis       (cache — henüz kullanılmıyor, altyapı hazır)
```

- **Frontend (web):** React + TypeScript + MUI, Vite ile geliştirilir.
- **Mobil:** React Native (Expo).
- **Backend:** Go (Gin), REST API, JWT (access + refresh token, rotasyon ile).
- **Veritabanı:** PostgreSQL — multi-tenant şema (`tenants`, `sites`, `users`, `roles`/`permissions`, `audit_logs`).
- **Cache:** Redis (docker-compose'da hazır, henüz koddan kullanılmıyor).
- **Mimari:** Multi-Tenant SaaS. Her kullanıcı bir `tenant`'a (yönetim şirketi) bağlı; `is_super_admin` bayrağı ve rol/izin (RBAC) sistemi ile yetkilendirme yapılır.

Online ödeme altyapısı bilinçli olarak kapsam dışı bırakıldı — ileride eklenecek.

## Klasör Yapısı

```
backend/            Go API
  cmd/api/           main.go — giriş noktası
  internal/
    auth/             kullanıcı/tenant kaydı, login, JWT, refresh
    config/           ortam değişkenlerinden config yükleme
    db/               PostgreSQL bağlantısı
    httpserver/       Gin router kurulumu, CORS
    middleware/        JWT doğrulama middleware'i
    rbac/             izin kontrolü middleware'i
  migrations/         SQL migration dosyaları

frontend/            React + TS + MUI web uygulaması (Vite)
  src/api/            axios client, token yönetimi, otomatik refresh
  src/auth/           AuthContext
  src/pages/          Login, Dashboard, ProtectedRoute

mobile/              React Native (Expo) uygulaması, expo-router ile dosya tabanlı routing
  app/                login.tsx, admin/ (dashboard, sites, persons, users), resident/ (sakin paneli: borç, talep, rezervasyon, davetiye), site/[siteId]/ (19 site modülü: finans, muhasebe, sayaç, arıza, bakım, demirbaş, satın alma, personel, güvenlik, ziyaretçi, geçiş kontrol, otopark, kargo, rezervasyon, duyuru, anket, doküman, hukuk, raporlama)
  src/api/            axios client (AsyncStorage ile token yönetimi)
  src/auth/           AuthContext / ResidentContext
  src/components/ui/  ortak bileşenler (Screen, StatCard, Chip, FormSheet, ListRow...)

docs/ANALIZ.md       Tam kapsam / özellik dokümanı (26 modül)
docker-compose.yml   PostgreSQL + Redis (yerel geliştirme)
```

## Kullanılan Teknolojiler

Go, Gin, pgx, PostgreSQL, Redis, JWT, React, TypeScript, MUI, Vite, React Native, Expo, Docker.

## Hızlı Başlangıç

```bash
docker compose up -d                 # PostgreSQL (55432) + Redis (6379)
docker exec -i siteyonetimi-postgres-1 psql -U postgres -d siteyonetimi < backend/migrations/0001_init.up.sql

cd backend && go run ./cmd/api       # API -> http://localhost:8081

cd frontend && npm install && npm run dev   # Web -> http://localhost:5173

cd mobile && npm install && npx expo start --port 8082  # Mobil (Expo) — 8081 backend ile çakışır, 8082 kullan
```

Detaylı kurulum, ortam değişkenleri ve platform notları için [INSTALL.md](INSTALL.md) dosyasına bakın.
