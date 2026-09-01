# Site / Apartman / Rezidans Yönetim Platformu — Detaylı Analiz ve Full Sürüm Özellik Dokümanı

> Kaynak: `site_yonetim_platformu_detayli_analiz.txt` (proje içine taşındı, orijinal dosya artık referans olarak kullanılmayacak)

## 1. Sistem Yönetimi
Amaç: Tüm platformun yönetildiği merkezi modül.
- Super Admin yönetimi
- Yönetim şirketi oluşturma
- Çoklu site yönetimi
- Multi-tenant yapı
- Rol ve yetki yönetimi
- Menü bazlı yetkilendirme
- İşlem logları
- Audit kayıtları
- IP kısıtlama
- İki faktörlü doğrulama
- SSO desteği

## 2. Site, Blok ve Daire Yönetimi
Amaç: Fiziksel yerleşimin dijital ortamda modellenmesi.
- Site kartları
- Blok tanımları
- Kat bilgileri
- Daire bilgileri
- Dükkan / Ofis tanımları
- Metrekare bilgileri
- Arsa payları
- Aidat katsayıları
- Tapu bilgileri
- Ortak alan tanımları

## 3. CRM ve Kişi Yönetimi
Amaç: Sitedeki tüm kişi bilgilerinin yönetimi.
- Malik kayıtları
- Kiracı kayıtları
- Aile bireyleri
- Acil durum kişileri
- Vekalet bilgileri
- Araç bilgileri
- Evcil hayvan bilgileri
- İletişim geçmişi
- Notlar

## 4. Finans ve Aidat Yönetimi
Amaç: Tüm gelir ve tahsilat süreçlerinin yönetimi.
- Aylık aidat üretimi
- Toplu aidat oluşturma
- Ek aidat
- Özel giderler
- Gecikme faizleri
- Gecikme tazminatları
- Borçlandırma
- Mahsup işlemleri
- Tahsilat takibi
- Borç görüntüleme
- Otomatik hatırlatmalar

## 5. Online Ödeme Altyapısı
Amaç: Aidatların ve diğer ödemelerin internet üzerinden tahsil edilmesi.
- Kredi kartı
- Banka kartı
- Sanal POS
- Taksit
- Otomatik ödeme
- Makbuz üretimi
- Dekont oluşturma
- E-posta gönderimi

## 6. Muhasebe Yönetimi
Amaç: Site muhasebesinin eksiksiz yönetimi.
- Kasa
- Banka
- Cari hesap
- Gelir gider
- Muhasebe fişleri
- Mizan
- Bilanço
- Gelir tablosu
- Bütçe planlama
- Nakit akış yönetimi

## 7. Sayaç Yönetimi
Amaç: Tüketim bazlı ücretlendirme yapılabilmesi.
- Elektrik sayaçları
- Su sayaçları
- Doğalgaz sayaçları
- Kalorimetre
- Endeks girişleri
- Toplu okuma
- Faturalandırma
- Tüketim analizleri

## 8. Arıza ve Talep Yönetimi
Amaç: Sakinlerin tüm taleplerini takip etmek.
- Teknik arıza kayıtları
- Şikayet yönetimi
- Öneri sistemi
- Dosya ekleme
- Fotoğraf ekleme
- Görev atama
- SLA takibi
- Durum değişiklikleri
- Bildirim gönderimi

## 9. Bakım ve İş Emri Yönetimi
Amaç: Tesislerin bakım süreçlerinin takibi.
- Asansör bakımları
- Jeneratör bakımları
- Havuz bakımları
- Yangın sistemi kontrolleri
- İş emirleri
- Periyodik bakım planları
- Bakım geçmişi

## 10. Demirbaş ve Envanter
Amaç: Ortak alan varlıklarının yönetimi.
- Demirbaş kayıtları
- Seri numarası takibi
- Garanti süreleri
- Zimmet işlemleri
- Sayım işlemleri
- Amortisman hesapları

## 11. Satın Alma ve Tedarikçi
Amaç: Satın alma süreçlerini yönetmek.
- Talep oluşturma
- Teklif toplama
- Tedarikçi yönetimi
- Onay akışları
- Sipariş yönetimi
- Fatura takibi

## 12. Personel Yönetimi
Amaç: Site çalışanlarının yönetimi.
- Personel kartları
- Vardiya planları
- Puantaj
- İzin yönetimi
- Avans işlemleri
- Performans takibi
- Bordro entegrasyonu

