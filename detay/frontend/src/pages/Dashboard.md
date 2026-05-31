# Dashboard.jsx — Ana Sayfa / Gösterge Paneli

## Bu Dosya Ne İçin Var?

Kullanıcının günlük beslenme durumunu özetler: günlük kalori hedefi, tüketilen kalori, makro besinler (protein/karbonhidrat/yağ) ve son öğünler. Uygulamanın ana sayfasıdır.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `dashboardData`, `dailyLogs`, `profile`, `recipeCache` kullanır
- `Layout.jsx` içinde render edilir

## Ne Gösterir?

### Kalori Çubuğu
```javascript
consumedCalories / dailyCalorieTarget × 100%
```
Yeşil çubuk bugün ne kadar kalori tüketildiğini gösterir. Hedefi aşınca kırmızıya döner.

### Makro Özeti
Protein, karbonhidrat ve yağ için günlük hedef ve tüketilen miktarlar.
- Hedef: `calorieTarget × makro_yüzdesi / kalori_katsayısı`
- Protein hedef = kalori × %25 / 4
- Karbonhidrat hedef = kalori × %45 / 4
- Yağ hedef = kalori × %30 / 9

### Son Öğünler
Bugünkü loglardan son 3-5 öğün. Her birinin tarif adı, öğün tipi ve kalorisi.

### Profil Özeti
Kullanıcının hedefi (Kilo Vermek/Almak/Korumak) ve günlük kalori hedefi.

## Tema Desteği

```jsx
const { isDarkMode } = useApp();
// Layout üzerinden data-theme aktarılır
```

Açık/karanlık tema otomatik uygulanır; Dashboard CSS her iki temayı destekler.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Kalori verisi nereden geliyor?**
  C: `dailyLogs` state'inden. Her log kaydının `calorieIntake` alanı toplanır. Bugünün logları `log_date === todayStr` filtresiyle ayrılır.

- **S: Makro hedefleri nasıl hesaplanıyor?**
  C: Genel beslenme kılavuzuna göre belirlendi: Protein %25, Karbonhidrat %45, Yağ %30. Kullanıcının günlük kalori hedefine uygulanır.

- **S: Dashboard boşsa ne gösterir?**
  C: "Henüz öğün kaydı yok" mesajı ve tarif önerisine yönlendiren buton.
