# main.py — Uygulamanın Başlangıç Noktası

## Bu Dosya Ne İçin Var?

`main.py`, tüm ReciMatch backend uygulamasının başladığı yer. FastAPI framework ile oluşturulmuş web sunucusunu yapılandırır; hangi URL'lerin hangi kodlara yönlendirileceğini belirler, CORS güvenliğini ve karakter kodlamasını ayarlar.

## Mimarideki Yeri

**Katman:** Uygulama Konfigürasyonu (En Üst Katman)

Başlatma komutu: `uvicorn main:app --reload --port 8000`

Bu dosya şu modülleri import eder:
- `app/routers/auth.py` — Kimlik doğrulama endpoint'leri
- `app/routers/ingredients.py` — Malzeme endpoint'leri
- `app/routers/recipes.py` — Tarif endpoint'leri
- `app/routers/users.py` — Kullanıcı endpoint'leri

## Önemli Bileşenler

### `FastAPI()` — Uygulama Nesnesi
**Ne yapar:** FastAPI framework ile web uygulaması oluşturur. Swagger (API belgesi) otomatik oluşturulur.
**Neden gerekli:** Tüm HTTP istekleri bu nesne üzerinden işlenir.
**Örnek:** `http://localhost:8000/docs` adresine gidince otomatik API dökümentasyonu görünür.

### `CORSMiddleware` — Kaynaklararası İzin
**Ne yapar:** Frontend'in (port 5173) backend'e (port 8000) istek yapmasına izin verir.
**Neden gerekli:** Tarayıcılar farklı portlar arasındaki istekleri güvenlik nedeniyle (Same-Origin Policy) varsayılan olarak engeller. CORS olmadan React frontend hiç backend'e ulaşamaz.
**Örnek senaryo:** Kullanıcı Login sayfasına şifre girince tarayıcı port 5173'ten port 8000'e istek atar. CORSMiddleware buna izin verir.

### `UTF8Middleware` — Karakter Kodlaması
**Ne yapar:** Her JSON yanıtın Content-Type başlığına `charset=utf-8` ekler.
**Neden gerekli:** Türkçe karakterler (ğ, ş, ı, ö, ü, ç) JSON içinde doğru görünmesi için UTF-8 şarttır.

### `app.mount("/uploads", StaticFiles(...))` — Statik Dosya Sunucu
**Ne yapar:** `uploads/` klasöründeki tarif resimlerini `http://localhost:8000/uploads/...` URL'si ile erişilebilir kılar.
**Neden gerekli:** Kullanıcıların yüklediği tarif fotoğrafları bu yol üzerinden frontend'e gönderilir.

### `app.include_router(...)` — Router Bağlama
**Ne yapar:** Her router dosyasındaki endpoint'leri uygulamaya ekler.
**Neden bu şekilde:** Büyük uygulamalar tek dosyada yönetilmez; router'lar sorumluluğu bölüştürür ve kodun bakımını kolaylaştırır.

## Kritik Kod Parçaları

```python
app = FastAPI(title="Akıllı Tarif ve Beslenme Sistemi API", version="1.0.0")
```
Bu satır tüm uygulamayı başlatır. `title` Swagger belgelerinde görünür.

```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```
`allow_origins=["*"]` geliştirme için tüm domainlere izin verir. Production'da belirli bir domain yazılmalıdır.

```python
class UTF8Middleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if 'application/json' in response.headers.get('content-type', ''):
            if 'charset' not in response.headers['content-type']:
                response.headers['content-type'] = 'application/json; charset=utf-8'
        return response
```
Her yanıt bu middleware'den geçer. Charset eksikse eklenir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: `uvicorn main:app` ne anlama geliyor?**
  C: `main` → `main.py` dosyasını, `app` → o dosya içindeki `FastAPI()` nesnesini ifade eder. Uvicorn, Python için ASGI (asenkron) web sunucusudur.

- **S: CORS neden var? Güvenli mi?**
  C: Frontend farklı porttan çalıştığı için gereklidir. `allow_origins=["*"]` geliştirme kolaylığı için yazılmıştır; production'da sadece belirli domain izin verilmeli.

- **S: Neden tek bir `main.py` var, neden her router kendi `main.py`'ına sahip değil?**
  C: FastAPI'nin router sistemi tam bunu sağlar. Tek bir giriş noktası (`main.py`) tüm router'ları bir araya getirir. Her router kendi dosyasında izole çalışır.
