# Veritabani Baglantisi - Okunakli Detay

## Bu Dokuman Ne Ise Yarar?

Bu dokuman backend'in PostgreSQL veritabanina nasil baglandigini anlatir. Projede veritabani baglantisinin merkezi `backend/app/db/database.py` dosyasidir. Ayarlar ise `backend/app/config/settings.py` dosyasindan gelir.

Temel fikir sudur:

```text
.env -> settings.py -> DATABASE_URL -> database.py -> engine/session -> router/service/repository
```

## Temel Kavramlar

**DATABASE_URL:** Veritabanina baglanmak icin gereken kullanici adi, sifre, host, port ve veritabani adini tek metinde birlestiren adrestir.

**Engine:** SQLAlchemy'nin veritabani ile iletisim kurmak icin kullandigi ana baglanti motorudur.

**Session:** Veritabani ile yapilan islemlerin calistigi islem alanidir. Sorgu atma, kayit ekleme, guncelleme ve silme islemleri session ile yapilir.

**Commit:** Yapilan degisikligi veritabanina kalici olarak kaydeder.

**Rollback:** Hata olursa degisiklikleri geri alir.

**Dependency:** FastAPI'de endpoint'e otomatik olarak verilen yardimci yapidir. `get_db`, endpoint'e DB session'i verir.

## Baglanti Nasil Kuruluyor?

### 1. `.env` dosyasindan bilgiler okunur

Veritabani bilgileri kodun icine yazilmaz. `.env` dosyasinda tutulur.

Ornek:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=recipe_db
```

Neden boyle?

Sifre gibi bilgiler GitHub'a gitmesin ve farkli bilgisayarlarda kod degismeden ayar yapilabilsin diye.

### 2. `settings.py` DATABASE_URL olusturur

`settings.py`, `.env` degerlerini okuyup su formata cevirir:

```text
postgresql://kullanici:sifre@host:port/veritabani
```

Ornek:

```text
postgresql://postgres:password@localhost:5432/recipe_db
```

Bu metin SQLAlchemy'nin veritabanina baglanmasi icin kullanilir.

### 3. `database.py` engine olusturur

`database.py` icinde su mantik vardir:

```python
engine = create_engine(settings.DATABASE_URL)
```

Bu satir veritabani ile iletisim kuracak ana motoru olusturur.

Hocaya soyle anlatabilirsin:

"Hocam, `.env` dosyasindan gelen veritabani bilgileri once `DATABASE_URL` haline getiriliyor. Sonra SQLAlchemy bu adresle engine olusturuyor."

### 4. Session uretici hazirlanir

```python
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

Bu yapi her API istegi icin yeni bir DB session'i uretir.

`autocommit=False` oldugu icin veritabanina yazilan degisiklikler otomatik kaydedilmez. Kodun `db.commit()` demesi gerekir. Bu daha guvenlidir, cunku hata olursa `db.rollback()` ile geri alinabilir.

### 5. Endpoint'ler `get_db()` ile session alir

Router dosyalarinda genelde su ifade gorulur:

```python
db: Session = Depends(get_db)
```

Bu ifade sunu yapar:

1. FastAPI `get_db()` fonksiyonunu calistirir.
2. Yeni DB session'i olusturur.
3. Endpoint'e bu session'i verir.
4. Endpoint isi bitince session kapanir.

## `get_db()` Neden Onemli?

`get_db()` fonksiyonu her API isteginde DB session'i acip kapatir.

Basit akis:

1. Kullanici frontend'den istek atar.
2. Router calisir.
3. `Depends(get_db)` sayesinde DB session gelir.
4. Service ve repository bu session ile DB islemi yapar.
5. Cevap donunce session kapanir.

Bu sayede veritabani baglantilari acik kalmaz.

## Commit, Rollback ve Flush

### `db.commit()`

Yapilan degisiklikleri veritabanina kalici olarak kaydeder.

Ornek:

- Yeni tarif eklenince
- Favori eklenince
- Profil guncellenince

### `db.rollback()`

Hata olursa yapilan degisiklikleri geri alir.

Ornek:

Tarif eklenirken malzeme cozulemezse yarim tarif kaydi kalmasin diye rollback yapilir.

### `db.flush()`

Commit yapmadan degisikligi DB'ye gonderir ve ID gibi degerlerin olusmasini saglar.

Ornek:

Yeni tarif eklendikten hemen sonra `recipe_id` lazimsa `flush()` kullanilir. Sonra bu `recipe_id` ile `recipe_ingredients` kayitlari eklenir.

## Veritabani Baglantisinin Projedeki Akisi

```text
Frontend istegi
    ↓
FastAPI Router
    ↓
Depends(get_db)
    ↓
DB Session
    ↓
Service
    ↓
Repository
    ↓
PostgreSQL
```

Router session'i alir ama sorgu mantigi genelde repository dosyalarindadir.

## Hocaya Kisa Cevaplar

**Soru: Veritabani bilgileri nereden geliyor?**  
Cevap: `.env` dosyasindan geliyor. `settings.py` bu bilgileri okuyup `DATABASE_URL` olusturuyor.

**Soru: `engine` ne ise yariyor?**  
Cevap: SQLAlchemy'nin PostgreSQL ile iletisim kurmasini saglayan ana baglanti motorudur.

**Soru: `get_db()` ne yapiyor?**  
Cevap: Her API istegi icin session acar, endpoint'e verir, is bitince kapatir.

**Soru: Neden `commit` manuel?**  
Cevap: Islemleri kontrollu yapmak icin. Hata olursa `rollback` ile geri almak mumkun olur.

## 30 Saniyelik Ozet

Veritabani bilgileri `.env` dosyasinda tutulur. `settings.py` bunlari `DATABASE_URL` haline getirir. `database.py` bu adresle SQLAlchemy engine olusturur. FastAPI endpoint'leri `Depends(get_db)` ile session alir. Service ve repository katmani bu session ile PostgreSQL'e okuma-yazma yapar.

