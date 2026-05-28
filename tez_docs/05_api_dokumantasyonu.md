# ReciMatch — API Dokümantasyonu

Endpoint listesi `backend/app/routers/*.py` dosyaları ve `backend/app/schemas/*.py` şemaları okunarak çıkarılmıştır. Tüm yollar `/api` prefix’i altındadır.

---

## Auth

### POST `/api/register`

Kullanıcı kayıt isteği oluşturur ve doğrulama kodu gönderir (`auth.py:23`).

Request:

```json
{ "name": "Yavuz Orhan", "email": "user@example.com", "password": "secret" }
```

Response örneği:

```json
{ "message": "Dogrulama kodu gonderildi." }
```

Hatalar: `400` kayıt bilgisi geçersiz, `422` schema hatası, `500` mail/DB hatası.

### POST `/api/verify`

E-posta doğrulama (`auth.py:28`).

```json
{ "email": "user@example.com", "code": "123456" }
```

Başarılı response kullanıcı ve profil bilgisi döndürür.

### POST `/api/login`

Giriş (`auth.py:33`).

```json
{ "email": "user@example.com", "password": "secret" }
```

Hatalar: `401/400` hatalı şifre veya doğrulanmamış hesap, `422` schema.

### POST `/api/forgot-password`

Şifre sıfırlama OTP gönderir (`auth.py:38`).

```json
{ "email": "user@example.com" }
```

### POST `/api/reset-password`

OTP ile yeni şifre kaydeder (`auth.py:43`).

```json
{ "email": "user@example.com", "code": "123456", "new_password": "newSecret" }
```

### POST `/api/users/{user_id}/request-otp`

Profil güvenlik işlemleri için OTP (`auth.py:50`).

```json
{ "email": "new@example.com" }
```

### POST `/api/users/{user_id}/update-password`

OTP ile şifre günceller (`auth.py:55`).

### POST `/api/users/{user_id}/update-email`

OTP ile e-posta günceller (`auth.py:60`).

---

## Ingredients / Nutrition

### GET `/api/ingredients/categorized`

Kategorilere ayrılmış malzemeleri döndürür (`ingredients.py:24`). Query olarak `user_id` kullanılabilir.

Response:

```json
[
  { "category_id": 1, "category_name": "Sebzeler", "ingredients": [{ "id": 3, "name": "biber" }] }
]
```

### POST `/api/users/{user_id}/custom-ingredients`

Kullanıcıya özel malzeme oluşturur (`ingredients.py:32`).

```json
{ "name": "özel sos", "category_id": 9 }
```

### POST `/api/ingredients/resolve`

Malzeme adını çözer; gerekirse Gemini nutrition çağırır (`ingredients.py:41`).

```json
{ "ingredient_name": "tavuk göğsü", "user_id": 7 }
```

Hata: Gemini free tier dolduğunda `429`.

### POST `/api/users/{user_id}/ingredients/manual`

Manuel nutrition ile malzeme oluşturur (`ingredients.py:63`). Güncel sistem 8 nutrition kolonu kullanır.

```json
{
  "ingredient_name": "tavuk göğsü",
  "calorie_per_100g": 165,
  "protein_per_100g": 31,
  "carbohydrate_per_100g": 0,
  "fat_per_100g": 3.6
}
```

### GET/POST `/api/users/{user_id}/ingredients`

Kiler malzemelerini okur/günceller (`ingredients.py:86`, `ingredients.py:91`).

```json
{ "ingredient_ids": [1, 3, 9] }
```

### GET/POST `/api/users/{user_id}/disliked-ingredients`

Sevilmeyen malzemeleri okur/günceller (`ingredients.py:98`, `ingredients.py:103`).

### GET `/api/ingredients/{ingredient_id}/nutrition`

Inline nutrition değerlerini döndürür (`ingredients.py:108`).

### POST `/api/ingredients/nutrition/sync`

Tek malzemeyi Gemini ile sync eder (`ingredients.py:113`).

```json
{ "ingredient_id": 235 }
```

### POST `/api/ingredients/nutrition/sync-missing`

Eksik nutrition kayıtlarını limit kadar tamamlar (`ingredients.py:118`).

```json
{ "limit": 20 }
```

---

## Recipes

### GET `/api/recipe-image`

