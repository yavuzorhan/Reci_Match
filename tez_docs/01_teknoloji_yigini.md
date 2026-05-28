# ReciMatch — Teknoloji Yığını

Bu belge, projenin kullandığı tüm teknolojileri, tercih gerekçelerini ve projede hangi modüllerde kullanıldığını açıklar. Tüm bilgiler `requirements.txt`, `package.json` ve kaynak dosyalar okunarak doğrulanmıştır.

---

## Backend Teknolojileri

### Python
- **Sürüm:** 3.14
- **Ne işe yarıyor:** Tüm backend mantığı Python ile yazılmıştır.
- **Neden tercih edildi:** Geniş kütüphane ekosistemi, FastAPI ve SQLAlchemy ile tam uyum, veri işleme ve scraping için olgun araçlar.
- **Projede nerede:** `backend/app/` altındaki tüm `.py` dosyaları.

---

### FastAPI
- **Sürüm:** requirements.txt'te `fastapi`
- **Ne işe yarıyor:** REST API router'ları, endpoint tanımları, Pydantic entegrasyonu ve otomatik Swagger dokümantasyonu sağlar.
- **Neden tercih edildi:** Python tip ipuçlarıyla otomatik doğrulama, asenkron destek (`async def`), yüksek performans ve otomatik OpenAPI şeması üretimi.
- **Projede nerede:** `backend/app/routers/auth.py`, `ingredients.py`, `recipes.py`, `users.py` — toplam 4 router modülü.

```python
# recipes.py:84
@router.post("/recipes/{recipe_id}/revise", response_model=RecipeRevisionResponse)
async def revise_recipe(recipe_id: int, req: RecipeRevisionRequest, ...):
```

---

### Uvicorn
- **Sürüm:** `uvicorn[standard]`
- **Ne işe yarıyor:** ASGI sunucusu; FastAPI uygulamasını HTTP üzerinden ayağa kaldırır.
- **Neden tercih edildi:** FastAPI'nin standart sunucusu, `--reload` ile geliştirme kolaylığı.
- **Projede nerede:** `uvicorn main:app --reload --port 8000` komutuyla başlatılır.

---

### SQLAlchemy ORM
- **Sürüm:** `sqlalchemy`
- **Ne işe yarıyor:** Python sınıfları ile veritabanı tablolarını eşler (ORM); SQL sorguları Python kodu olarak yazılır.
- **Neden tercih edildi:** PostgreSQL ile tam uyum, ilişki yönetimi (`selectinload`, `relationship`), tip güvenli sorgular.
- **Projede nerede:** `backend/app/db/models.py` (13 model sınıfı), `backend/app/repositories/*.py` (veri erişim katmanı).

```python
# models.py:97
class Recipe(Base):
    __tablename__ = "recipes"
    recipe_id = Column(Integer, primary_key=True, index=True)
    ingredients = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
```

---

### PostgreSQL
- **Ne işe yarıyor:** İlişkisel veritabanı sistemi; 13 tabloda tarif, malzeme, kullanıcı, log verisi saklar.
- **Neden tercih edildi:** Üretim kalitesi, `CASCADE` silme desteği, partial index (kısmi benzersizlik kısıtları).
- **Projede nerede:** `backend/app/config/settings.py` üzerinden bağlantı URL'si okunur.

```python
# settings.py:27
@property
def DATABASE_URL(self) -> str:
    return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
```

---

### Pydantic
- **Ne işe yarıyor:** FastAPI request/response şemalarının tanımlanması ve doğrulanması.
- **Neden tercih edildi:** Python tip ipuçlarıyla otomatik doğrulama, `AliasChoices` ile esnek alan adı eşlemesi.
- **Projede nerede:** `backend/app/schemas/` altındaki 5 dosya: `auth.py`, `ingredient.py`, `recipe.py`, `recipe_revision.py`, `user.py`.

```python
# schemas/user.py:40
protein_intake: float | None = Field(
    default=None,
    validation_alias=AliasChoices("protein_intake", "proteinIntake", "protein"),
)
```

---

