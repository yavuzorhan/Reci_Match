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