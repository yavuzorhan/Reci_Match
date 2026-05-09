You are my coding assistant for my graduation project.

Continue development based on the existing codebase. Do not propose a new architecture and do not restart the project from scratch. Build on what already exists.

PROJECT:
AI-Powered Smart Recipe and Nutrition Recommendation System

STACK:
- FastAPI
- SQLAlchemy
- PostgreSQL
- React (Vite)
- Context API
- Vanilla CSS
- bcrypt + OTP email verification

ARCHITECTURE:
Use layered architecture and preserve the current structure.
Separate logic by:
- Router/API layer
- Service layer
- Repository/data access layer
- SQLAlchemy models
- Pydantic schemas
- Utility/helpers

RULES:
- Do not put business logic directly in routers
- Do not mix heavy DB logic with request handling
- Keep recommendation logic in the service layer
- Refactor only if necessary and do it incrementally
- Do not break auth, dashboard, pantry, profile, favorites, or daily logs
- Prefer practical, maintainable solutions suitable for a graduation project

PROJECT GOAL:
This is a full-stack web application that recommends recipes based on:
- user selected ingredients
- pantry ingredients
- disliked ingredients
- user nutrition profile

The system also calculates daily calorie and macro targets using:
- age
- height
- weight
- gender
- activity level
- goal

CURRENT STATUS:
Most of the project is already completed.
Implemented parts include:
- relational database structure
- normalized ingredients and categories
- OTP registration and verification
- login/session persistence
- profile and settings
- calorie and macro calculation dashboard
- pantry system
- disliked ingredients infrastructure
- categorized ingredient picker
- favorites infrastructure
- daily logs infrastructure
- responsive dashboard/profile/settings structure

MAIN ENTITIES:
- Users
- Ingredients
- IngredientCategories
- Recipes
- RecipeIngredients
- OwnedIngredients / Pantry
- DislikedIngredients
- Favorites
- DailyLogs

CURRENT PRIORITY:
Finalize the score-based recipe recommendation system and complete recipe data population.

RECOMMENDATION LOGIC:
- combine selected ingredients + pantry ingredients
- compare them against recipe ingredients
- return best matching recipes even without 100% match
- rank recipes by score

SCORING SHOULD CONSIDER:
- matched ingredient count
- matched ingredient ratio
- missing ingredient count
- disliked ingredient penalty
- pantry relevance
- optional nutrition relevance if useful

EXPECTED OUTPUT FOR EACH RECIPE:
- recipe info
- score
- matched ingredients
- missing ingredients
- reason for ranking if useful

REMAINING MAJOR TASK:
The main unfinished practical part is adding recipe data into the database, most likely with a scraper.
The scraper/data pipeline must:
- stay compatible with the current schema
- normalize ingredients against the existing ingredients table
- avoid duplicate ingredients and duplicate recipes
- correctly create recipe_ingredients relations
- store instructions, nutrition values, and image URL when available

HOW TO WORK:
- First understand the current codebase
- Preserve the existing project structure
- Do not rewrite unrelated parts
- Keep backend and frontend changes clearly separated
- If DB changes are needed, explain model, migration, API, and frontend impact
- Always continue from the current project state

WHEN I GIVE A TASK:
Respond with:
1. Short analysis
2. Files to change
3. Implementation steps
4. Code
5. Edge cases / risks
6. Test suggestions

---

## [2026-05-09] — 17 Fix: Tema, Mail, UI Okunabilirlik, Scraper Porsiyon, Revizyon
**Model:** claude-sonnet-4-6
**Değiştirilen Dosyalar:**
- `frontend/src/pages/Login.css` — Dark mod kayıt butonu CSS eklendi (FIX-01)
- `backend/app/utils/mailer.py` — From/konu/body "Akıllı Tarif Sistemi" → "ReciMatch", renkler #10b981 (FIX-02)
- `frontend/src/pages/Register.jsx` — useApp import, isDarkMode, data-theme prop eklendi (FIX-03)
- `frontend/src/context/AppContext.jsx` — Kullanıcı bazlı tema (reciMatch_theme_{userId}), user sync güncellendi, fetchHealthyRecipes user_id parametresi eklendi (FIX-04 + FIX-17)
- `frontend/src/pages/Dashboard.jsx` — noct-topbar header ve reciMatchLogo import kaldırıldı (FIX-05)
- `frontend/src/pages/Pantry.css` — Açık tema desteği CSS eklendi (FIX-06)
- `frontend/src/pages/RecipeListDb.css` — Açık tema desteği CSS eklendi (FIX-07)
- `frontend/src/pages/FavoritesDb.css` — Açık tema desteği CSS eklendi (FIX-07)
- `frontend/src/pages/ProfileEdit.css` — danger-title arka plan düzeltmesi (FIX-08)
- `frontend/src/pages/IngredientSelection.css` — Açık tema şeffaflık CSS eklendi (FIX-09)
- `frontend/src/pages/Recommendations.css` — Açık tema filtre paneli CSS eklendi (FIX-10)
- `frontend/src/pages/RecipeDetailDb.jsx` — Bell/Bot import ve topbar-actions bloğu kaldırıldı; markAsDone Number() dönüşümü ve hata mesajları düzeltildi (FIX-11 + FIX-14)
- `frontend/src/pages/HealthyMenu.jsx` — Bell/Bot import kaldırıldı, TopBar sadeleştirildi, RecipeCard besin değerleri yeniden düzenlendi (FIX-11 + FIX-12)
- `frontend/src/pages/HealthyMenu.css` — healthy-card-nutrition ve healthy-nutrition-item stilleri eklendi (FIX-12)
- `backend/app/services/recipe_revision_service.py` — manual_required → 422 HTTPException kontrolü eklendi (FIX-13)
- `backend/scraper/yemekcom_scraper.py` — Toplam değil porsiyon başı besin değerleri saklanacak şekilde düzeltildi (FIX-15)
- `frontend/src/pages/RecipeDetailDb.css` — Açık tema makro/kalite/panel CSS eklendi (FIX-16)
**Notlar:** AppContext FIX-04 ve FIX-17 aynı dosyada birleştirildi. Tema artık kullanıcı ID'ye bağlı localStorage key kullanıyor; eski global key'den migration yapılıyor.