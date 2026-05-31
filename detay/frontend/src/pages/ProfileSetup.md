# ProfileSetup.jsx — Profil Kurulum Sayfası

## Bu Dosya Ne İçin Var?

İlk kayıt sonrası kullanıcının beslenme profilini oluşturmasını sağlar: yaş, cinsiyet, boy, kilo, aktivite düzeyi, hedef ve günlük öğün sayısı. Bu bilgiler günlük kalori hedefini hesaplamak için kullanılır.

## Mimarideki Yeri

**Katman:** Frontend Auth-Sonrası Sayfası

- Kayıt doğrulandıktan hemen sonra gösterilir
- `PUT /api/users/{id}/profile` ile kaydedilir
- Tamamlandıktan sonra Dashboard'a yönlendirilir

## Kalori Hesabı

Backend `user_service.py` içinde Harris-Benedict formülü:

```
Erkek:  BMR = 88.36 + (13.4 × kg) + (4.8 × cm) - (5.7 × yaş)
Kadın:  BMR = 447.6 + (9.2 × kg) + (3.1 × cm) - (4.3 × yaş)

Aktivite faktörü:
- Sedanter: 1.2
- Hafif aktif: 1.375
- Orta aktif: 1.55
- Çok aktif: 1.725

Hedef faktörü:
- Kilo vermek: -500 kcal
- Kilo almak: +300 kcal
- Korumak: 0

daily_calorie = BMR × aktivite_faktörü + hedef_faktörü
```

## Sıkça Sorulabilecek Hoca Soruları

- **S: Profil kurulumu zorunlu mu?**
  C: Zorunlu değil; atlanabilir. Ancak kalori hedefi hesaplanmadan Dashboard boş görünür.

- **S: Bilgiler sonradan değiştirilebilir mi?**
  C: Evet. `ProfileEdit.jsx` sayfasından her zaman güncellenebilir.
