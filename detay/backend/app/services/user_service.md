# user_service.py — Kullanıcı Profil ve Tercih Servisi

## Bu Dosya Ne İçin Var?

Kullanıcının beslenme profilini, günlük öğün kayıtlarını, favori tariflerini ve dolap içeriğini yönetir. Kullanıcıya özgü tüm veri işlemlerini barındırır.

## Mimarideki Yeri

**Katman:** Service (İş Mantığı)

- `app/routers/users.py` → bu servisi çağırır
- `user_repository.py` → veritabanı sorguları

## Temel İşlevler

### Profil Yönetimi

Kullanıcının yaş, cinsiyet, boy, kilo, aktivite düzeyi ve hedefini günceller. Günlük kalori hedefi Harris-Benedict formülüyle hesaplanır:

```
Erkek BMR = 88.36 + (13.4 × kg) + (4.8 × cm) - (5.7 × yaş)
Kadın BMR = 447.6 + (9.2 × kg) + (3.1 × cm) - (4.3 × yaş)
```

BMR × aktivite faktörü × hedef faktörü = `daily_calorie`

### Günlük Log Yönetimi

`add_daily_log()` → Kullanıcı tarif yedi bilgisini kaydeder. Kalori, protein, karbonhidrat, yağ değerlerini porsiyon sayısına göre hesaplar.

`get_daily_logs()` → Kullanıcının tüm öğün geçmişi. Frontend dashboard için.

`remove_daily_log()` → Öğün kaydı sil.

### Favori Yönetimi

`add_favorite(user_id, recipe_id)` → Favorilere ekle.
`remove_favorite(user_id, recipe_id)` → Favorilerden çıkar.
`get_favorites(user_id)` → Favori tarif ID listesi.

### Dolap (Pantry) Yönetimi

`add_to_pantry(user_id, ingredient_id)` → Dolaba malzeme ekle.
`remove_from_pantry(user_id, ingredient_id)` → Dolabdan çıkar.
`get_pantry(user_id)` → Dolap içeriği.

### Sevilmeyen Malzeme Yönetimi

`add_disliked(user_id, ingredient_id)` → Kara listeye ekle.
`remove_disliked(user_id, ingredient_id)` → Kara listeden çıkar.

## Sıkça Sorulabilecek Hoca Soruları

- **S: `daily_calorie` her profil güncellemesinde tekrar hesaplanıyor mu?**
  C: Evet. Yaş, kilo veya aktivite değişince kalori hedefi otomatik yeniden hesaplanır ve `users.daily_calorie` güncellenir.

- **S: Kullanıcı aynı tarifi iki kez favoriye ekleyebilir mi?**
  C: Hayır. `favorites` tablosunda `user_id + recipe_id` için unique constraint veya uygulama seviyesinde kontrol var. Toggle mantığıyla çalışır: zaten favoriyse çıkar, değilse ekle.
