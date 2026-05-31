# routers/recipes.py — Tarif API Endpoint'leri

## Bu Dosya Ne İçin Var?

Tarif listesi, detay, öneri, tarif ekleme/güncelleme/silme ve Gemini revizyonu HTTP endpoint'lerini tanımlar.

## Mimarideki Yeri

**Katman:** Router (HTTP Giriş Noktası)

- İstemci → Bu router → `recipe_service.py` veya `recipe_revision_service.py`

## Endpoint'ler

| Method | URL | Açıklama |
|--------|-----|----------|
| GET | `/api/recipes` | Tarif listesi (filtreli) |
| GET | `/api/recipes/{recipe_id}` | Tek tarif detayı |
| POST | `/api/recipes/recommendations` | Malzeme bazlı öneri |
| POST | `/api/users/{user_id}/custom-recipes` | Kişisel tarif ekle |
| PUT | `/api/users/{user_id}/custom-recipes/{id}` | Kişisel tarif güncelle |
| DELETE | `/api/users/{user_id}/custom-recipes/{id}` | Kişisel tarif sil |
| POST | `/api/recipes/{id}/image` | Tarif resmi yükle |
| POST | `/api/recipes/{id}/revise` | Gemini revizyonu |
| POST | `/api/recipes/{id}/revise/save` | Revizyonu kaydet |
| GET | `/api/recipe-image` | Harici resim proxy |

## Önemli Tasarım Kararları

### Öneri Endpoint'i POST
```python
@router.post("/api/recipes/recommendations")
def get_recommendations(body: RecommendationRequest, db: Session = Depends(get_db)):
```
GET değil POST — çünkü gönderilen veri (malzeme ID listesi) uzun olabilir. URL query parametresi olarak çok sayıda ID göndermek URL limitini aşabilir.

### Resim Proxy
`/api/recipe-image?url=...` → Backend harici resim URL'lerini proxy eder.
**Neden:** Bazı yemek.com resimleri CORS kısıtlaması var. Backend üzerinden geçince tarayıcı CORS hatası görmez.

## Sıkça Sorulabilecek Hoca Soruları

- **S: `user_id` neden query parameter, header değil?**
  C: Basitlik için. Gerçek kimlik doğrulama (JWT Bearer token header) daha güvenli ama bu proje kapsamı için `user_id` parametresi yeterli.

- **S: `/api/recipes` hem global hem kişisel tarifleri döndürüyor mu?**
  C: Evet. `user_id` gönderilince hem global (`user_id IS NULL`) hem o kullanıcının kişisel tarifleri listelenir.
