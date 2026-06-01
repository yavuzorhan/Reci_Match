# Gemini ile Tarif Revizyonu Akisi

Bu akis `recipe_revision_service.py` dosyasinda calisir.

## Adim Adim Akis

1. Kullanici frontend'de bir tarifi revize etmek ister.
// Ne oluyor: Kullanici malzeme ekleme, cikarma veya miktar degistirme gibi istekler girer.
// Neden gerekli: Gemini'ye hangi degisikliklerin istenecegi belirtilmelidir.

2. Frontend `/api/recipes/{recipe_id}/revise?user_id=...` endpoint'ine POST istegi atar.
// Ne oluyor: Tarif ID, kullanici ID ve revizyon istegi backend'e gider.
// Neden gerekli: Backend hangi tarifi revize edecegini ve istegin kimden geldigini bilmelidir.

3. `recipes.py` router'i `recipe_revision_service.revise_recipe(...)` fonksiyonunu cagirir.
// Ne oluyor: Router istegi service katmanina aktarir.
// Neden gerekli: Gemini, cache ve filtreleme mantigi service'te tutulur.

4. Servis orijinal tarifi DB'den malzemeleriyle birlikte alir.
// Ne oluyor: `recipes` ve `recipe_ingredients` iliskileri okunur.
// Neden gerekli: Gemini orijinal tarifi bilmeden dogru revizyon yapamaz.

5. Revizyon isteginden hash uretilir.
// Ne oluyor: Istenen degisiklik JSON'a cevrilip SHA-256 ile ozetlenir.
// Neden gerekli: Ayni istek daha once yapildiysa cache'ten cevap donmek icin.

6. `revision_cache` tablosunda ayni tarif ve ayni hash aranir.
// Ne oluyor: Daha once uretilmis Gemini cevabi var mi kontrol edilir.
// Neden gerekli: Gemini API'ye gereksiz tekrar istek atilmasin diye.

7. Cache yoksa Gemini prompt'u hazirlanir.
// Ne oluyor: Orijinal tarif, istenen degisiklikler, orijinal malzemeler ve kurallar prompt'a yazilir.
// Neden gerekli: Gemini sadece istenen degisiklikleri yapsin, alakasiz malzeme uydurmasin diye.

8. Gemini 2.5 Flash modeline istek atilir.
// Ne oluyor: Modelden JSON formatinda revize tarif istenir.
// Neden gerekli: Frontend ve backend cevabi kolayca isleyebilsin diye.

9. Gemini cevabi JSON'a cevrilir.
// Ne oluyor: Markdown kod blogu varsa temizlenir, `json.loads` ile dict yapilir.
// Neden gerekli: Backend metinle degil veri yapisiyla calisir.

10. Malzeme listesi filtrelenir.
// Ne oluyor: Sadece orijinal malzemeler ve kullanicinin eklemek istedigi malzemeler kalir.
// Neden gerekli: Gemini'nin uydurdugu alakasiz malzemeler kaydedilmesin diye.

11. Cevap `revision_cache` tablosuna kaydedilir.
// Ne oluyor: Tarif ID, degisiklik hash'i ve cevap JSON'u DB'ye yazilir.
// Neden gerekli: Ayni revizyon tekrar istenirse hizli cevap donmek icin.

12. Frontend revize tarifi ekranda gosterir.
// Ne oluyor: Kullanici sonucu inceler.
// Neden gerekli: Kullanici kaydetmeden once revizyonu kontrol edebilsin diye.

13. Kullanici kaydet derse `/api/recipes/{recipe_id}/revise/save` endpoint'i calisir.
// Ne oluyor: Revize tarif backend'e tekrar gonderilir.
// Neden gerekli: AI cevabi kalici kullanici tarifine donussun diye.

14. Backend `create_custom_recipe` akisiyle yeni tarif kaydeder.
// Ne oluyor: `recipes` ve `recipe_ingredients` tablolarina yeni kullanici tarifi yazilir.
// Neden gerekli: Revize tarif normal tariflerle ayni sistemde saklansin diye.

## Hocaya 1 Dakikada Anlat

// Kullanici revizyon istegini gonderiyor.
// Backend orijinal tarifi DB'den aliyor.
// Ayni istek daha once yapildi mi diye cache kontrol ediyor.
// Cache yoksa Gemini'ye kontrollu prompt gonderiyor.
// Gemini JSON cevap donuyor.
// Backend alakasiz/uydurma malzemeleri filtreliyor.
// Cevap cache'e kaydediliyor.
// Kullanici kaydederse revize tarif yeni ozel tarif olarak veritabanina yaziliyor.

