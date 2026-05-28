# ReciMatch — Frontend Mimari

Bu belge `frontend/src` altındaki gerçek React koduna göre hazırlanmıştır. Frontend React 19 + Vite, React Router DOM ve Context API üzerine kuruludur.

---

## 4a. Sayfa Haritası

Route yapısı `frontend/src/App.jsx:37-65` arasında tanımlıdır.

| Path | Sayfa | Ana işlev | API kullanımı |
|---|---|---|---|
| `/login` | `Login.jsx` | Giriş | `POST /api/login` |
| `/register` | `Register.jsx` | Kayıt | `POST /api/register` |
| `/forgot-password` | `ForgotPassword.jsx` | Şifre sıfırlama isteği | `POST /api/forgot-password` |
| `/reset-password` | `ResetPassword.jsx` | Yeni şifre | `POST /api/reset-password` |
| `/verify-email` | `VerifyEmail.jsx` | OTP doğrulama | `POST /api/verify` |
| `/setup` | `ProfileSetup.jsx` | İlk profil | `PUT /api/users/{id}/profile` |
| `/dashboard` | `Dashboard.jsx` | Günlük özet | Context: profile, daily logs, recommendations |
| `/select-ingredients` | `IngredientSelection.jsx` | Malzeme seçimi | `GET /api/ingredients/categorized` |
| `/recommendations` | `Recommendations.jsx` | Tarif önerileri | `POST /api/recipes/recommendations` |
| `/pantry` | `Pantry.jsx` | Kiler yönetimi | `GET/POST /api/users/{id}/ingredients` |
| `/recipes` | `RecipeListDb.jsx` | Tarif listesi | `GET /api/recipes` |
| `/recipe/:id` | `RecipeDetailDb.jsx` | Tarif detayı | `GET /api/recipes/{id}`, daily log, revision |
| `/recipes/:id/edit` | `EditRecipe.jsx` | Custom tarif düzenleme | `PUT /api/users/{id}/custom-recipes/{recipe_id}` |
| `/healthy-menu` | `HealthyMenu.jsx` | Sağlıklı tarif listesi | `GET /api/recipes?healthy_only=true` |
| `/healthy-menu/results` | `HealthyResults.jsx` | Healthy sonuçları | recommendations + healthy recipes |
| `/healthy-menu/:id` | `RecipeDetailDb.jsx` | Healthy tarif detayı | `GET /api/recipes/{id}` |
| `/favorites` | `FavoritesDb.jsx` | Favoriler | `GET/POST/DELETE /api/users/{id}/favorites` |
| `/weekly-logs` | `WeeklyLogs.jsx` | Haftalık log | `GET/POST/PUT/DELETE /api/users/{id}/daily-logs` |
| `/profile-edit` | `ProfileEdit.jsx` | Profil ve güvenlik | profile, OTP, email/password update |

---

## 4b. Component ve Page Yapısı

Kodda API çağrıları çoğunlukla `AppContext.jsx` içinde merkezileştirilmiştir. Bazı sayfalar kendi local fetch çağrılarını yapar.

| Dosya | Props | State | API / Context |
|---|---|---|---|
| `AddRecipeForm.jsx` | `initialRecipe`, `onSaved` gibi form kullanımı | formData, ingredients, imageFile, manualIngredientName, searchTerm | `addCustomRecipe`, `updateCustomRecipe`, `createManualIngredient`, `/ingredients/categorized` |
| `IngredientPicker.jsx` | initial selection ve callback props | categories, selectedIds, searchTerm, activeCategory | `/ingredients/categorized`, `addCustomIngredient` |
| `ManualIngredientNutritionModal.jsx` | ingredientName, onSave, onClose | nutrition form values, loading, error | manuel nutrition payload |
| `RecipeRevisionModal.jsx` | recipe, onClose/onSaved | remove/add/adjust arrays, freeTextRequest, revised | `reviseRecipe`, `saveRevisedRecipe` |
| `Layout.jsx` | children | mobileMenuOpen, pillStyle | `useApp`, theme toggle |
| `RecipeCard.jsx` | recipe, favorite callbacks | çoğunlukla stateless | kart UI |

Sayfalar URL seviyesinde akışları temsil eder. Örneğin `RecipeDetailDb.jsx:141` context’ten `favorites`, `toggleFavorite`, `addDailyLog`, `fetchRecipeById` alır ve tarif detayını gösterir.

---

## 4c. Context API

Ana dosya `frontend/src/context/AppContext.jsx` dosyasıdır. Context `createContext()` ile `AppContext.jsx:6` satırında oluşturulur. Dosyada 9 adet `useState` kullanımı vardır:

- `user`
- `profile`
- `dislikedIngredients`
- `selectedIngredients`
- `pantryIngredients`
- `favorites`
- `dailyLogs`
- `recipeCache`
- `isDarkMode`

Öne çıkan exported fonksiyonlar `AppContext.jsx:443-474` aralığında value olarak paylaşılır:

- `fetchUserPreferences`
- `fetchAllRecipes`
- `fetchRecipeById`
- `fetchRecommendedRecipes`
- `fetchHealthyRecipes`
- `toggleFavorite`
- `addDailyLog`, `removeDailyLog`, `updateDailyLog`
- `addCustomIngredient`
- `addCustomRecipe`, `updateCustomRecipe`, `deleteCustomRecipe`
- `uploadRecipeImage`
- `reviseRecipe`, `saveRevisedRecipe`
- `createManualIngredient`
- `toggleDarkMode`

Login akışı: `Login.jsx` başarılı girişten sonra `setUser` ve `setProfile` çağırır. `AppContext.jsx:88` içindeki `fetchUserPreferences` kullanıcı değişince disliked, pantry, favorites, daily logs ve profile verilerini paralel çeker.

---

## 4d. Tema Sistemi

Tema iki kanaldan yönetilir:

- `body.dark-mode` class.
- Component köklerinde `data-theme="dark"` veya `data-theme="light"` attribute.

`AppContext.jsx:42` `isDarkMode` state’ini localStorage’dan okur. `toggleDarkMode` `AppContext.jsx:443` satırında state değiştirir. Auth sayfaları `Login.css` içinde `.auth-shell[data-theme="dark"]` ve `.auth-shell[data-theme="light"]` seçicileriyle ayrılır. Layout tabanlı sayfalarda `.layout-shell[data-theme="light"]` ve `.layout-shell:not([data-theme="dark"])` override’ları kullanılır.

CSS framework yoktur; vanilla CSS ve CSS variable yaklaşımı tercih edilmiştir.

---

## 4e. Kullanıcı Akışları

```text
Kayıt
  -> Register.jsx
  -> POST /api/register
  -> VerifyEmail.jsx
  -> POST /api/verify
  -> Login.jsx
  -> ProfileSetup.jsx
  -> Dashboard.jsx
```

Tarif öneri akışı:

```text
IngredientSelection.jsx
  -> selectedIngredients context'e yazılır
  -> Recommendations.jsx
  -> fetchRecommendedRecipes()
  -> POST /api/recipes/recommendations
  -> RecipeDetailDb.jsx
```

Günlük kayıt akışı:

```text
RecipeDetailDb.jsx
  -> porsiyon seçimi
  -> addDailyLog()
  -> POST /api/users/{id}/daily-logs
  -> Dashboard / WeeklyLogs güncellenir
```

Revizyon akışı:

```text
RecipeDetailDb.jsx
  -> RecipeRevisionModal.jsx
  -> reviseRecipe()
  -> POST /api/recipes/{recipe_id}/revise
  -> saveRevisedRecipe()
  -> POST /api/recipes/{recipe_id}/revise/save
```
