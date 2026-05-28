-- Allow deleting a user and all user-owned/dependent data in one operation.
-- Run this in pgAdmin or psql against the project database.

ALTER TABLE owned_ingredients
  DROP CONSTRAINT IF EXISTS owned_ingredients_user_id_fkey,
  ADD CONSTRAINT owned_ingredients_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE owned_ingredients
  DROP CONSTRAINT IF EXISTS owned_ingredients_ingredient_id_fkey,
  ADD CONSTRAINT owned_ingredients_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE;

ALTER TABLE disliked_ingredients
  DROP CONSTRAINT IF EXISTS disliked_ingredients_user_id_fkey,
  ADD CONSTRAINT disliked_ingredients_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE disliked_ingredients
  DROP CONSTRAINT IF EXISTS disliked_ingredients_ingredient_id_fkey,
  ADD CONSTRAINT disliked_ingredients_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE;

ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS favorites_user_id_fkey,
  ADD CONSTRAINT favorites_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE favorites
  DROP CONSTRAINT IF EXISTS favorites_recipe_id_fkey,
  ADD CONSTRAINT favorites_recipe_id_fkey
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE;

ALTER TABLE daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_user_id_fkey,
  ADD CONSTRAINT daily_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

ALTER TABLE daily_logs
  DROP CONSTRAINT IF EXISTS daily_logs_recipe_id_fkey,
  ADD CONSTRAINT daily_logs_recipe_id_fkey
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE;

ALTER TABLE recipe_ingredients
  DROP CONSTRAINT IF EXISTS recipe_ingredients_recipe_id_fkey,
  ADD CONSTRAINT recipe_ingredients_recipe_id_fkey
    FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id) ON DELETE CASCADE;

ALTER TABLE recipe_ingredients
  DROP CONSTRAINT IF EXISTS recipe_ingredients_ingredient_id_fkey,
  ADD CONSTRAINT recipe_ingredients_ingredient_id_fkey
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE;
