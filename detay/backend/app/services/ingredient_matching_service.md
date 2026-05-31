# ingredient_matching_service.py — Malzeme Eşleştirme Servisi

## Bu Dosya Ne İçin Var?

Tarif malzemeleri ile kullanıcının seçtiği malzemeleri metin bazında eşleştirir. Öneri algoritmasının çekirdeği için kullanılır.

## Mimarideki Yeri

**Katman:** Service (Metin İşleme)

- `recipe_service.py` → öneri algoritmasında malzeme eşleşmesi için

## Eşleştirme Mantığı

Malzeme adları token'lara bölünür ve kesişim kontrol edilir:

```python
"Tavuk Göğsü" → {"tavuk", "gogsu"}
"Tavuk Kanat" → {"tavuk", "kanat"}
# Kesişim: {"tavuk"} → eşleşme var!
```

Türkçe karakterler normalize edilir (ğ→g, ş→s) böylece "Soğan" = "sogan" eşleşir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Token tabanlı eşleşme yerine tam isim karşılaştırması neden kullanılmıyor?**
  C: "Tavuk" seçilince "Tavuk Göğsü (Derisiz)", "Tavuk Kanat", "Bütün Tavuk" gibi varyantların da eşleşmesi gerekiyor. Tam isim karşılaştırması bunu sağlayamaz.
