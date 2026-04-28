export const ingredients = [
  { id: 1, name: "Yumurta", category: "Protein" },
  { id: 2, name: "Domates", category: "Sebze" },
  { id: 3, name: "Biber", category: "Sebze" },
  { id: 4, name: "Tavuk Göğsü", category: "Protein" },
  { id: 5, name: "Pirinç", category: "Bakliyat" },
  { id: 6, name: "Makarna", category: "Bakliyat" },
  { id: 7, name: "Soğan", category: "Sebze" },
  { id: 8, name: "Patates", category: "Sebze" },
  { id: 9, name: "Süt", category: "Süt Ürünü" },
  { id: 10, name: "Peynir", category: "Süt Ürünü" },
  { id: 11, name: "Mantar", category: "Sebze" },
  { id: 12, name: "Zeytinyağı", category: "Yağ" },
  { id: 13, name: "Tereyağı", category: "Yağ" },
  { id: 14, name: "Sarımsak", category: "Sebze" },
  { id: 15, name: "Salça", category: "Baharat/Sos" }
];

export const recipes = [
  {
    id: 1,
    name: "Menemen",
    explanation: "Geleneksel Türk kahvaltısı vazgeçilmezi.",
    preparation: "Domatesleri küp küp doğrayın. Biberleri soteleyin. Yumurtaları kırıp pişirin.",
    cooking_type: "tavada",
    serving: 2,
    calorie: 250,
    protein: 12,
    carbohydrate: 15,
    fat: 18,
    image_url: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=800",
    ingredients: [1, 2, 3, 7, 12] // Yumurta, Domates, Biber, Soğan, Zeytinyağı
  },
  {
    id: 2,
    name: "Tavuklu Sebze Sote",
    explanation: "Protein deposu ve sağlıklı bir akşam yemeği.",
    preparation: "Tavukları ve sebzeleri soteleyin. Baharatlarını ekleyin.",
    cooking_type: "tavada",
    serving: 4,
    calorie: 350,
    protein: 45,
    carbohydrate: 10,
    fat: 12,
    image_url: "https://images.unsplash.com/photo-1626700051175-6518a4993f57?auto=format&fit=crop&q=80&w=800",
    ingredients: [4, 2, 3, 7, 8, 12, 14] // Tavuk, Domates, Biber, Soğan, Patates, Zeytinyağı, Sarımsak
  },
  {
    id: 3,
    name: "Fırında Patatesli Mantar",
    explanation: "Pratik ve lezzetli bir garnitür.",
    preparation: "Patates ve mantarları doğrayıp fırınlayın.",
    cooking_type: "fırında",
    serving: 3,
    calorie: 220,
    protein: 5,
    carbohydrate: 35,
    fat: 8,
    image_url: "https://images.unsplash.com/photo-1544333346-6467332f1a6f?auto=format&fit=crop&q=80&w=800",
    ingredients: [8, 11, 12, 14] // Patates, Mantar, Zeytinyağı, Sarımsak
  },
  {
    id: 4,
    name: "Peynirli Omlet",
    explanation: "Hızlı ve besleyici bir kahvaltı.",
    preparation: "Yumurtaları çırpın, peyniri ekleyin ve tavada pişirin.",
    cooking_type: "tavada",
    serving: 1,
    calorie: 300,
    protein: 18,
    carbohydrate: 2,
    fat: 22,
    image_url: "https://images.unsplash.com/photo-1510693206972-df098062cb71?auto=format&fit=crop&q=80&w=800",
    ingredients: [1, 10, 13] // Yumurta, Peynir, Tereyağı
  }
];
