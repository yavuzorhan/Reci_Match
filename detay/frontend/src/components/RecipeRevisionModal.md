# RecipeRevisionModal.jsx — Tarif Revizyon Modal

## Bu Dosya Ne İçin Var?

Kullanıcının mevcut bir tarifi Gemini AI ile değiştirmesini sağlayan modal pencere. Malzeme ekleme/çıkarma, diyet notu, porsiyon değişimi gibi istekler buradan girilir.

## Mimarideki Yeri

**Katman:** Frontend Bileşen (Modal)

- `RecipeDetailDb.jsx` → "Revize Et" butonuyla açılır
- `AppContext` → `reviseRecipe()`, `saveRevisedRecipe()`

## Kullanıcı Akışı

```
"Revize Et" butonuna bas →
    Modal açılır →
    Değişiklikler girilir:
        - Eklenecek malzemeler
        - Çıkarılacak malzemeler  
        - Serbest not ("az yağlı yap")
        - Porsiyon sayısı
    "Önizle" butonu →
        POST /api/recipes/{id}/revise →
        Gemini yanıtı → revize tarif önizlemesi →
    "Kaydet" butonu →
        POST /api/recipes/{id}/revise/save →
        Yeni kişisel tarif oluşturulur →
        Modal kapanır → tarif listesine git
```

## Önbellek Göstergesi

Backend `cached: true` döndürünce "Önbellekten yüklendi" göstergesi çıkar. Gemini çağrısı yapılmadığını bildirir.

## Hata Durumları

- **429:** Gemini günlük limit doldu → "Lütfen birkaç dakika sonra deneyin"
- **manual_required:** Eklenen malzemenin besin değeri bulunamadı → El ile giriş istenir

## Sıkça Sorulabilecek Hoca Soruları

- **S: Revizyon geri alınabilir mi?**
  C: Orijinal tarif değişmediği için geri alma gerekmez. Revizyon yeni bir tarif olarak kaydedilir; istenmezse silinir.

- **S: Aynı revizyonu tekrar yapınca ne kadar sürer?**
  C: Anlık — önbellekten döner. SHA-256 hash eşleşirse Gemini çağrılmaz.
