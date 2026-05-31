# DB_BAGLANTISI.md — Veritabanı Bağlantısı Nasıl Kurulur?

## PostgreSQL Bağlantı URL'si

Bağlantı `backend/.env` dosyasındaki `DATABASE_URL` değişkeninden okunur:

```
DATABASE_URL=postgresql://kullanici:sifre@localhost:5432/recimatch_db
```

Format: `postgresql://[kullanıcı]:[şifre]@[sunucu]:[port]/[veritabanı_adı]`

## SQLAlchemy Bağlantı Akışı

```
settings.py → .env'den DATABASE_URL oku
    ↓
database.py → create_engine(DATABASE_URL) → bağlantı havuzu oluştur
    ↓
SessionLocal = sessionmaker(...) → oturum fabrikası hazırla
    ↓
Her HTTP isteği: get_db() → yeni oturum aç
    ↓
İstek biter: finally: db.close() → oturum kapat
```

## Session Kullanımı (Örnek)

```python
# Router içinde dependency injection:
@router.get("/recipes")
def get_recipes(db: Session = Depends(get_db)):
    return recipe_service.get_recipes(db=db, ...)
```

FastAPI `Depends(get_db)` ile `db` parametresini otomatik sağlar. Geliştirici her seferinde `SessionLocal()` çağırmak zorunda kalmaz.

## Transaction Yönetimi

```python
# Başarılı işlem:
db.add(new_recipe)
db.commit()          # Kalıcı kayıt
db.refresh(new_recipe)  # ID gibi DB tarafından atanan alanları güncelle

# Hata durumunda:
try:
    db.add(...)
    db.commit()
except Exception:
    db.rollback()    # Tüm değişiklikler geri alınır
    raise
```

`autocommit=False` olduğu için `db.commit()` çağrılmadan değişiklikler kalıcı olmaz. Bu kasıtlı — birden fazla işlem tek bir transaction'da yapılabilir.

## Bağlantı Havuzu (Connection Pool)

SQLAlchemy `create_engine()` ile otomatik bağlantı havuzu kurulur:

```python
engine = create_engine(
    settings.DATABASE_URL,
    pool_size=5,        # Aynı anda 5 bağlantı
    max_overflow=10,    # Gerekirse 10 ekstra bağlantı
)
```

Bu sayede her HTTP isteği yeni TCP bağlantısı açmak zorunda kalmaz. Havuzdaki bağlantılar tekrar kullanılır.

## Geliştirme vs Production

| Özellik | Geliştirme | Production |
|---|---|---|
| Veritabanı | `localhost:5432` | Uzak sunucu veya cloud |
| `DATABASE_URL` | `.env`'de yerel | `.env`'de sunucu adresi |
| Kod | Aynı | Aynı |
| `--reload` | Aktif | Pasif |

Sadece `.env` dosyası değişir, kod değişmez.

## SQLite Alternatifi

Geliştirme ortamında SQLite kullanmak için:
```
DATABASE_URL=sqlite:///./recimatch.db
```

Ancak bazı PostgreSQL özgü özellikler (partial index, `pg_constraint` sorguları) çalışmaz. Runtime guard'lardaki bazı SQL ifadeleri PostgreSQL'e özgü.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Her HTTP isteği için yeni session açmak performanslı mı?**
  C: Connection pool sayesinde aslında aynı fiziksel TCP bağlantıları tekrar kullanılır. Session sadece transaction sınırıdır, performans kaybı minimumdur.

- **S: Veritabanı bağlantısı kesilirse ne olur?**
  C: SQLAlchemy connection pool otomatik olarak yeniden bağlanmayı dener. `pool_pre_ping=True` parametresiyle her kullanımdan önce bağlantı test edilebilir.

- **S: `db.flush()` ile `db.commit()` farkı nedir?**
  C: `flush()` değişiklikleri veritabanına gönderir ama transaction'ı kapatmaz (geri alınabilir). `commit()` transaction'ı kapatır ve değişiklikler kalıcı hale gelir.
