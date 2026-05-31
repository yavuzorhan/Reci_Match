# ReciMatch — Dokümantasyon Okuma Sırası

Bu klasör, ReciMatch projesinin tüm kod dosyalarını açıklamak amacıyla hazırlanmıştır.
Bir hoca veya teknik izleyici aşağıdaki sırayı izleyerek projeyi kolayca anlayabilir.

## Önerilen Okuma Sırası

### 1. Veri Katmanı (Temel)
1. `veritabani/TABLOLAR_VE_ILISKILER.md` — Tüm veritabanı yapısı
2. `veritabani/DB_BAGLANTISI.md` — Bağlantı ve session yönetimi
3. `backend/app/db/models.md` — SQLAlchemy model sınıfları

### 2. Backend Çekirdek
4. `backend/main.md` — Uygulamanın başlangıç noktası
5. `backend/app/config/settings.md` — Ortam değişkenleri
6. `backend/app/db/database.md` — Veritabanı bağlantısı

### 3. Şemalar ve Validasyon
7. `backend/app/schemas/user.md`
8. `backend/app/schemas/recipe.md`
9. `backend/app/schemas/ingredient.md`
10. `backend/app/schemas/auth.md`
11. `backend/app/schemas/recipe_revision.md`

### 4. Repository Katmanı (SQL Sorgular)
12. `backend/app/repositories/recipe_repository.md`
13. `backend/app/repositories/user_repository.md`
14. `backend/app/repositories/ingredient_repository.md`

### 5. Servis Katmanı (İş Mantığı)
15. `backend/app/services/auth_service.md`
16. `backend/app/services/gemini_client.md`
17. `backend/app/services/ingredient_resolver_service.md`
18. `backend/app/services/nutrition_resolver_service.md`
19. `backend/app/services/ingredient_nutrition_service.md`
20. `backend/app/services/ingredient_service.md`
21. `backend/app/services/ingredient_matching_service.md`
22. `backend/app/services/recipe_service.md`
23. `backend/app/services/recipe_revision_service.md`
24. `backend/app/services/recipe_import_service.md`
25. `backend/app/services/healthy_recipe_service.md`
26. `backend/app/services/user_service.md`

### 6. Yardımcı Araçlar (Utils)
27. `backend/app/utils/recipe_health.md` ← EN ÖNEMLİ
28. `backend/app/utils/recipe_helpers.md`
29. `backend/app/utils/helpers.md`
30. `backend/app/utils/text_normalize.md`
31. `backend/app/utils/mailer.md`

### 7. Router (API Endpoint) Katmanı
32. `backend/app/routers/auth.md`
33. `backend/app/routers/recipes.md`
34. `backend/app/routers/users.md`
35. `backend/app/routers/ingredients.md`

### 8. Frontend
36. `frontend/src/context/AppContext.md` ← ÖNEMLİ
37. `frontend/src/utils/recipeInsights.md`
38. `frontend/src/components/Layout.md`
39. `frontend/src/components/RecipeCard.md`
40. `frontend/src/components/AddRecipeForm.md`
41. `frontend/src/components/IngredientPicker.md`
42. `frontend/src/components/RecipeRevisionModal.md`
43. `frontend/src/components/ManualIngredientNutritionModal.md`
44. `frontend/src/pages/Login.md`
45. `frontend/src/pages/Register.md`
46. `frontend/src/pages/Dashboard.md`
47. `frontend/src/pages/IngredientSelection.md`
48. `frontend/src/pages/Recommendations.md`
49. `frontend/src/pages/RecipeDetailDb.md`
50. `frontend/src/pages/RecipeListDb.md`
51. `frontend/src/pages/FavoritesDb.md`
52. `frontend/src/pages/HealthyMenu.md`
53. `frontend/src/pages/HealthyResults.md`
54. `frontend/src/pages/Pantry.md`
55. `frontend/src/pages/ProfileEdit.md`
56. `frontend/src/pages/ProfileSetup.md`
57. `frontend/src/pages/WeeklyLogs.md`
58. `frontend/src/pages/DislikedIngredients.md`
59. `frontend/src/pages/EditRecipe.md`
60. `frontend/src/pages/ForgotPassword.md`
61. `frontend/src/pages/ResetPassword.md`
62. `frontend/src/pages/VerifyEmail.md`

---

## Mimari Özet

```
Kullanıcı → React Frontend → FastAPI Backend → PostgreSQL
                                   ↓
                             Gemini AI (besin değeri + tarif revizyonu)
```

**Katmanlar:**
- **Router**: HTTP isteği alır, doğrular, servise iletir
- **Service**: İş mantığı burada, DB sorgularını repository'den çeker
- **Repository**: Ham SQL sorguları
- **Model**: Veritabanı tablo tanımları (SQLAlchemy ORM)
- **Schema**: Giren/çıkan veri yapıları (Pydantic doğrulama)
- **Utils**: Yardımcı fonksiyonlar (skor hesaplama, normalizasyon, e-posta)
