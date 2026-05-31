# AppContext.jsx — Global Durum Yönetimi (React Context API)

## Bu Dosya Ne İçin Var?

Tüm uygulamanın ortak ihtiyaç duyduğu verileri (kullanıcı bilgisi, favoriler, dolap içeriği, tema) tek bir merkezde tutar ve tüm sayfalara dağıtır. Her sayfa kendi API çağrısı yapmak yerine buradan veri alır.

## Mimarideki Yeri

**Katman:** Frontend Global State Yönetimi

- `App.jsx` → `AppProvider` ile tüm uygulamayı sarar
- Her sayfa ve bileşen → `useApp()` hook'u ile verilere erişir
- `config.js`'ten `API_BASE` URL'ini alır

## React Context API Nedir?

React'ta veriler normalde "props" yoluyla üstten alta aktarılır. 10 katman derin bir bileşene veri göndermek çok karmaşık olur ("prop drilling").

Context API bu sorunu çözer:
1. `AppContext = createContext()` → Merkezi bir veri deposu
2. `AppProvider` → Tüm uygulamayı saran sağlayıcı
3. `useApp()` → Herhangi bir bileşenden verilere erişme hook'u

---

## Global State (Tutulan Veriler)

| State | Tip | Açıklama |
|---|---|---|
| `user` | object/null | Giriş yapmış kullanıcı (id, email, name) |
| `profile` | object | Kullanıcının beslenme profili (kalori, hedef, aktivite) |
| `isDarkMode` | boolean | Karanlık mod açık mı? |
| `dislikedIngredients` | array | Sevilmeyen malzeme ID'leri |
| `selectedIngredients` | array | Öneri için seçilen malzeme ID'leri |
| `pantryIngredients` | array | Dolaptaki malzemeler |
| `favorites` | array | Favori tarif ID'leri |
| `dailyLogs` | array | Günlük öğün kayıtları |
| `recipeCache` | object | ID → tarif verisi önbelleği |

---

## Tema Yönetimi

### Neden `localStorage['reciMatch_theme_<userId>']`?

Her kullanıcının kendi tema tercihi ayrı saklanır. Böylece aynı cihazda farklı kullanıcılar farklı tema kullanabilir.

```javascript
const [isDarkMode, setIsDarkMode] = useState(() => {
    const userId = savedUser?.id;
    if (userId) {
        const userTheme = localStorage.getItem(`reciMatch_theme_${userId}`);
        if (userTheme) return userTheme === 'dark';
    }
    return false;  // Varsayılan: açık tema
});
```

**Tema senkronizasyonu:**
```javascript
useEffect(() => {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    if (user?.id) {
        localStorage.setItem(`reciMatch_theme_${user.id}`, isDarkMode ? 'dark' : 'light');
    }
}, [isDarkMode, user]);
```

`document.body.classList` değişince CSS `body.dark-mode .component { ... }` kuralları devreye girer.

---

## Önemli Fonksiyonlar

### `fetchUserPreferences()`
**Ne yapar:** Kullanıcı giriş yaptığında tüm tercihlerini toplu API çağrısıyla yükler.

```javascript
const [dislikedData, pantryData, favoriteIds, dailyLogData, profileData] = await Promise.all([
    safeFetch(`/api/users/${user.id}/disliked-ingredients`, []),
    safeFetch(`/api/users/${user.id}/ingredients`, []),
    safeFetch(`/api/users/${user.id}/favorites`, []),
    safeFetch(`/api/users/${user.id}/daily-logs`, []),
    safeFetch(`/api/users/${user.id}/profile`, {}),
]);
```

`Promise.all()` → 5 istek eş zamanlı gönderilir. Ardışık 5 istek yerine paralel = çok daha hızlı.

### `fetchRecipeById(id)`
**Ne yapar:** Önce `recipeCache`'e bakar; varsa API çağrısı yapmaz.
**Neden önemli:** Aynı tarif tekrar tekrar görüntülenebilir. Cache sayesinde gereksiz API çağrısı önlenir.

### `toggleFavorite(recipeId)`
**Ne yapar:** Favori ekleme/çıkarma işlemi. API'yi çağırır ve local state'i günceller.
**Optimistic update değil:** Önce API, sonra state güncelleme. Hata olursa state değişmemiş olur.

### `addDailyLog({recipeId, mealType, servingCount, ...})`
**Ne yapar:** "Yedim" kaydı oluşturur. Kalori, protein, karbonhidrat, yağ değerlerini porsiyona göre hesaplar.

```javascript
const resolvedServing = normalizeServingPortion(servingCount ?? portion ?? 1);
const resolvedCalorieIntake = recipeCalories * resolvedServing;
```

### `reviseRecipe(recipeId, modifications)`
**Ne yapar:** Gemini AI'a tarif revizyonu isteği gönderir.

### `withProxiedImage(recipe)`
**Ne yapar:** Harici resim URL'lerini backend proxy'si üzerinden geçirir. Böylece CORS sorunları olmaz ve önbellekleme sağlanır.

---

## `dashboardData` — Dashboard İçin Hesaplama

```javascript
const dashboardData = useMemo(() => {
    const todayLogs = dailyLogs.filter(log => {
        const logDate = new Date(log.loggedAt).toISOString().split('T')[0];
        return logDate === todayStr;
    });

    const consumed = todayLogs.reduce((acc, log) => ({
        calories: acc.calories + log.calorieIntake,
        protein: acc.protein + log.protein,
        ...
    }), { calories: 0, protein: 0, carb: 0, fat: 0 });

    return { dailyCalorieTarget, consumedCalories, macros, macroTargets };
}, [dailyLogs, profile, calorieTarget, ...]);
```

`useMemo()` → Bu hesaplama sadece `dailyLogs` veya `profile` değiştiğinde tekrar yapılır. Her render'da hesaplanmaz.

---

## Sıkça Sorulabilecek Hoca Soruları

- **S: React Context neden Redux kullanılmadı?**
  C: Bu boyuttaki uygulama için Context API yeterli. Redux ekstra karmaşıklık ve öğrenme eğrisi getirir. Context daha az kod ve React'ın yerleşik çözümü.

- **S: Tema localStorage'da neden kullanıcı ID'siyle saklanıyor?**
  C: Aynı cihazda birden fazla kullanıcı farklı tema kullanabilsin diye. Genel `reciMatch_theme` anahtarı kullansaydık kullanıcı geçişlerinde tema karışırdı.

- **S: `recipeCache` sonsuz büyümez mi?**
  C: Oturum boyunca büyür ama sayfa yenilendiğinde sıfırlanır (localStorage'a yazılmıyor). Normal kullanımda yüzlerce tarif görüntülenmediğinden sorun olmaz.

- **S: Neden `useCallback` kullanılıyor?**
  C: `fetchUserPreferences` gibi fonksiyonlar bağımlılık olarak başka `useEffect`'lerde kullanılıyor. `useCallback` olmadan her render'da yeni fonksiyon nesnesi oluşur → sonsuz döngü riski.
