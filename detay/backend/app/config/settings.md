# settings.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`settings.py`, backend'in ortam ayarlarini merkezi olarak toplar. Veritabani bilgileri, SMTP e-posta ayarlari ve frontend adresi bu dosyada okunur.

Bu dosyanin ana amaci sifre, veritabani kullanici adi veya mail bilgisi gibi degisebilen ayarlari kodun icine sabit yazmamaktir. Bu bilgiler `.env` dosyasindan okunur.

## Projedeki Yeri

- Katman: Config / ayar katmani
- `database.py`, veritabani baglanti adresi icin bu dosyayi kullanir.
- E-posta gonderen kodlar SMTP ayarlarini buradan kullanabilir.
- Backend, frontend linki uretmesi gerekirse `FRONTEND_URL` degerini buradan alir.

## Bilmen Gereken Kavramlar

**`.env`:** Gizli veya ortama gore degisen ayarlarin tutuldugu dosyadir.

**Ortam degiskeni:** Uygulamanin disaridan okudugu ayar degeridir.

**SMTP:** E-posta gondermek icin kullanilan protokoldur.

**DATABASE_URL:** Veritabani baglantisi icin gerekli bilgilerin tek metin halidir.

## Dosyanin Calisma Mantigi

### 1. `.env` dosyasinin yeri bulunur

Kod, `settings.py` dosyasinin konumundan yola cikarak backend klasorundeki `.env` dosyasini bulur.

Bu yaklasim kullanilir cunku uygulama farkli klasorden calistirilsa bile `.env` dosyasinin dogru bulunmasi gerekir.

### 2. `.env` dosyasi yuklenir

`load_dotenv(...)` ile `.env` dosyasindaki degerler Python tarafindan okunabilir hale gelir.

Bu yapilmazsa `os.getenv(...)` `.env` icindeki degerleri okuyamaz.

### 3. `Settings` sinifi ayarlari toplar

`Settings` sinifi veritabani, SMTP ve frontend ayarlarini tek yerde toplar.

Bu sayede projenin baska yerlerinde ayarlara su sekilde ulasilabilir:

```python
settings.DATABASE_URL
settings.SMTP_SERVER
settings.FRONTEND_URL
```

## Veritabani Ayarlari

Bu alanlar PostgreSQL baglantisi icin kullanilir:

- `POSTGRES_USER`: Veritabani kullanici adi.
- `POSTGRES_PASSWORD`: Veritabani sifresi.
- `POSTGRES_HOST`: Veritabaninin calistigi adres.
- `POSTGRES_PORT`: PostgreSQL portu.
- `POSTGRES_DB`: Baglanilacak veritabani adi.

Varsayilan degerler vardir. Ornegin `.env` icinde `POSTGRES_USER` yoksa `"postgres"` kullanilir. Bu gelistirme ortaminda kolaylik saglar.

## SMTP Ayarlari

Bu alanlar e-posta gonderimi icin kullanilir:

- `SMTP_SERVER`: Mail sunucusu.
- `SMTP_PORT`: Mail sunucusu portu.
- `SMTP_USERNAME`: Mail hesabi kullanici adi.
- `SMTP_PASSWORD`: Mail hesabi sifresi.
- `FROM_EMAIL`: Gonderen e-posta adresi.

SMTP ayarlari sifre sifirlama veya dogrulama maili gondermek icin gereklidir.

`SMTP_PORT` icin `int(...)` kullanilir cunku `os.getenv` degeri metin olarak dondurur, port ise sayi olarak kullanilir.

## Frontend Ayari

`FRONTEND_URL`, frontend uygulamasinin adresini tutar.

Varsayilan:

```text
http://localhost:5173
```

Bu adres Vite React gelistirme sunucusunda sik kullanilir.

Backend sifre sifirlama gibi linkler uretirse frontend adresini bilmek zorundadir.

## `DATABASE_URL` Property'si

Bu dosyanin en onemli kismi `DATABASE_URL` property'dir.

Ayri ayri duran veritabani bilgilerini su formata cevirir:

```text
postgresql://kullanici:sifre@host:port/veritabani
```

Ornek:

```text
postgresql://postgres:password@localhost:5432/recipe_db
```

Neden property kullanilmis?

`DATABASE_URL`, ayri alanlardan hesaplanan bir degerdir. `@property` sayesinde fonksiyon gibi degil, ayar alani gibi kullanilir:

```python
settings.DATABASE_URL
```

Bu daha okunakli olur.

## `settings = Settings()` Ne Ise Yarar?

Dosyanin sonunda `Settings` sinifindan tek bir nesne olusturulur.

Projenin diger dosyalari bu nesneyi import eder:

```python
from app.config.settings import settings
```

Boylece ayarlar tek merkezden kullanilir.

## Veritabani Iliskisi

Bu dosya veritabanina dogrudan baglanmaz. Tablo okumaz, tabloya kayit yazmaz.

Ama veritabani baglantisi icin gerekli `DATABASE_URL` degerini hazirlar. Bu yuzden DB baglantisinin ilk adimidir.

## Hocaya Kisa Cevaplar

**Soru: `.env` neden kullanildi?**  
Cevap: Sifre ve API key gibi gizli bilgileri koda yazmamak icin. Ayrica farkli bilgisayarlarda kod degismeden ayar yapmayi saglar.

**Soru: `DATABASE_URL` ne ise yariyor?**  
Cevap: PostgreSQL'e baglanmak icin kullanici adi, sifre, host, port ve DB adini tek metinde toplar.

**Soru: `@property` neden kullanilmis?**  
Cevap: `DATABASE_URL` bir fonksiyon gibi hesaplanir ama ayar alani gibi `settings.DATABASE_URL` seklinde okunur.

## 30 Saniyelik Ozet

`settings.py`, backend ayarlarinin merkezidir. `.env` dosyasini yukler, veritabani ve SMTP bilgilerini okur, `DATABASE_URL` olusturur. Kendisi DB'ye baglanmaz ama DB baglantisi icin gerekli adresi hazirlar.