### bcrypt
- **Sürüm:** `bcrypt`
- **Ne işe yarıyor:** Şifreleri hashleme ve doğrulama.
- **Neden tercih edildi:** Endüstri standardı, tuzlama (salting) otomatik, GPU saldırılarına dirençli.
- **Projede nerede:** `backend/app/services/auth_service.py:24` — kayıt ve giriş işlemleri.

```python
# auth_service.py:24
hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
```

---

### Google Generative AI (google-genai) — Gemini 2.5 Flash
- **Sürüm:** `google-genai`
- **Ne işe yarıyor:** Malzeme besin değeri tahmini ve tarif revizyonu için büyük dil modeli API'si.
- **Neden tercih edildi:** Türkçe malzeme adlarını çeviri gerektirmeden anlıyor; yapılandırılmış JSON çıktısı (response schema) destekliyor; eski USDA + deep_translator + httpx zincirini 3 bağımlılıktan 1'e indirdi.
- **Projede nerede:** `backend/app/services/gemini_client.py` (besin değeri), `recipe_revision_service.py` (tarif revizyonu).

```python
# gemini_client.py:7
from google import genai
from google.genai import types as genai_types
# ...
response = client.models.generate_content(
    model="gemini-2.5-flash",
    config=genai_types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=NUTRITION_SCHEMA,
    ),
)
```

---

### Pillow
- **Sürüm:** `Pillow`
- **Ne işe yarıyor:** Yüklenen tarif görsellerini yeniden boyutlandırma, format dönüştürme ve JPEG olarak kaydetme.
- **Neden tercih edildi:** Python'un standart görüntü işleme kütüphanesi, minimum bağımlılık.
- **Projede nerede:** `backend/app/services/recipe_service.py:369` — `upload_recipe_image` fonksiyonu.

```python
# recipe_service.py:369
from PIL import Image
image = Image.open(BytesIO(content))
image.thumbnail((1200, 1200))
image.save(output_path, format="JPEG", quality=85, optimize=True)
```

---

### RapidFuzz
- **Sürüm:** `rapidfuzz`
- **Ne işe yarıyor:** Malzeme adlarında bulanık (fuzzy) eşleştirme; yazım hatalarına ve Türkçe karakter farklılıklarına tolerans.
- **Neden tercih edildi:** Python `difflib`'den 10x hızlı, `fuzz.ratio` ve `fuzz.token_sort_ratio` algoritmaları.
- **Projede nerede:** `backend/app/services/ingredient_resolver_service.py:127` — malzeme arama döngüsünde.

```python
# ingredient_resolver_service.py:127
direct = fuzz.ratio(normalized_key, candidate_key)
token_sort = fuzz.token_sort_ratio(normalized_key, candidate_key)
```

---

### BeautifulSoup
- **Sürüm:** `beautifulsoup4`
- **Ne işe yarıyor:** yemek.com HTML sayfalarını parse ederek tarif bilgilerini çıkarır.
- **Neden tercih edildi:** Sağlam HTML parse, CSS seçiciler ve Python standart `html.parser` ile ek parser bağımlılığı olmadan çalışma.
- **Projede nerede:** `backend/scraper/yemekcom_scraper.py`.

---

### python-dotenv + pydantic-settings
- **Ne işe yarıyor:** `.env` dosyasından ortam değişkenlerini yükler; veritabanı bağlantısı, SMTP, Gemini API anahtarı bu dosyadan alınır.
- **Projede nerede:** `backend/app/config/settings.py`.

---

### python-multipart
- **Ne işe yarıyor:** FastAPI'ye `multipart/form-data` desteği sağlar; tarif görsel yükleme endpoint'i bu pakete ihtiyaç duyar.
- **Projede nerede:** `recipes.py:164` — `UploadFile = File(...)` parametresi.

---

### requests
- **Ne işe yarıyor:** Harici URL'lerden tarif görseli proxy endpoint'i için HTTP istekleri yapar.
- **Projede nerede:** `backend/app/routers/recipes.py:4` — `/api/recipe-image` proxy endpoint'i.

---

## Frontend Teknolojileri

