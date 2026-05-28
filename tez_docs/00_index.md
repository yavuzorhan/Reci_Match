# ReciMatch Tez Dokümanları — Index

Bu klasör, tez yazımında kullanılmak üzere proje kodu, DB sorguları ve güncel mimari kararlar üzerinden hazırlanmış teknik notları içerir.

---

## Dosya Listesi

| Dosya | Tez bölümü | İçerik |
|---|---|---|
| `01_teknoloji_yigini.md` | Teknoloji yığını | Backend, frontend ve altyapı teknolojileri; neden seçildikleri ve nerede kullanıldıkları |
| `02_veritabani_yapisi.md` | Veritabanı tasarımı | 13 tablo, ilişkiler, ER metni, örnek DB verileri, nutrition kolonları, migration geçmişi |
| `03_backend_mimari.md` | Backend mimarisi | Router → Service → Repository → Model katmanları, nutrition akışı, Gemini, öneri ve health score |
| `04_frontend_mimari.md` | Frontend mimarisi | Route haritası, Context API, component/page yapısı, tema ve kullanıcı akışları |
| `05_api_dokumantasyonu.md` | API dokümantasyonu | Auth, Ingredients, Recipes, Users, Nutrition ve Revision endpointleri |
| `06_scraper_ve_veri.md` | Veri toplama ve scraper | Güncel yemek.com scraper hattı, veri kaynakları, malzeme eşleştirme, DB istatistikleri |
| `07_test_ve_dogrulama.md` | Test ve doğrulama | Migration doğrulamaları, DB bütünlüğü, bilinen kısıtlamalar, performans notları |

---

## Codex 5.5 İçin Kullanım Talimatı

Bu klasörü tez yazımında kullanacak modele şu talimat verilebilir:

```text
tez_docs klasöründeki 00_index.md dosyasından başlayarak 01-07 arasındaki tüm dokümanları oku.
Tez metnini yazarken proje gerçeklerine bağlı kal:
- USDA kaldırıldı, Gemini 2.5 Flash aktif.
- Veritabanı güncel olarak 13 tablo.
- ingredients tablosunda 8 inline nutrition kolonu var.
- Aktif scraper yalnızca yemek.com/yemekcom_diet hattı.
- Besin değerlerinin bir kısmı manuel yaklaşık değerlerle dolduruldu.
Kod referanslarını dosya:satır formatıyla koru.
Tahmin yapma; belirsiz kalan yerde "proje kodunda doğrulanamadı" de.
```

---

## Güncel Sayısal Özet

| Metrik | Değer |
|---|---:|
| DB tablo sayısı | 13 |
| Ingredients | 241 |
| Recipes | 484 |
| Recipe ingredients | 3569 |
| Users | 4 |
| Ingredient categories | 14 |
| Recipe source: yemekcom | 271 |
| Recipe source: yemekcom_diet | 196 |
| Recipe source: custom | 17 |
| Nutrition pozitif kayıt | 237 |
| Gerçek 0 kalorili kayıt | 4 |
