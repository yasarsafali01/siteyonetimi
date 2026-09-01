# Site Yönetim Platformu

Çok kiracılı (multi-tenant) site / apartman / rezidans yönetim SaaS platformu. Yönetim şirketlerinin birden çok siteyi; aidat, muhasebe, arıza-talep, güvenlik, rezervasyon, duyuru ve daha fazlasını tek panelden yönetmesini sağlar.

Kapsamın tamamı (26 modül) için bkz. [docs/ANALIZ.md](docs/ANALIZ.md).

## Mimari

> Proje henüz iskelet aşamasında. Bu bölüm ilk kod tabanı oluşturulduğunda güncellenecek.

Planlanan yığın (bkz. [docs/ANALIZ.md](docs/ANALIZ.md#önerilen-teknoloji-mimarisi-kaynak-dokümandaki-öneri)):

- **Frontend:** React + TypeScript + MUI
- **Mobil:** React Native
- **Backend:** NestJS (Node.js)
- **Veritabanı:** PostgreSQL
- **Cache:** Redis
- **Queue:** RabbitMQ
- **Dosya Depolama:** MinIO
- **Kimlik Doğrulama:** JWT + Refresh Token + 2FA
- **Mimari:** Multi-Tenant SaaS

## Klasör Yapısı

> İlk kod tabanı oluşturulduğunda güncellenecek.

## Hızlı Başlangıç

> Henüz çalıştırılabilir bir sürüm yok.

Kurulum ve ortam değişkenleri için [INSTALL.md](INSTALL.md) dosyasına bakın.
