# Claude Code Master Prompt: Okunakli Detay Dokumantasyonu

Bu promptu Claude Code'a aynen ver.

Amac: `detay/` klasorundeki dokumanlari, kodu hic bilmeyen ama projeyi hocaya anlatmak zorunda olan bir ogrencinin rahat okuyabilecegi hale getirmek.

Eski satir-satir aciklama formati uzun dosyalarda okunmasi zor oldugu icin kullanilmayacak. Bunun yerine dosya, fonksiyon ve akis bazli okunakli anlatim yazilacak.

---

## Genel Kurallar

1. Once `CLAUDE.md` dosyasini oku.
2. Her dokumani yazmadan once ilgili kaynak kod dosyasini oku.
3. Kodda olmayan teknoloji veya davranis yazma.
4. Aciklamalar Turkce, sade ve sunum odakli olsun.
5. Cok uzun akademik paragraf yazma.
6. Her fonksiyonun ne yaptigi ve neden yazildigi anlasilsin.
7. Hoca "bu fonksiyon nasil calisiyor?" diye sorarsa cevap verilebilsin.
8. Gerekmedikce her satirin altina aciklama yazma.
9. Sadece kritik kod parcalarini kucuk blok olarak goster.

---

## Her Dosya Icin Kullanilacak Format

Her `.md` dosyasi su yapida olacak:

```markdown
# dosya_adi.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

Bu dosyanin projedeki gorevini 3-6 cumleyle anlat.

## Projedeki Yeri

- Katman: router / service / repository / model / schema / config / frontend
- Kim cagirir?
- Kimi cagirir?
- Veritabani ile dogrudan iliskisi var mi?

## Bilmen Gereken Kavramlar

Bu dosyada gecen teknik kavramlari kisa acikla.

## Onemli Kod Parcalari

Sadece gercekten onemli kod bloklarini koy.
Her kod blogunun altina:
- Ne yapar?
- Neden gerekli?
- Hoca sorarsa nasil anlatilir?

## Fonksiyonlar ve Mantik

Her fonksiyonu alt baslik yap:

### `fonksiyon_adi(...)`

- Ne yapar?
- Neden var?
- Parametreler ne anlama gelir?
- Adim adim nasil calisir?
- Hangi tabloya/veriye dokunur?
- Hata durumunda ne olur?

## Veri Akisi

Bu dosyada veri nereden gelir, nasil islenir, nereye gider?

## Veritabani Iliskisi

DB'ye dokunuyorsa tablo tablo anlat.
DB'ye dokunmuyorsa "Bu dosya veritabanina dogrudan dokunmaz" de.

## Hocaya Kisa Cevaplar

En az 3 soru-cevap yaz.

## 30 Saniyelik Ozet

Sunumdan once okunacak cok kisa ozet yaz.
```

---

## Ornek: `database.py`

```markdown
# database.py - Okunakli Detay

## Bu Dosya Ne Ise Yarar?

`database.py`, backend'in veritabani ile baglanti kurdugu merkez dosyadir. PostgreSQL baglanti adresini `settings.DATABASE_URL` uzerinden alir, SQLAlchemy engine olusturur ve her API istegi icin kullanilacak DB session'ini hazirlar.

Bu dosya tarif ekleme, kullanici kaydi veya favori ekleme gibi isleri yapmaz. Sadece bu islemleri yapacak dosyalara veritabani baglantisi saglar.

## Onemli Kod Parcalari

```python
engine = create_engine(settings.DATABASE_URL)
```

Bu satir SQLAlchemy'nin PostgreSQL'e baglanmasini saglayan ana motoru olusturur.

Hocaya soyle anlat:
"Hocam backend'in veritabanina giden ana baglanti motoru burada olusturuluyor."

```python
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
```

Bu satir her API istegi icin yeni DB session'i uretmekte kullanilir. Session, veritabaniyle konusulan islem baglamidir.

## Fonksiyonlar ve Mantik

### `get_db()`

- Her API istegi icin session acar.
- Endpoint bu session ile DB islemi yapar.
- Is bitince session kapanir.
- Bu sayede baglanti acik kalip sistemi yormaz.

## 30 Saniyelik Ozet

`database.py`, backend'in veritabani kapisidir. Engine ve session burada olusur. Router'lar `Depends(get_db)` ile buradan session alir.
```

---

## Veritabani Dokumanlari

Veritabani dokumanlarinda tablo tablo okunakli anlat:

```markdown
## `users`

Bu tablo sisteme kayitli kullanicilari tutar. Login, profil, favoriler, dolap malzemeleri ve gunluk loglar bu tabloya baglanir.

Onemli kolonlar:
- `user_id`: Kullanici kimligi.
- `email`: Benzersiz e-posta.
- `password_hash`: Hashlenmis sifre.
- `daily_calorie`: Kullaniciya hesaplanan gunluk kalori hedefi.

Iliskiler:
- Bir kullanicinin birden fazla favorisi olabilir.
- Bir kullanicinin birden fazla gunluk log kaydi olabilir.
- Bir kullanicinin kendine ozel tarifleri olabilir.
```

---

## Akis Dokumanlari

Akis dokumanlari da okunakli olsun:

```markdown
# Tarif Oneri Akisi

1. Kullanici frontend'de malzeme secer.
2. Frontend bu malzeme ID'lerini backend'e gonderir.
3. Router istegi alir ve service'e aktarir.
4. Service tariflerin malzemeleriyle kullanici malzemelerini karsilastirir.
5. Eslestirme skoruna gore tarifleri siralar.
6. Frontend sonucu tarif kartlari olarak gosterir.

Hocaya kisa cevap:
"Sistem kullanicinin sectigi malzemeleri tarif malzemeleriyle normalize ederek karsilastiriyor. Eslesen malzeme arttikca skor artiyor, sevilmeyen malzeme varsa skor dusuyor."
```

---

## Son Cevapta Raporla

Is bitince sunlari yaz:

1. Kac dosya guncellendi?
2. Hangi ana dokumanlar okunakli formata cevrildi?
3. Eksik kalan yer var mi?

