# Layout.jsx — Sayfa Düzeni Bileşeni

## Bu Dosya Ne İçin Var?

Tüm sayfalarda ortak olan üst çubuk (navbar/topbar) ve yan menüyü (sidebar) sağlar. Auth sayfaları dışında her sayfa bu bileşenin içinde render edilir.

## Mimarideki Yeri

**Katman:** Frontend Bileşen (Yapısal)

- `App.jsx` → route'lara göre Layout'a sarmalar
- İçine `Dashboard.jsx`, `RecipeListDb.jsx` vb. gömülür
- `AppContext` → `user`, `isDarkMode`, `toggleDarkMode`

## Ne İçerir?

### Topbar (Üst Çubuk)
- ReciMatch logosu
- Karanlık/Açık mod toggle butonu
- Kullanıcı adı ve çıkış butonu

### Sidebar (Yan Menü)
Navigasyon bağlantıları:
- Anasayfa (Dashboard)
- Malzeme Seçimi
- Tarif Önerileri
- Tariflerim
- Sağlıklı Menü
- Favorilerim
- Dolabım
- Haftalık Plan
- Sevilmeyen Malzemeler
- Profilim

### `data-theme` Attribute
```jsx
<div className="layout-shell" data-theme={isDarkMode ? 'dark' : 'light'}>
```

Bu attribute, CSS'de açık tema override'larının çalışması için gerekli.

## Sıkça Sorulabilecek Hoca Soruları

- **S: Bell (bildirim) ve AI Assistant butonları neden yok?**
  C: Kasıtlı kaldırıldı. Bildirim sistemi ve AI assistant özellikleri bu proje kapsamında uygulanmadı. Gereksiz UI elementi olmamak için çıkarıldı.

- **S: Mobil menü var mı?**
  C: Responsive tasarım var. Dar ekranlarda sidebar daraltılır veya toggle menüsüne dönüşür.
