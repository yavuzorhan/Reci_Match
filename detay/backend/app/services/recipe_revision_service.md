# recipe_revision_service.py — Tarif Revizyonu Servisi

## Bu Dosya Ne İçin Var?

Kullanıcının bir tarifi Gemini AI ile değiştirmesini sağlar: malzeme ekle/çıkar, pişirme süresini değiştir, belirli istekler ekle. Önbellekleme ile aynı revizyon tekrar yapılmaz.

## Mimarideki Yeri

**Katman:** Service (İş Mantığı + Dış AI Entegrasyonu)

- `app/routers/recipes.py` → `revise_recipe()` ve `save_revised_recipe()` için
- `recipe_repository.py` → önbellek sorguları için
- Doğrudan Gemini API'yi çağırır (besin değeri için değil, tarif düzenleme için)

## Fonksiyonlar

### `revise_recipe(db, recipe_id, user_id, modifications)`

**Ne yapar:** Bir tarifi Gemini AI ile revize eder.

**Önbellek akışı:**
```python
modifications_hash = _hash_modifications(normalized_modifications)  # SHA-256
cached = recipe_repository.find_revision_cache(db, recipe_id, modifications_hash)
if cached:
    return {"status": "success", "cached": True, ...}  # Gemini çağrılmaz!
```

`_hash_modifications()` → Değişiklik sözlüğünü JSON'a çevir → SHA-256 özeti al. Aynı tarif + aynı değişiklikler = aynı hash = önbellekten dön.

**Gemini çağrısı:**
```python
recipe_json = recipe_service.serialize_recipe_detail(recipe)
revised = _revise_with_gemini(recipe_json, normalized_modifications)
```

Tüm tarif bilgisi (malzemeler, hazırlık, süre) JSON olarak Gemini'ye gönderilir.

### `save_revised_recipe(db, recipe_id, user_id, revised_recipe)`

**Ne yapar:** Revize edilmiş tarifi kullanıcının kişisel tarifi olarak kaydeder.

`recipe_service.create_custom_recipe()` → Revize tarif aslında yeni bir özel tarif olarak eklenir. Orijinal tarif değişmez.

---

## Hallüsinasyon Filtresi (Kritik Güvenlik Kodu)

```python
allowed_norms = (
    {ascii_fold(n) for n in original_ingredient_names}  # Orijinal malzemeler
    - {ascii_fold(r) for r in requested_removals}        # Çıkarılanlar hariç
    | {ascii_fold(n) for n in requested_additions}       # Kullanıcı eklemeleri dahil
)
filtered = [
    item for item in parsed["ingredients"]
    if ascii_fold(item.get("ingredient_name", "")) in allowed_norms
]
```

**Neden var?** Gemini bazen "hayal gücüyle" yeni malzemeler ekleyebilir (hallüsinasyon). Bu filtre:
- Sadece orijinal tarifteki malzemelere izin verir
- Kullanıcının eklediği malzemelere izin verir
- Kullanıcının çıkardığı malzemeleri kaldırır
- Gemini'nin uydurduğu diğer malzemeleri filtreler

---

## Prompt Tasarımı

```python
prompt = f"""Asagidaki tarifi verilen degisikliklere gore revize et.
...
Su kurallara uy:
- Sadece orijinal malzemeleri ve kullanicinin ekledigi malzemeleri kullan.
- Yeni ve alakasiz malzeme uydurma.
- Cikarilan malzeme tarifin dokusunu etkiliyorsa yapisal alternatif oner.
- Saglik skoru veya kullanicinin saglik durumu hakkinda iddia uretme.
"""
```

Prompt çok detaylı ve kısıtlayıcı yazılmış. Bunun amacı Gemini'nin yanıt kalitesini artırmak ve istenmeyen içerik üretimini önlemek.

---

## Sıkça Sorulabilecek Hoca Soruları

- **S: Önbellekleme neden önemli?**
  C: Gemini API hem maliyetli (ücretli istek) hem yavaş (2-5 saniye). Aynı kullanıcı aynı tarifi aynı isteklerle tekrar revize etse 0 maliyet ve anında yanıt alır.

- **S: SHA-256 hash neden kullanılıyor?**
  C: 256-bit hash = çarpışma ihtimali astronomik olarak düşük. Farklı değişiklik kombinasyonları farklı hash üretir. Veritabanında basit string karşılaştırması ile önbellek aranabilir.

- **S: Revize tarif orijinal tarifte mi değişiyor?**
  C: Hayır. Revize edilmiş tarif, kullanıcının kişisel yeni tarifi olarak eklenir. Orijinal global tarif hiç değişmez.

- **S: Kullanıcı "şekersiz yap" istese ne olur?**
  C: `modifications.remove_ingredients = ["şeker"]` → Gemini şeker olmadan hazırlık adımlarını yeniden yazar → Filtre şekerin gerçekten kaldırıldığını doğrular → Sonuç yeni tarif olarak kaydedilir.
