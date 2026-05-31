# IngredientSelection.jsx — Malzeme Seçimi Sayfası

## Bu Dosya Ne İçin Var?

Kullanıcının elindeki malzemeleri dolabına eklemesini sağlar. Hem anlık tarif önerisi için seçim hem kalıcı dolap yönetimi buradan yapılır.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `pantryIngredients`, `selectedIngredients` state'leri
- `/api/users/{id}/ingredients` → dolap CRUD

## Ne Yapar?

1. **Malzeme Arama:** Kullanıcı arama kutusuna yazar → `/api/ingredients?q=...` → sonuçlar listelenir
2. **Dolaba Ekleme:** Malzeme tıklanınca dolaba eklenir → `OwnedIngredient` tablosuna yazılır
3. **Aktif Seçim:** "Şu an bunları kullanacağım" için anlık seçim (bu oturum için)
4. **Kategori Filtresi:** Kategori chip'lerine tıklayarak malzeme listesi filtrele

## Akış

```
Kullanıcı malzeme arar →
    Backend'den malzeme listesi gelir →
    Kullanıcı dolaba ekler (kalıcı) veya aktif seçer (geçici) →
    "Tarif Öner" butonuna basınca Recommendations'a geçilir →
    Seçili malzeme ID'leri öneri isteğiyle gönderilir
```

## Sıkça Sorulabilecek Hoca Soruları

- **S: Dolap ile aktif seçim farkı nedir?**
  C: Dolap kalıcı — "Evde her zaman tuz, yağ var." Aktif seçim anlık — "Bugün tavuk ve brokoli var, bunlarla tarif öner." İkisi ayrı state'te tutulur.

- **S: Malzeme bulunamazsa ne oluyor?**
  C: "Bulunamadı" mesajı ve "Özel malzeme ekle" seçeneği. Özel malzeme ekleme Gemini AI ile besin değeri alır.
