# DislikedIngredients.jsx — Sevilmeyen Malzemeler

## Bu Dosya Ne İçin Var?

Kullanıcının sevmediği veya alerjisi olan malzemeleri yönetir. Bu liste öneri algoritmasını etkiler.

## Mimarideki Yeri

**Katman:** Frontend Sayfa

- `AppContext` → `dislikedIngredients`
- `/api/users/{id}/disliked-ingredients` → CRUD

## Etki Mekanizması

Sevilmeyen malzeme:
- **Ceza:** Öneri puanında her malzeme için -35 puan
- **Çıkarma:** "Sevilmeyenleri Çıkar" seçilince bu malzeme içeren tarifler listeden tamamen kaldırılır

## Sıkça Sorulabilecek Hoca Soruları

- **S: Çiçek balı sevmiyorum ama bal seviyorum — ayrı ayrı girebilir miyim?**
  C: Evet. Her girdi ayrı malzeme kaydına bağlı. Sistem malzeme bazında çalışır.

- **S: Sevilmeyen malzeme favorileri etkiler mi?**
  C: Hayır. Sadece öneri algoritmasını etkiler. Mevcut favoriler değişmez.
