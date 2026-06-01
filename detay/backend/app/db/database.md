# database.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`database.py`, backend'in veritabani ile baglanti kurdugu ana dosyadir. PostgreSQL baglanti adresini `settings.DATABASE_URL` uzerinden alir, SQLAlchemy engine olusturur ve API endpoint'lerine veritabani session'i verir.

Bu dosya tarif ekleme, kullanici kaydi veya favori ekleme gibi isleri yapmaz. Sadece bu islemleri yapacak router, service ve repository dosyalarina veritabani ile konusma imkani verir.

## Projedeki Yeri

- Katman: Veritabani altyapisi
- `settings.py` dosyasindan `DATABASE_URL` alir.
- `models.py` dosyasina `Base` saglar.
- Router dosyalari `Depends(get_db)` ile buradan DB session'i alir.
- Repository dosyalari bu session ile sorgu yapar.

## Bilmen Gereken Kavramlar

**Engine:** SQLAlchemy'nin veritabanina baglanmak icin kullandigi ana motordur.

**Session:** Veritabani ile konusmak icin acilan islem baglamidir. Sorgular, ekleme, silme ve guncelleme islemleri session ile yapilir.

**Commit:** Yapilan degisiklikleri veritabanina kalici olarak kaydeder.

**Rollback:** Hata olursa yapilan degisiklikleri geri alir.

**Dependency:** FastAPI'de endpoint calismadan once hazirlanan yardimci bagimliliktir. `get_db`, endpoint'e DB session'i verir.

## Onemli Kod Parcalari

```python
engine = create_engine(settings.DATABASE_URL)
```

Bu satir SQLAlchemy'nin PostgreSQL'e baglanmasi icin engine olusturur.

Neden gerekli? Cunku backend'in veritabanina sorgu gonderebilmesi icin once bir baglanti motoru olmasi gerekir.

Hocaya soyle anlatabilirsin:

"Hocam, veritabani baglanti adresi `settings.py` icinden geliyor. `create_engine` ile SQLAlchemy'nin PostgreSQL'e baglanacagi ana motoru olusturuyorum."

```python
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

Bu satir her API istegi icin session uretecek yapıyı hazirlar.

`autocommit=False` sayesinde degisiklikler otomatik kaydedilmez. Kod acikca `db.commit()` cagirir. Bu, hata durumunda `rollback` yapabilmek icin daha kontrollu bir yontemdir.

```python
Base = declarative_base()
```

Bu satir SQLAlchemy modellerinin miras alacagi temel sinifi olusturur. `models.py` dosyasinda `class User(Base)` veya `class Recipe(Base)` yazilabilmesini saglar.

```python
db.execute(text("ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS calorie_per_100g ..."))
```

Bu tarz satirlar eski veritabaninda eksik kolon varsa otomatik ekler. `IF NOT EXISTS`, kolon zaten varsa hata vermemesini saglar.

Bu projede bu kontroller runtime'da yapiliyor. Daha profesyonel buyuk sistemlerde bu is genelde Alembic migration dosyalariyla yapilir.

## Fonksiyonlar ve Mantik

### `ensure_ingredient_inline_nutrition_columns(db)`

Bu fonksiyon `ingredients` tablosunda besin degeri kolonlari var mi kontrol eder. Eksik kolon varsa ekler.

Eklenen temel kolonlar:

- `calorie_per_100g`
- `protein_per_100g`
- `carbohydrate_per_100g`
- `fat_per_100g`
- `fiber_per_100g`
- `sugar_per_100g`
- `sodium_mg_per_100g`
- `nutrition_source`
- `nutrition_confidence`
- `is_verified`
- `source`

Neden var? Projede malzeme besin degerleri sonradan modele eklenmis. Eski lokal veritabaninda bu kolonlar yoksa uygulama hata verebilir. Bu fonksiyon eksik kolonlari ekleyerek eski DB'nin de calismasini saglar.

Fonksiyon icinde su flag kullanilir:

```python
_ingredient_inline_nutrition_ready = False
```

Bu flag sayesinde kolon kontrolu her istekte tekrar tekrar calismaz. Ilk calismadan sonra `True` yapilir.

### Constraint Bolumu

Fonksiyon, `source` ve `nutrition_source` alanlari icin kontrol kurali ekler.

`source` icin izin verilen degerler:

- `manual`
- `gemini_auto`
- `ai_auto`
- `admin`

`nutrition_source` icin izin verilen degerler:

- `gemini`
- `manual`
- `db`

Bu constraint'ler veritabanina yanlis kaynak degeri yazilmasini engeller.

### `ensure_daily_log_macro_columns(db)`

Bu fonksiyon `daily_logs` tablosunda makro besin kolonlari var mi kontrol eder.

Ekledigi kolonlar:

- `protein_intake`
- `carbohydrate_intake`
- `fat_intake`

Neden var? Gunluk loglarda sadece kalori degil, protein, karbonhidrat ve yag takibi de yapilabilsin diye.

### `get_db()`

Bu fonksiyon FastAPI endpoint'lerine veritabani session'i verir.

Calisma mantigi:

1. `SessionLocal()` ile yeni session acar.
2. Gerekli kolon kontrollerini yapar.
3. `yield db` ile session'i endpoint'e verir.
4. Endpoint isi bitince `finally` blogunda session'i kapatir.

Bu yapi sayesinde veritabani baglantisi acik kalmaz ve kaynak tuketimi azalir.

## Veri Akisi

1. `.env` dosyasindan veritabani bilgileri okunur.
2. `settings.DATABASE_URL` baglanti adresini olusturur.
3. `database.py` bu adresle engine olusturur.
4. API istegi geldiginde router `Depends(get_db)` ile session ister.
5. `get_db()` session acar.
6. Service ve repository katmani bu session ile DB islemi yapar.
7. Is bitince session kapanir.

## Veritabani Iliskisi

Bu dosya veritabanindaki verileri dogrudan is mantigi olarak islemez. Ama tablo yapisini korumak icin gerekli kolonlari ekleyebilir.

Dokundugu tablolar:

- `ingredients`
- `daily_logs`

Ek olarak tum endpoint'lerin DB session almasini sagladigi icin backend veritabani akisi icin temel dosyadir.

## Hocaya Kisa Cevaplar

**Soru: `database.py` neden var?**  
Cevap: Backend'in PostgreSQL'e baglanmasi ve her API istegine DB session verilmesi icin var.

**Soru: `get_db()` ne yapiyor?**  
Cevap: Her istek icin session acar, endpoint'e verir, is bitince kapatir.

**Soru: Kolon ekleme kodlari neden burada?**  
Cevap: Eski lokal veritabaninda yeni kolonlar eksikse uygulama hata vermesin diye runtime kontrol yapiliyor. Buyuk sistemlerde bu is migration ile yapilir.

**Soru: USDA neden yok?**  
Cevap: Mevcut veritabaninda USDA kaynakli kayit yoktu. Aktif sistem `gemini`, `manual` ve `db` kaynaklarini kullaniyor. Bu yuzden eski USDA gecis kodlari temizlendi.

## 30 Saniyelik Ozet

`database.py`, backend'in veritabani kapisidir. `settings.DATABASE_URL` ile engine kurar, `SessionLocal` ile session uretir, `get_db()` ile endpoint'lere session verir. Ayrica eski lokal veritabaninda eksik kolon varsa uygulama calisirken bunlari tamamlar.

