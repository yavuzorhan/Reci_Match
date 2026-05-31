# database.py — Veritabanı Bağlantısı ve Oturum Yönetimi

## Bu Dosya Ne İçin Var?

PostgreSQL veritabanına bağlanmayı, her HTTP isteği için bağımsız oturum (session) açmayı ve kapatmayı yönetir. Aynı zamanda sonradan eklenen tablo kolonlarının var olduğunu garanti eden runtime guard fonksiyonları içerir.

## Mimarideki Yeri

**Katman:** Veritabanı Altyapısı

- `settings.py`'dan `DATABASE_URL` alır
- Tüm router'lar `get_db()` fonksiyonunu `Depends(get_db)` ile kullanır
- `models.py` bu dosyadaki `Base` sınıfından miras alır

## Önemli Bileşenler

### `create_engine(settings.DATABASE_URL)` — Motor Oluşturma
**Ne yapar:** PostgreSQL ile fiziksel bağlantı havuzunu oluşturur.
**Neden gerekli:** SQLAlchemy'nin veritabanıyla konuşabilmesi için motor şarttır.

### `SessionLocal = sessionmaker(...)` — Oturum Fabrikası
**Ne yapar:** Her HTTP isteği için yeni bir veritabanı oturumu oluşturacak fabrika nesnesini kurar.
- `autocommit=False`: Değişiklikler kendiliğinden kaydedilmez; `db.commit()` elle çağrılmalı.
- `autoflush=False`: Sorgular arasında otomatik flush (geçici kayıt) yapılmaz.

### `Base = declarative_base()` — Model Temel Sınıfı
**Ne yapar:** `models.py` içindeki tüm tablo sınıflarının miras aldığı temel sınıfı oluşturur.
**Neden gerekli:** SQLAlchemy, tablolar hakkındaki metadata'yı bu Base nesnesi üzerinden yönetir.

### `get_db()` — Dependency Injection

**Ne yapar:** Her HTTP isteğinde yeni bir veritabanı oturumu açar, istek bittikten sonra kapatır.

**Nasıl kullanılır:**
```python
@router.get("/recipes")
def get_recipes(db: Session = Depends(get_db)):
    # db burada kullanılabilir
    return recipe_service.get_recipes(db=db, ...)
```

**Neden `yield` pattern?** `yield` sayesinde istek bittikten sonra `finally` bloğu çalışır ve oturum her koşulda (hata olsa bile) kapanır. Bağlantı sızıntısı olmaz.

**Örnek senaryo:** Kullanıcı tarifler sayfasını açarsa → `get_db()` çalışır → DB oturumu açılır → tarif listesi çekilir → yanıt gönderilir → oturum kapanır.

### `ensure_ingredient_inline_nutrition_columns(db)` — Runtime Kolon Guard

**Ne yapar:** `ingredients` tablosuna besin değeri kolonlarının (calorie_per_100g, protein_per_100g vb.) eklenmemiş olması durumunda `IF NOT EXISTS` ile ekler.

**Neden var:** Alembic migration yerine kullanılan pragmatik çözüm. Proje tek bir yerel veritabanında çalışıyor ve migration dosyaları ekstra yönetim gerektiriyor.

**`_ingredient_inline_nutrition_ready` global flag:** Guard sadece bir kez çalışır. Her HTTP isteğinde ALTER TABLE çalıştırmak gereksiz I/O ve performans kaybına yol açar.

## Kritik Kod Parçaları

```python
def get_db():
    db = SessionLocal()
    try:
        ensure_ingredient_inline_nutrition_columns(db)
        ensure_daily_log_macro_columns(db)
        yield db
    finally:
        db.close()
```
`yield` bu fonksiyonu generator yapar. FastAPI, `yield`'dan önce oturumu açar, endpoint çalışır, `finally` ile oturum kapanır — hata olsun ya da olmasın.

```python
db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS calorie_per_100g DOUBLE PRECISION NOT NULL DEFAULT 0"))
```
`IF NOT EXISTS` — PostgreSQL özelliği. Kolon varsa hata vermez, yoksa ekler. İdempotent.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Her istek için yeni session açmak performanslı mı?**
  C: SQLAlchemy connection pool kullanır; aslında aynı fiziksel bağlantılar tekrar kullanılır. Session sadece transaction sınırıdır. Performans açısından sorun yoktur.

- **S: Neden Alembic migration kullanılmadı?**
  C: Proje tek bir veritabanında geliştirildi. Runtime guard, migration dosyaları oluşturma/çalıştırma zahmetini ortadan kaldırıyor. Ticari/çok sunuculu bir ortamda Alembic kesinlikle tercih edilir.

- **S: `autocommit=False` neden önemli?**
  C: Birden fazla veritabanı işlemi tek transaction'da yapılabilir. Hata olursa `db.rollback()` ile hepsi geri alınır. autocommit=True olsaydı her işlem anında kalıcı olurdu, rollback imkânsızlaşırdı.