Dış görsel URL’sini proxy eder (`recipes.py:20`). Query: `url`.

### GET `/api/recipes`

Tarif listesi (`recipes.py:45`). Query: `user_id`, `ids`, `source`, `recipe_category`, `healthy_only`.

Response örneği:

```json
[{ "id": 1, "name": "Menemen", "calorie": 250, "health_grade": "B" }]
```

### GET `/api/recipes/{recipe_id}`

Tarif detayı (`recipes.py:57`): malzemeler, preparation, makrolar, health score, nutrition confidence.

### POST `/api/recipes/recommendations`

Tarif önerisi (`recipes.py:62`).

```json
{
  "selected_ingredient_ids": [1, 3],
  "pantry_ingredient_ids": [9],
  "disliked_ingredient_ids": [],
  "cooking_types": ["Tava"],
  "exclude_disliked": true,
  "user_id": 7,
  "healthy_only": false
}
```

### POST `/api/healthy-recipes/sync`

`healthy_recipes` tablosunu günceller (`recipes.py:80`). Güncel kaynak listesi yalnızca `yemekcom_diet` (`healthy_recipe_service.py:10`).

### POST `/api/users/{user_id}/custom-recipes`

Kullanıcı tarifi oluşturur (`recipes.py:104`). Body `CustomRecipeCreate` şemasını kullanır.

### PUT `/api/users/{user_id}/custom-recipes/{recipe_id}`

Custom tarif günceller (`recipes.py:126`).

### DELETE `/api/users/{user_id}/custom-recipes/{recipe_id}`

Custom tarif siler (`recipes.py:150`).

### POST `/api/recipes/{recipe_id}/image`

Tarif görseli yükler (`recipes.py:159`). `multipart/form-data`, `UploadFile`.

### POST `/api/recipes/custom`

Eski uyumluluk endpoint’i (`recipes.py:169`).

---

## Revision

### POST `/api/recipes/{recipe_id}/revise`

Gemini ile tarif revizyonu (`recipes.py:85`).

```json
{
  "remove_ingredients": ["krema"],
  "add_ingredients": [{ "name": "yoğurt", "amount": "2", "unit": "yemek kaşığı" }],
  "adjust_amounts": [{ "ingredient": "tuz", "new_amount": "az" }],
  "free_text_request": "Daha hafif yap"
}
```

Hatalar: `404` tarif yok, `429` Gemini quota, `502` Gemini API hatası.

### POST `/api/recipes/{recipe_id}/revise/save`

Revize tarifi yeni custom tarif olarak kaydeder (`recipes.py:95`).

---

## Users

### GET/PUT `/api/users/{user_id}/profile`

Profil okuma/güncelleme (`users.py:20`, `users.py:25`). Body: age, gender, height_cm, weight_kg, objective, meals, activity.

### GET `/api/users/{user_id}/favorites`

Favorileri listeler (`users.py:40`).

### POST `/api/users/{user_id}/favorites`

Favori ekler (`users.py:45`).

```json
{ "recipe_id": 100 }
```

### DELETE `/api/users/{user_id}/favorites/{recipe_id}`

Favori siler (`users.py:50`).

### GET `/api/users/{user_id}/daily-logs`

Günlük logları listeler (`users.py:55`).

### POST `/api/users/{user_id}/daily-logs`

Günlük log ekler (`users.py:60`).

```json
{
  "recipe_id": 100,
  "meal_type": "Öğle",
  "serving_count": 1,
  "log_date": "2026-05-28",
  "entry_source": "daily"
}
```

### PUT `/api/users/{user_id}/daily-logs/{log_id}`

Log günceller (`users.py:83`).

### DELETE `/api/users/{user_id}/daily-logs/{log_id}`

Log siler (`users.py:78`).

### GET `/api/users/{user_id}/daily-logs/totals`

Günlük toplamları döndürür (`users.py:103`).

---

## Genel Hata Durumları

| Kod | Anlam |
|---:|---|
| 400 | Geçersiz iş kuralı veya eksik veri |
| 404 | Kullanıcı/tarif/malzeme bulunamadı |
| 422 | Pydantic schema doğrulama hatası |
| 429 | Gemini API rate limit/quota |
| 500 | Beklenmeyen sunucu hatası |
| 502 | Gemini veya görsel proxy gibi dış servis hatası |
