# Tarif Eslestirme Mantigi

Bu akis `backend/app/services/recipe_service.py` icindeki `get_recommendations` fonksiyonunda calisir.

```python
selected_ids = set(selected_ingredient_ids)
```

// Ne yapiyor: Kullanicinin ozellikle sectigi malzemeleri set'e cevirir.
// Neden yazildi: Tekrar eden malzemeler temizlensin ve karsilastirma hizli olsun diye.

```python
pantry_ids = set(pantry_ingredient_ids)
pantry_only_ids = pantry_ids - selected_ids
```

// Ne yapiyor: Dolaptaki malzemeleri ayirir, secili malzemelerde zaten olanlari cikarir.
// Neden yazildi: Ayni malzeme iki kere puan kazandirmasin diye.

```python
disliked_ids = set(disliked_ingredient_ids) if exclude_disliked else set()
```

// Ne yapiyor: Kullanici istemediyse sevilmeyen malzemeleri dikkate alir.
// Neden yazildi: Kullanici sevmedigi malzemeleri iceren tarifleri gormesin veya dusuk puanla gorsun diye.

```python
available_ids = selected_ids | pantry_ids
```

// Ne yapiyor: Kullanicinin kullanabilecegi tum malzemeleri birlestirir.
// Neden yazildi: Tarif onerisi eldeki tum malzemelere gore yapilsin diye.

```python
ingredient_keys(ingredient_name)
```

// Ne yapiyor: Malzeme adindan eslestirme anahtarlari uretir.
// Neden yazildi: Yazim farklari eslesmeyi bozmasin diye.
// Ornek: "Domates", "domatesi", "domates rendesi" benzer anahtarlarla yakalanabilir.

```python
item_keys & keys
```

// Ne yapiyor: Tarif malzemesi ile kullanici malzemesi arasinda ortak anahtar var mi bakar.
// Neden yazildi: Ortak anahtar varsa malzemeler eslesmis kabul edilir.
// Bilmen gereken: `&`, set kesisimidir.

```python
matched_links.append(item)
```

// Ne yapiyor: Eslesen tarif malzemesini listeye ekler.
// Neden yazildi: Frontend "bu malzemeler eslesti" diye gosterebilsin diye.

```python
missing_links.append(item)
```

// Ne yapiyor: Kullanıcıda olmayan tarif malzemesini listeye ekler.
// Neden yazildi: Frontend "eksik malzemeler" listesini gosterebilsin diye.

```python
disliked_links.append(item)
```

// Ne yapiyor: Tarif sevilmeyen malzeme iceriyorsa onu listeye ekler.
// Neden yazildi: Kullanici istemedigi malzemeyi fark edebilsin veya tarif elensin diye.

## Skor Mantigi

```python
selected_score = (selected_hit_count / len(selected_ids)) * 75 if selected_ids else 0
```

// Ne yapiyor: Kullanicinin secili malzemelerinin ne kadari eslesti hesaplar.
// Neden yazildi: Secili malzemeler en onemli girdidir, bu yuzden en fazla 75 puan getirir.

```python
pantry_score = (pantry_hit_count / len(pantry_only_ids)) * 15 if pantry_only_ids else 0
```

// Ne yapiyor: Dolap malzemelerinden kacinin eslestigini hesaplar.
// Neden yazildi: Dolap malzemeleri destekleyici puan versin ama secili malzemeler kadar agirlikli olmasin diye.

```python
recipe_bonus = min(10, recipe_match_ratio * 20)
```

// Ne yapiyor: Tarifin toplam malzemelerinin ne kadarinin eslestigine gore bonus verir.
// Neden yazildi: Tarifin genel uyumu da skora yansisin diye.

```python
matched_bonus = min(10, matched_count * 2)
```

// Ne yapiyor: Eslesen malzeme sayisina gore ek bonus verir.
// Neden yazildi: Daha cok malzeme eslesen tarif biraz daha one ciksin diye.

```python
disliked_penalty = disliked_count * 35
```

// Ne yapiyor: Sevilmeyen her malzeme icin puan dusurur.
// Neden yazildi: Kullanici sevmedigi malzemeleri iceren tarifler geriye dussun diye.

```python
score = selected_score + pantry_score + recipe_bonus + matched_bonus - disliked_penalty
```

// Ne yapiyor: Tum puan ve cezaları birlestirir.
// Neden yazildi: Tek bir anlasilir tarif eslesme skoru uretmek icin.

```python
score = round(max(5 if matched_count else 0, min(100, score)))
```

// Ne yapiyor: Skoru 100'u gecmeyecek sekilde sinirlar ve yuvarlar.
// Neden yazildi: Frontend'de 0-100 arasi okunabilir skor gosterilsin diye.

## Hocaya 1 Dakikada Anlat

// Sistem once kullanicinin malzemelerini ve tarifin malzemelerini normalize ediyor.
// Ortak anahtar varsa malzeme eslesmis sayiliyor.
// Secili malzemeler skorda en yuksek agirlikta.
// Dolap malzemeleri ek puan veriyor.
// Tarifin genel uyumu ve eslesen malzeme sayisi bonus getiriyor.
// Sevilmeyen malzemeler ceza veriyor veya filtreleniyor.
// Sonra tarifler skora gore siralaniyor.

