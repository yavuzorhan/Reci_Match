# Tarif Oneri Akisi

## Adim Adim Akis

1. Kullanici frontend'de malzemelerini secer.
// Ne oluyor: Secilen malzemelerin ID'leri frontend state'inde tutulur.
// Neden gerekli: Backend tarifleri malzeme ID'leri uzerinden eslestirir.

2. Kullanici isterse dolabindaki malzemeleri ve sevilmeyen malzemeleri de ekler.
// Ne oluyor: Pantry ve disliked ingredient listeleri istege dahil edilir.
// Neden gerekli: Oneri skoru kullanicinin elindeki ve istemedigi malzemelere gore degisir.

3. Frontend `/api/recipes/recommendations` endpoint'ine POST istegi atar.
// Ne oluyor: `selected_ingredient_ids`, `pantry_ingredient_ids`, `disliked_ingredient_ids` backend'e gider.
// Neden gerekli: Backend hangi tariflerin uygun oldugunu hesaplamak icin bu listeleri kullanir.

4. `recipes.py` icindeki `get_recipe_recommendations` endpoint'i istegi alir.
// Ne oluyor: Request body `RecipeRecommendationRequest` schema ile okunur.
// Neden gerekli: Gelen verinin beklenen formatta oldugu kontrol edilir.

5. Router `recipe_service.get_recommendations(...)` fonksiyonunu cagirir.
// Ne oluyor: Tarif eslestirme is mantigi service katmanina gecer.
// Neden gerekli: Router sadece yonlendirme yapar, algoritma service'te durur.

6. Service secili malzemeleri, dolap malzemelerini ve sevilmeyenleri set'e cevirir.
// Ne oluyor: Tekrarlayan ID'ler temizlenir, hizli karsilastirma yapilir.
// Neden gerekli: Eslestirme algoritmasi set islemlerinden yararlanir.

7. Malzeme ID'leri DB'den malzeme adlarina cevrilir.
// Ne oluyor: `recipe_repository.get_ingredients_by_ids` calisir.
// Neden gerekli: Eslestirme sadece ID ile degil, normalize edilmis malzeme adlariyla yapilir.

8. Kullaniciya gorunebilen tarifler DB'den alinir.
// Ne oluyor: Global tarifler ve kullaniciya ait ozel tarifler gelir.
// Neden gerekli: Kullanici baskasinin ozel tariflerini gormemelidir.

9. Her tarifin malzemeleri kullanicinin malzemeleriyle karsilastirilir.
// Ne oluyor: Eslesen, eksik ve sevilmeyen malzemeler listelenir.
// Neden gerekli: Skor ve aciklama bu listelerden uretilir.

10. Tarif skoru hesaplanir.
// Ne oluyor: Secili malzeme eslesmesi, dolap eslesmesi, tarif uyumu ve sevilmeyen malzeme cezasi birlestirilir.
// Neden gerekli: En uygun tarifler listenin en ustunde gosterilsin diye.

11. Sonuclar skora gore siralanir.
// Ne oluyor: Yuksek skorlu tarifler once gelir.
// Neden gerekli: Kullanici en uygun tarifi hemen gorsun diye.

12. Frontend sonuc listesini ekranda gosterir.
// Ne oluyor: Tarif kartlari, skor, eslesen ve eksik malzemeler gorunur.
// Neden gerekli: Kullanici tarifin neden onerildigini anlayabilsin diye.

## Hocaya 1 Dakikada Anlat

// Kullanici malzemelerini backend'e gonderiyor.
// Backend once malzeme ID'lerini isimlere ceviriyor.
// Sonra gorunebilir tarifleri DB'den aliyor.
// Her tarifin malzemeleri kullanicinin malzemeleriyle karsilastiriliyor.
// Eslesen malzeme arttikca skor artiyor, sevilmeyen malzeme varsa skor dusuyor veya tarif eleniyor.
// Sonuclar en yuksek skordan dusuge siralanip frontend'e donuyor.

