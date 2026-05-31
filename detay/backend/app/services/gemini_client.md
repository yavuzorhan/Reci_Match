# gemini_client.py — Google Gemini AI Entegrasyonu

## Bu Dosya Ne İçin Var?

Malzemelerin besin değerlerini (kalori, protein, karbonhidrat, yağ vb.) Google Gemini AI'a sormak için istemci işlevi görür. USDA FoodData Central API'sinin yerini almıştır (Mayıs 2026 migrasyonu).

## Mimarideki Yeri

**Katman:** Dış Servis İstemcisi

- `nutrition_resolver_service.py` → `estimate_nutrition_with_gemini()` çağırır
- `ingredient_resolver_service.py` → nutrition resolver üzerinden dolaylı kullanır
- Gemini API anahtarı `GEMINI_API_KEY` ortam değişkeninden okunur

## Neden USDA'dan Gemini'ye Geçildi?

**USDA API'sinin sorunları:**
1. Türkçe malzeme adları doğrudan sorgulanamıyordu → `deep_translator` ile İngilizceye çevrilmesi gerekiyordu
2. "Pekmez", "Ayran", "Börek" gibi yerel ürünler USDA'da yok
3. Çeviri hataları (ör: "nohut" → "chickpeas" ama bazen yanlış çeviriler)
4. 3 dış bağımlılık: deep_translator + httpx + USDA API
5. Eşleşme güvenilirliği düşüktü

**Gemini AI avantajları:**
- Doğrudan Türkçe sorgu — çeviri gerekmez
- Türk mutfağı bağlamını anlıyor
- Tek API çağrısı, tek bağımlılık (google-genai)
- Structured JSON response ile parse hatası riski minimal

## Fonksiyon

### `estimate_nutrition_with_gemini(name: str) -> dict | None`

**Ne yapar:** Malzeme adını Gemini AI'a gönderir, besin değerlerini structured JSON olarak alır, veritabanı formatına dönüştürür.

**Parametreler:** `name` — Malzeme adı (Türkçe, normalleştirilmiş)

**Başarılı döndürülen değer:**
```python
{
    "calorie_per_100g": 89,
    "protein_per_100g": 1.1,
    "carbohydrate_per_100g": 22.8,
    "fat_per_100g": 0.3,
    "saturated_fat_per_100g": 0.1,
    "fiber_per_100g": 2.6,
    "sugar_per_100g": 12.2,
    "sodium_mg_per_100g": 1,
}
```
Başarısız olursa `None` döner → çağıran kod "manual_required" olarak işler.

---

## Structured JSON Schema

```python
NUTRITION_SCHEMA = {
    "type": "object",
    "properties": {
        "calories_per_100g": {"type": "number"},
        "protein_per_100g": {"type": "number"},
        "carbs_per_100g": {"type": "number"},
        "fat_per_100g": {"type": "number"},
        ...
    },
    "required": ["calories_per_100g", "protein_per_100g", "carbs_per_100g", "fat_per_100g"],
}
```

Schema verilince Gemini modeli sadece bu yapıda JSON döndürür. `response_mime_type="application/json"` ile metin açıklama eklenmez. Bu sayede `json.loads()` her zaman başarılı olur.

---

## Prompt Tasarımı

```
"Detaylı besin değerleri ver: kalori, protein, karbonhidrat, yağ, doymuş yağ,
lif, şeker, sodyum. Bilinmiyorsa 0 yaz. Sadece JSON dön, açıklama yapma.
Malzeme: {name}. Türkçe yerel ürünler için Türk mutfağı bağlamını dikkate al."
```

**Neden "Türk mutfağı bağlamını dikkate al"?** "Pekmez" birçok ülkede farklı şekillerde yapılır. Bu komut Türkiye'ye özgü besin değerini istemek için.

---

## Hata Yönetimi

```python
except Exception as exc:
    if "resourceexhausted" in str(exc).lower() or "429" in str(exc):
        raise HTTPException(status_code=429,
            detail="Gemini API günlük istek limiti doldu. Lütfen birkaç dakika sonra tekrar deneyin.")
    return None  # Diğer hatalar için sessizce None döner
```

- **429 (Rate Limit):** Kullanıcıya anlamlı hata mesajı gösterilir
- **Diğer hatalar:** `None` döner → caller "manual_required" akışına düşer

---

## Kritik Kod Parçaları

```python
client = genai.Client(api_key=api_key)
response = client.models.generate_content(
    model="gemini-2.5-flash",
    contents=prompt,
    config=genai_types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=NUTRITION_SCHEMA,
    ),
)
```

`gemini-2.5-flash` → Hız ve maliyet açısından optimal. Besin değeri tespiti için Opus seviyesinde doğruluk gerekmez.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Gemini ne zaman yanlış değer verebilir?**
  C: Nadir görülen yerel ürünler için tahmini değerler verebilir. Bu nedenle `nutrition_confidence` değeri saklanır (Gemini = 0.7, elle giriş = 0.4, doğrulanmış DB = 1.0).

- **S: API çağrısı başarısız olursa ne olur?**
  C: `None` döner → `nutrition_resolver_service` bunu "manual_required" olarak işler → kullanıcıya manuel besin değeri giriş formu gösterilir.

- **S: Neden `gemini-2.5-flash` modeli seçildi?**
  C: Flash modeli, besin değeri gibi faktüel sorular için Pro/Opus ile benzer doğrulukta; ancak çok daha hızlı ve ucuz. Günlük yüzlerce malzeme sorgusu için maliyet kritik.

- **S: Günlük limit aşılırsa sistem çalışmaz mı?**
  C: Tam olarak değil. Limit aşılınca sadece yeni malzeme ekleme özelliği kısıtlanır. Mevcut tariflerdeki malzemelerin besin değerleri zaten DB'de saklandığı için health score hesaplama devam eder.
