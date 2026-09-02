# Kurulum

## Gereksinimler

- Go 1.24+
- Node.js 20+
- Docker Desktop (PostgreSQL + Redis için)

## 1. Veritabanı ve Cache (Docker)

```bash
docker compose up -d
```

Bu, PostgreSQL'i **host'ta 55432 portunda** (container içinde 5432) ve Redis'i 6379'da ayağa kaldırır. Port 5432 yerine 55432 kullanılıyor çünkü birçok geliştirici makinesinde 5432/8080 gibi portlar başka (native kurulu) servisler tarafından kullanılıyor olabilir — çakışmayı önlemek için taşındı.

İlk migration'ı uygula:

```bash
docker exec -i siteyonetimi-postgres-1 psql -U postgres -d siteyonetimi < backend/migrations/0001_init.up.sql
```

## 2. Backend

```bash
cd backend
cp .env.example .env   # gerekirse değerleri düzenle
go run ./cmd/api
```

API varsayılan olarak `http://localhost:8081` üzerinde çalışır.

### Ortam Değişkenleri (`backend/.env.example`)

| Değişken | Açıklama | Varsayılan |
|---|---|---|
| `PORT` | API portu | `8081` |
| `DATABASE_URL` | PostgreSQL bağlantı string'i | `postgres://postgres:postgres@localhost:55432/siteyonetimi?sslmode=disable` |
| `REDIS_URL` | Redis adresi | `localhost:6379` |
| `JWT_ACCESS_SECRET` | Access token imzalama anahtarı | dev değeri — **prod'da değiştirilmeli** |
| `JWT_REFRESH_SECRET` | Refresh token imzalama anahtarı | dev değeri — **prod'da değiştirilmeli** |
| `CORS_ALLOWED_ORIGINS` | Virgülle ayrılmış izinli origin listesi | `http://localhost:5173,http://localhost:5174,http://localhost:19006` |

### İlk yönetim şirketi (tenant) ve süper admin oluşturma

```bash
curl -X POST http://localhost:8081/api/v1/auth/register-tenant \
  -H "Content-Type: application/json" \
  -d '{"companyName":"Şirket Adı","email":"admin@ornek.com","password":"GucluSifre123!","fullName":"Ad Soyad"}'
```

## 3. Frontend (Web)

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

`http://localhost:5173` — port `vite.config.ts`'de sabitlendi (`strictPort: true`); 5173 doluysa Vite başka porta kaymaz, hata verip durur. Böyle bir hata alırsan 5173'ü tutan eski bir `npm run dev` sürecini kapatman gerekiyor demektir.

## 4. Mobil (React Native / Expo)

```bash
cd mobile
cp .env.example .env.local
npm install
npx expo start
```

- **iOS simülatör / Expo Go (aynı Wi-Fi):** `EXPO_PUBLIC_API_URL`'de `localhost` yerine bilgisayarının LAN IP'sini kullan.
- **Android emülatör:** `localhost` yerine `10.0.2.2` kullan (emülatörden host makineye böyle erişilir).
- **Web önizleme:** `npx expo start --web` — bu da backend CORS listesine eklenmesi gereken bir origin/port açar (varsayılan: `19006`).

## Platform-Spesifik Notlar

- Proje Windows üzerinde geliştiriliyor; Docker Desktop'ın çalışır durumda olması gerekiyor.
- `go mod tidy`, bu makinedeki Go sürümüyle GOPATH kökünde bulunan ilgisiz bir `go.mod` dosyası yüzünden hatalı "go.mod bulunamadı" mesajı verebiliyor. Bu durumda `go build ./...` ve `go vet ./...` ile doğrulama yap — onlar sorunsuz çalışıyor; `go mod tidy` yerine gerektiğinde bağımlılıkları `go get <paket>` ile tek tek ekle.
