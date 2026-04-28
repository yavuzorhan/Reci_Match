from sqlalchemy import create_engine
from sqlalchemy import text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from ..config.settings import settings

# Veritabanı motorunu (engine) oluşturuyoruz
# PostgreSQL bağlantı URL'sini settings içinden çekiyoruz
engine = create_engine(settings.DATABASE_URL)

# Veritabanı oturumu (Session) fabrikası
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Modellerimizin kalıtım alacağı ana sınıf
Base = declarative_base()

_ingredient_inline_nutrition_ready = False


def ensure_ingredient_inline_nutrition_columns(db):
    """
    Keeps older databases readable after the Ingredient model gained inline
    nutrition columns. Alembic is still the source of truth, this just prevents
    list endpoints from failing before the migration is applied manually.
    """
    global _ingredient_inline_nutrition_ready
    if _ingredient_inline_nutrition_ready:
        return

    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS calorie_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS protein_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS carbohydrate_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS fat_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE"))
    db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'manual'"))
    db.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'ck_ingredients_source'
            ) THEN
                ALTER TABLE ingredients
                ADD CONSTRAINT ck_ingredients_source
                CHECK (source IN ('manual', 'usda_auto', 'admin'));
            END IF;
        END
        $$;
    """))
    db.commit()
    _ingredient_inline_nutrition_ready = True

def get_db():
    """
    HTTP isteklerinde bağımsız veritabanı oturumları açıp kapatmak için kullanılır. (FastAPI pattern)
    """
    db = SessionLocal()
    try:
        ensure_ingredient_inline_nutrition_columns(db)
        yield db
    finally:
        db.close()

def check_connection():
    """
    Bağlantıyı test etmek için basit bir kontrol fonksiyonu.
    """
    try:
        # Basit bir SELECT sorgusu ile bağlantıyı doğrula
        with engine.connect() as connection:
            print("Successfully connected to PostgreSQL database!")
            return True
    except Exception as e:
        print(f"Error connecting to the database: {e}")
        return False
