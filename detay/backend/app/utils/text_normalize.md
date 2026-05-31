# text_normalize.py — Türkçe Metin Normalleştirme

## Bu Dosya Ne İçin Var?

Türkçe metinlerin arama ve karşılaştırma için tutarlı formata dönüştürülmesini sağlar. Özellikle Türkçe karakterlerin (ğ→g, ş→s, ı→i vb.) ASCII eşdeğerlerine çevrilmesi için kullanılır.

## Mimarideki Yeri

**Katman:** Utility

- `ingredient_resolver_service.py` → malzeme adı karşılaştırması
- `recipe_health.py` → `_fold_text()` iç kopyası (bağımlılıktan kaçınmak için)

## Ana Fonksiyon

### `normalize_turkish_text(text: str) -> str`
**Ne yapar:** Türkçe karakterleri ASCII'ye dönüştürür, küçük harfe indirir, fazla boşlukları temizler.

```python
"Doğal Süt" → "dogal sut"
"Çiğ Köfte" → "cig kofte"
"Şalgam Suyu" → "salgam suyu"
```

**Neden gerekli:** PostgreSQL `LOWER()` Türkçe karakterleri doğru işlemez. "ğ" ile "g" SQL'de farklı karakter. Python seviyesinde normalize edip karşılaştırmak daha güvenilir.

### `contains_any_word(text: str, terms: set[str]) -> bool`
**Ne yapar:** Metinde bir kelime seti içindeki herhangi bir kelime var mı kontrol eder.
**Neden `in` operatörü değil:** Kelime sınırı kontrolü (ör: "un" kelimesi "tulum" içinde geçmemeli).

## Sıkça Sorulabilecek Hoca Soruları

- **S: Neden `unicodedata.normalize("NFKD", ...)` kullanılıyor?**
  C: Unicode'da bazı karakterler farklı byte kombinasyonlarıyla aynı görsel karakteri ifade edebilir. NFKD bu farklı temsilleri standart forma indirger.

- **S: Bu dönüşüm geri döndürülebilir mi?**
  C: Hayır. "ğ"→"g" bilgi kaybı. Bu yüzden orijinal malzeme adı `ingredient_name`'de korunur; karşılaştırma için normalize edilmiş versiyon kullanılır.