## 13. Güvenlik Modülü
Amaç: Güvenlik operasyonlarının dijital yönetimi.
- Devriye kayıtları
- Olay kayıtları
- Kamera notları
- Tur kontrol sistemi
- Vardiya takibi

## 14. Ziyaretçi Yönetimi
Amaç: Misafir girişlerinin kontrolü.
- QR davetiye
- Araç kaydı
- Giriş çıkış kayıtları
- Geçici kartlar
- Onay mekanizması

## 15. Geçiş Kontrol Sistemi
Amaç: Fiziksel erişimin yönetimi.
- QR geçiş
- NFC geçiş
- Kartlı geçiş
- Plaka tanıma
- Bariyer entegrasyonu
- Turnike entegrasyonu

## 16. Otopark Yönetimi
Amaç: Araç ve park alanı takibi.
- Park alanları
- Araç kayıtları
- Misafir araçları
- Park rezervasyonu
- Plaka sorgulama

## 17. Kargo Yönetimi
Amaç: Teslimatların takibi.
- Kargo kabul
- Teslim işlemleri
- Barkod okutma
- Bildirim gönderimi

## 18. Sosyal Tesis Rezervasyonları
Amaç: Ortak alan rezervasyonlarının yönetimi.
- Havuz
- Spor salonu
- Kortlar
- Toplantı salonları
- Misafir dairesi
- Barbekü alanları

## 19. Duyuru ve İletişim Merkezi
Amaç: Sakinlerle iletişim kurmak.
- Duyurular
- Haberler
- SMS
- E-posta
- Push bildirimleri
- WhatsApp bildirimleri

## 20. Anket ve Oylama
Amaç: Karar alma süreçlerinin dijitalleşmesi.
- Anket oluşturma
- Elektronik oylama
- Genel kurul oylamaları
- Sonuç raporları

## 21. Doküman Yönetimi
Amaç: Belgelerin merkezi saklanması.
- Karar defteri
- Tutanaklar
- Sözleşmeler
- Ruhsatlar
- Sigorta poliçeleri
- Faturalar

## 22. Hukuk Modülü
Amaç: Borç ve dava süreçlerinin takibi.
- İcra dosyaları
- Avukat yönetimi
- Dava takibi
- Hukuki evraklar

## 23. Raporlama ve Analitik
Amaç: Yöneticilerin karar vermesini kolaylaştırmak.
- Dashboard
- Tahsilat oranları
- Borçlu listeleri
- Gelir gider raporları
- KPI göstergeleri
- Grafikler

## 24. Mobil Uygulama
**Sakin Uygulaması:**
- Borç görüntüleme
- Aidat ödeme
- Talep açma
- Rezervasyon yapma
- Ziyaretçi oluşturma

**Yönetici Uygulaması:**
- Onay işlemleri
- Finans raporları
- Talep yönetimi
- Duyuru yayınlama

## 25. Yapay Zeka Modülleri
Rakiplerden ayrışmayı sağlayacak modül.
- AI Site Asistanı
- AI Muhasebe Yardımcısı
- AI Duyuru Üretici
- AI Raporlama
- AI Talep Sınıflandırma
- AI Çağrı Merkezi

## 26. Entegrasyonlar
- E-Fatura
- E-Arşiv
- SMS servisleri
- WhatsApp Business
- Sanal POS
- Bankalar
- Kamera sistemleri
- PDKS
- Plaka tanıma sistemleri
- IoT sayaçlar
- E-İmza

---

## Önerilen Teknoloji Mimarisi (kaynak dokümandaki öneri)

| Katman | Teknoloji |
|---|---|
| Frontend | React + TypeScript + MUI |
| Mobil | React Native |
| Backend | NestJS |
| Veritabanı | PostgreSQL |
| Cache | Redis |
| Queue | RabbitMQ |
| Dosya Depolama | MinIO |
| Kimlik Doğrulama | JWT + Refresh Token + 2FA |
| Bildirim | Firebase FCM |
| Yapay Zeka | Ollama + OpenAI |
| Mimari | Multi-Tenant SaaS |

**Tahmini büyüklük:** 100+ ekran, 150+ API, 100+ tablo, Web + Mobil + Yönetici Paneli.
