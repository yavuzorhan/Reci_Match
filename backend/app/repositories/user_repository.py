from sqlalchemy.orm import Session

from app.db.models import DailyLog, Favorite, Recipe, User

def find_user_by_id(db: Session, user_id: int) -> User | None:
    return db.query(User).filter(User.user_id == user_id).first()

def find_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()

def find_recipe_by_id(db: Session, recipe_id: int) -> Recipe | None:
    return db.query(Recipe).filter(Recipe.recipe_id == recipe_id).first()

def find_favorites_by_user(db: Session, user_id: int) -> list[Favorite]:
    return (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id)
        .order_by(Favorite.favorite_id.desc())
        .all()
    )

def find_favorite(db: Session, user_id: int, recipe_id: int) -> Favorite | None:
    return (
        db.query(Favorite)
        .filter(Favorite.user_id == user_id, Favorite.recipe_id == recipe_id)
        .first()
    )

def create_favorite(db: Session, user_id: int, recipe_id: int) -> Favorite:
    favorite = Favorite(user_id=user_id, recipe_id=recipe_id)
    db.add(favorite)
    return favorite

def find_daily_logs_with_recipe(db: Session, user_id: int):
    return (
        db.query(DailyLog, Recipe)
        .join(Recipe, Recipe.recipe_id == DailyLog.recipe_id)
        .filter(DailyLog.user_id == user_id)
        .order_by(DailyLog.logged_at.desc().nullslast(), DailyLog.log_id.desc())
        .all()
    )

def find_daily_log(db: Session, user_id: int, log_id: int) -> DailyLog | None:
    return (
        db.query(DailyLog)
        .filter(DailyLog.user_id == user_id, DailyLog.log_id == log_id)
        .first()
    )

def find_daily_log_by_recipe_meal(db: Session, user_id: int, recipe_id: int, log_date, meal_type: str) -> DailyLog | None:
    return (
        db.query(DailyLog)
        .filter(
            DailyLog.user_id == user_id,
            DailyLog.recipe_id == recipe_id,
            DailyLog.log_date == log_date,
            DailyLog.meal_type == meal_type,
        )
        .first()
    )

def find_daily_log_meal_types(db: Session, user_id: int, log_date) -> set[str]:
    existing_logs = (
        db.query(DailyLog.meal_type)
        .filter(DailyLog.user_id == user_id, DailyLog.log_date == log_date)
        .all()
    )
    return {meal_type for (meal_type,) in existing_logs if meal_type}

def create_daily_log(db: Session, **fields) -> DailyLog:
    log = DailyLog(**fields)
    db.add(log)
    return log
