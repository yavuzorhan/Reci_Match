# Besin Degeri Cozumleme Akisi

Bu akis malzeme ve tariflerin kalori/protein/karbonhidrat/yag degerlerinin nasil elde edildigini anlatir.

## Genel Mantik

1. Sistemde her malzeme `ingredients` tablosunda tutulur.
// Ne oluyor: Malzeme adi ve 100 gram basina besin degerleri saklanir.
// Neden gerekli: Tarif besin hesabi malzemeler uzerinden yapilir.

2. Kullanici tarif eklerken malzeme girer.
// Ne oluyor: Malzeme ID veya malzeme adi backend'e gelir.
// Neden gerekli: Tarifin hangi malzemelerden olustugu bilinmelidir.

3. Backend malzemeyi `resolve_ingredient_for_user` ile cozmeye calisir.
// Ne oluyor: Malzeme DB'de var mi, kullaniciya ozel mi, global mi kontrol edilir.
// Neden gerekli: Tarif kaydinda gercek bir `ingredient_id` kullanilmalidir.

4. Malzemenin besin degeri yoksa otomatik cozum denenir.
// Ne oluyor: Servis DB/AI/manual akislarindan besin bilgisi bulmaya calisir.
// Neden gerekli: Kalori hesabi icin 100 gram basina degerler gerekir.

5. Otomatik cozum olmazsa `manual_required` doner.
// Ne oluyor: Frontend kullanicidan manuel besin bilgisi isteyebilir.
// Neden gerekli: Bilinmeyen malzemeyle hatali kalori hesabi yapilmasin diye.

6. Miktar gram karsiligina cevrilir.
// Ne oluyor: `unit_to_grams` miktar ve birimi gram degerine cevirmeye calisir.
// Neden gerekli: Besin degerleri 100 gram uzerinden hesaplanir.

7. Tarif toplam besin degeri hesaplanir.
// Ne oluyor: Her malzemenin gram miktari ve 100g besin degeri kullanilir.
// Neden gerekli: Tarifin toplam kalori, protein, karbonhidrat ve yag degeri bulunur.

8. Hesaplanan degerler `recipes` tablosuna yazilir.
// Ne oluyor: Tarif kaydinda `calorie`, `protein`, `carbohydrate`, `fat` alanlari dolar.
// Neden gerekli: Listeleme, detay ve gunluk log ekranlari bu degerleri kullanir.

## Formul Mantigi

```text
malzeme_kalorisi = miktar_gram / 100 * calorie_per_100g
```

// Ne yapiyor: Malzemenin tarifteki miktarina gore kalori katkisini hesaplar.
// Neden gerekli: Veritabaninda degerler 100g basina tutulur ama tarifte miktar farkli olabilir.

```text
toplam_kalori = tum_malzeme_kalorilerinin_toplami
```

// Ne yapiyor: Tarifin toplam kalorisini hesaplar.
// Neden gerekli: Tarif kartinda ve gunluk logda kalori bilgisi gosterilir.

## Hocaya 1 Dakikada Anlat

// Her malzemenin 100 gram basina besin degeri `ingredients` tablosunda tutuluyor.
// Kullanici tarif ekleyince malzemeler DB kayitlariyla eslestiriliyor.
// Miktar gram karsiligina cevriliyor.
// Gram miktari ile 100g besin degeri carpilip malzemenin katkisi bulunuyor.
// Tum malzemeler toplaninca tarifin toplam kalori ve makro degerleri olusuyor.
// Eger malzeme bilinmiyorsa sistem manuel bilgi istiyor.

