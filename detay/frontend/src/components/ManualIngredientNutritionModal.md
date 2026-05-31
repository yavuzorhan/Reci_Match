# ManualIngredientNutritionModal.jsx — Manuel Besin Değeri Girişi

## Bu Dosya Ne İçin Var?

Gemini AI'ın besin değerini bulamadığı malzemeler için kullanıcının manuel olarak kalori, protein, karbonhidrat ve yağ değerlerini gireceği modal pencere.

## Mimarideki Yeri

**Katman:** Frontend Bileşen (Modal)

- `AddRecipeForm.jsx` → `manual_required` durumunda açılır
- `AppContext` → `createManualIngredient()`

## Ne Zaman Görünür?

Backend `{"status": "manual_required", "ingredient_name": "X"}` döndürünce:
1. Kullanıcıya "X malzemesinin besin değeri bulunamadı" mesajı
2. Kalori, protein, karbonhidrat, yağ girişi (100g başına)
3. "Kaydet" → `POST /api/users/{id}/ingredients/manual`

## Kayıt Sonrası

Manuel girilmiş malzeme `nutrition_source = "manual"`, `nutrition_confidence = 0.4` olarak kaydedilir. Düşük güven skoru, bu verinin doğrulanmamış olduğunu gösterir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kullanıcı yanlış değer girerse ne olur?**
  C: Doğrulama yok (kullanıcının ne girdiğini bilemeyiz). Sonraki tarif health score'unu etkiler. Kullanıcı sorumluluğunda.

- **S: Bu modal kapatılırsa tarif eklenemez mi?**
  C: Modal kapatılırsa o malzeme dahil tarif eklenemez. Kullanıcı malzemeyi çıkarmayı veya manuel değer girmeyi seçebilir.