### React 19 + Vite
- **Sürüm:** React `^19.2.4`, Vite `^8.0.4`
- **Ne işe yarıyor:** Kullanıcı arayüzü bileşenleri; Vite ise geliştirme sunucusu ve production build aracıdır.
- **Neden tercih edildi:** Bileşen tabanlı UI geliştirme, hook API'si, Vite'ın HMR (Hot Module Replacement) ile hızlı geliştirme döngüsü.
- **Projede nerede:** `frontend/src/` — 19 sayfa, 6 bileşen.

---

### Context API (Global State)
- **Ne işe yarıyor:** Uygulama genelinde kullanıcı bilgisi, tema, tarif cache, malzeme listesi, günlük log gibi state'leri saklar ve dağıtır.
- **Neden tercih edildi:** Redux gibi harici kütüphane gerektirmez; projenin ölçeği için yeterli.
- **Projede nerede:** `frontend/src/context/AppContext.jsx` — tek context dosyası, 14 state değişkeni, 15+ fonksiyon export.

---

### React Router DOM
- **Sürüm:** `^7.14.0`
- **Ne işe yarıyor:** SPA (Single Page Application) içinde sayfa yönlendirmesi; `PrivateRoute` ile kimlik doğrulama koruması.
- **Projede nerede:** `frontend/src/App.jsx` — 20 route tanımı.

---

### Lucide React
- **Sürüm:** `^1.7.0`
- **Ne işe yarıyor:** Tutarlı SVG ikon seti.
- **Neden tercih edildi:** Tree-shakeable (yalnızca kullanılan ikonlar bundle'a girer), sade tasarım dili.
- **Projede nerede:** Tüm sayfalarda `import { Icon } from 'lucide-react'` ile kullanılır.

---

### Vanilla CSS
- **Ne işe yarıyor:** Her sayfa ve bileşen için ayrı `.css` dosyası; CSS değişkenleri ile tema yönetimi.
- **Neden tercih edildi:** Tailwind veya CSS-in-JS bağımlılığı olmadan tam kontrol; `data-theme` attribute ile açık/koyu tema.
- **Projede nerede:** Her `*.jsx` dosyasının yanında `*.css` kardeş dosyası.

---

### Framer Motion
- **Sürüm:** `^12.38.0`
- **Ne işe yarıyor:** Sayfa geçişleri ve bileşen animasyonları.
- **Projede nerede:** Çeşitli sayfalarda animasyon efektleri.

---

## Diğer / Altyapı

### SMTP (E-posta Doğrulama)
- **Ne işe yarıyor:** Kayıt, şifre sıfırlama ve güvenlik güncellemelerinde 6 haneli OTP kodu e-posta ile gönderilir.
- **Projede nerede:** `backend/app/utils/mailer.py` — `send_verification_email`, `send_password_reset_email`.

### REST API Mimarisi
- Tüm client-server iletişimi JSON tabanlı HTTP REST üzerinden yapılır.
- Endpoint prefix: `/api/`
- Kimlik doğrulama: session-free (kullanıcı bilgisi frontend `localStorage`'da saklanır).

### CORS Middleware
- Frontend (`localhost:5173`) ile backend (`localhost:8000`) arasındaki cross-origin isteklere izin verir.
- `backend/main.py`'de `CORSMiddleware` ile yapılandırılır.

---

## Sürüm Özet Tablosu

| Teknoloji | Sürüm | Katman |
|-----------|-------|--------|
| Python | 3.14 | Backend |
| FastAPI | latest | Backend |
| Uvicorn | standard | Backend |
| SQLAlchemy | latest | Backend |
| PostgreSQL | latest | Veritabanı |
| Pydantic | v2 | Backend |
| bcrypt | latest | Backend |
| google-genai (Gemini 2.5 Flash) | latest | Backend/AI |
| Pillow | latest | Backend |
| RapidFuzz | latest | Backend |
| BeautifulSoup4 | latest | Scraper |
| React | ^19.2.4 | Frontend |
| Vite | ^8.0.4 | Frontend |
| React Router DOM | ^7.14.0 | Frontend |
| Lucide React | ^1.7.0 | Frontend |
| Framer Motion | ^12.38.0 | Frontend |
