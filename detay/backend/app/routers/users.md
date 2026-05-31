# routers/users.py — Kullanıcı API Endpoint'leri

## Bu Dosya Ne İçin Var?

Kullanıcı profili, favoriler, dolap içeriği, sevilmeyen malzemeler ve günlük loglar için HTTP endpoint'lerini tanımlar.

## Mimarideki Yeri

**Katman:** Router (HTTP Giriş Noktası)

- İstemci → Bu router → `user_service.py`

## Endpoint'ler

| Method | URL | Açıklama |
|--------|-----|----------|
| GET | `/api/users/{id}/profile` | Profil bilgisi |
| PUT | `/api/users/{id}/profile` | Profil güncelle |
| GET | `/api/users/{id}/favorites` | Favori tarif ID listesi |
| POST | `/api/users/{id}/favorites` | Favoriye ekle |
| DELETE | `/api/users/{id}/favorites/{recipe_id}` | Favoriden çıkar |
| GET | `/api/users/{id}/ingredients` | Dolap içeriği |
| POST | `/api/users/{id}/ingredients` | Dolaba ekle |
| DELETE | `/api/users/{id}/ingredients/{ing_id}` | Dolabdan çıkar |
| GET | `/api/users/{id}/disliked-ingredients` | Sevilmeyen malzemeler |
| POST | `/api/users/{id}/disliked-ingredients` | Sevilmeyen ekle |
| DELETE | `/api/users/{id}/disliked-ingredients/{ing_id}` | Sevil. çıkar |
| GET | `/api/users/{id}/daily-logs` | Günlük loglar |
| POST | `/api/users/{id}/daily-logs` | Log ekle |
| DELETE | `/api/users/{id}/daily-logs/{log_id}` | Log sil |
| POST | `/api/users/{id}/ingredients/manual` | Manuel malzeme ekle |

## Kullanıcı İzolasyonu

URL'deki `{id}` her zaman işlem yapılan kullanıcının ID'si. Servis katmanı bu ID ile sadece o kullanıcının verisini döndürür.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Başka kullanıcının profiline erişilebilir mi?**
  C: Teknik olarak `/api/users/5/profile` başka biri `user_id=5` bilirse erişebilir. Gerçek yetkilendirme için JWT + middleware gerekir. Bu proje kapsamında basit tutuldu.
