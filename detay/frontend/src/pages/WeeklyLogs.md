# WeeklyLogs.jsx — Haftalık Öğün Planı

## Bu Dosya Ne İçin Var?

Kullanıcının haftanın günlerine tarif planlayabileceği ve planı uygulayınca günlük loga kaydettirebileceği haftalık plan ekranı.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `dailyLogs`, `addDailyLog()`, `removeDailyLog()`
- `entry_source = "weekly"` → bu sayfadan eklenen loglar farklı etiketlenir

## Özellikler

### 7 Günlük Takvim Görünümü
Pazartesi-Pazar satırları. Her güne Kahvaltı, Öğle, Akşam slotları.

### Tarif Ekleme
Slot'a tıklanır → tarif arama → seçilir → o güne planlama kaydı oluşturulur.

### Besin Özeti
Haftanın her günü için toplam kalori, protein, karbonhidrat gösterilir.

### Plan → Log Dönüştürme
"Bugün uygula" butonu → Planlanan öğünler `addDailyLog()` ile günlük loga işlenir.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Haftalık plan loglardan nasıl ayrışıyor?**
  C: `entry_source = "weekly"` vs `"daily"`. Dashboard günlük logda `entry_source !== 'weekly'` filtreleyerek haftalık planlanmış ama henüz yenilmemiş öğünleri hariç tutar.

- **S: Plan kaydedilince kalori sayılıyor mu?**
  C: Sadece "uygula" butonuna basınca daily log'a işlenir ve kalori sayılmaya başlar.
