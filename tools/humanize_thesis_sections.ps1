param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$src = (Resolve-Path $InputPath).Path
$dst = Join-Path (Get-Location) $OutputPath
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("docx_humanize_" + [guid]::NewGuid().ToString("N"))

function Get-NodeText {
  param($Node, $Ns)
  return (($Node.SelectNodes(".//w:t", $Ns) | ForEach-Object { $_.'#text' }) -join "")
}

function Set-NodeText {
  param($Node, $Ns, [string]$Text)
  $texts = @($Node.SelectNodes(".//w:t", $Ns))
  if ($texts.Count -eq 0) { return }
  $texts[0].'#text' = $Text
  for ($i = 1; $i -lt $texts.Count; $i++) {
    $texts[$i].'#text' = ""
  }
}

$replacements = @{
  "Projede kullanılan teknolojiler seçilirken uygulamanın tarayıcı üzerinden çalışması, kullanıcı işlemlerini güvenli biçimde yönetmesi, verileri ilişkisel olarak saklaması ve tarif öneri sürecinin hızlı ilerlemesi dikkate alınmıştır. Bu nedenle her teknoloji, projenin belirli bir ihtiyacını karşılayacak şekilde kullanılmıştır." =
    "Projede kullanılan teknolojiler seçilirken uygulamanın tarayıcıda sorunsuz çalışması, kullanıcı işlemlerinin güvenli yürütülmesi, verilerin düzenli saklanması ve tarif önerilerinin hızlı üretilebilmesi dikkate alınmıştır. Bu yüzden her araç, projedeki somut bir ihtiyacı karşılayacak şekilde seçilmiştir."

  "React, uygulamanın kullanıcı arayüzünü oluşturmak için kullanılmıştır. Kayıt, giriş, ana menü, tarif listesi, tarif detayı, favoriler ve günlük kayıt ekranları React bileşenleri halinde düzenlenmiştir. Bu tercih, ekranların ayrı parçalar halinde yönetilmesini ve arayüzde tekrar eden yapıların daha kolay kullanılmasını sağlamıştır." =
    "React, uygulamanın arayüz tarafını kurmak için tercih edilmiştir. Kayıt, giriş, ana menü, tarif listesi, tarif detayı, favoriler ve günlük kayıt ekranları ayrı bileşenler olarak hazırlanmıştır. Böylece ekranları tek tek geliştirmek, ortak arayüz parçalarını yeniden kullanmak ve değişiklikleri daha kontrollü yapmak mümkün olmuştur."

  "Vite, React projesinin geliştirme ve çalıştırma ortamında kullanılmıştır. Geliştirme sırasında yapılan arayüz değişikliklerinin hızlı görülmesi gerektiği için tercih edilmiştir. Böylece ekran tasarımları ve bileşen düzenlemeleri daha kısa sürede kontrol edilebilmiştir." =
    "Vite, React projesinin geliştirme ortamını daha hızlı çalıştırmak için kullanılmıştır. Arayüz üzerinde yapılan değişikliklerin beklemeden görülebilmesi, özellikle ekran tasarımlarını denerken süreci kolaylaştırmıştır. Bu sayede bileşen düzenlemeleri daha pratik biçimde kontrol edilmiştir."

  "CSS, uygulamanın görsel düzeninin hazırlanmasında kullanılmıştır. Menü yapısı, tarif kartları, form alanları, tema renkleri ve ekranlar arası görünüm bütünlüğü CSS ile düzenlenmiştir. Bu kullanım, arayüzün sadece çalışır değil aynı zamanda okunabilir ve düzenli görünmesini sağlamıştır." =
    "CSS, uygulamanın görsel düzenini oluşturmak için kullanılmıştır. Menü yapısı, tarif kartları, form alanları, tema renkleri ve ekranlar arasındaki görsel uyum CSS dosyalarıyla şekillendirilmiştir. Bu çalışma, arayüzün yalnızca işlevsel kalmamasını, aynı zamanda kullanıcı tarafından rahat okunabilir ve tutarlı görünmesini sağlamıştır."

  "FastAPI, backend tarafında API uç noktalarını hazırlamak ve frontendden gelen istekleri karşılamak için kullanılmıştır. Kullanıcı kaydı, giriş, profil, malzeme seçimi, tarif önerisi, favoriler, günlük kayıtlar ve Gemini revizyon işlemleri bu API yapısı üzerinden yürütülmüştür. Python tabanlı olması, servis katmanındaki iş kurallarının daha sade biçimde yazılmasına yardımcı olmuştur." =
    "FastAPI, backend tarafında frontendden gelen istekleri karşılayan API yapısını kurmak için seçilmiştir. Kullanıcı kaydı, giriş, profil güncelleme, malzeme seçimi, tarif önerisi, favoriler, günlük kayıtlar ve Gemini revizyon işlemleri bu yapı üzerinden ilerler. Python ile birlikte kullanılması, servis katmanındaki iş kurallarını daha okunabilir biçimde yazmayı kolaylaştırmıştır."

  "SQLAlchemy ORM, Python kodu ile PostgreSQL tabloları arasındaki veri erişimini düzenlemek için kullanılmıştır. Model sınıfları üzerinden kullanıcı, tarif, malzeme ve günlük kayıt tabloları temsil edilmiştir. Bu yapı doğrudan SQL yazma ihtiyacını azaltmış ve repository katmanındaki veritabanı işlemlerini daha okunabilir hale getirmiştir." =
    "SQLAlchemy ORM, Python kodu ile PostgreSQL tabloları arasındaki bağlantıyı yönetmek için kullanılmıştır. Kullanıcı, tarif, malzeme ve günlük kayıt gibi yapılar model sınıflarıyla temsil edilmiştir. Bu yaklaşım, veritabanı işlemlerinin repository katmanında daha düzenli ve anlaşılır tutulmasına yardımcı olmuştur."

  "PostgreSQL, projenin ilişkisel veritabanı olarak kullanılmıştır. Kullanıcı bilgileri, tarifler, malzemeler, tarif malzeme ilişkileri, favoriler, sevilmeyen malzemeler, günlük kayıtlar ve revizyon önbelleği bu veritabanında tutulmuştur. İlişkisel yapı sayesinde bir tarifin birden fazla malzemeyle, bir kullanıcının da birçok kayıtla bağlantılı şekilde yönetilmesi mümkün olmuştur." =
    "PostgreSQL, projenin ilişkisel veritabanı olarak tercih edilmiştir. Kullanıcı bilgileri, tarifler, malzemeler, tarif-malzemesi ilişkileri, favoriler, sevilmeyen malzemeler, günlük kayıtlar ve revizyon önbelleği bu veritabanında saklanır. İlişkisel yapı sayesinde tarifler, malzemeler ve kullanıcıya ait kayıtlar birbirleriyle tutarlı biçimde bağlanabilmiştir."

  "Kullanıcı hesaplarının güvenliği için e-posta doğrulama, tek kullanımlık doğrulama kodu ve bcrypt tabanlı şifre saklama yapısı kullanılmıştır. Bu yapı, kullanıcı hesabının yalnızca doğru e-posta doğrulamasından sonra aktif hale gelmesini ve şifrelerin açık metin olarak tutulmamasını sağlamıştır." =
    "Kullanıcı hesaplarının güvenliği için e-posta doğrulama, tek kullanımlık kod ve bcrypt ile şifre saklama yapısı kurulmuştur. Böylece hesaplar doğrulama tamamlandıktan sonra kullanılabilir hale gelir ve kullanıcı şifreleri veritabanında açık metin olarak tutulmaz."

  "Tarif ve malzeme verilerini sisteme uygun hale getirmek için scraper ve alias yapısı kullanılmıştır. Scraper hattı tarif başlığı, malzeme listesi, hazırlanış adımları, porsiyon ve besin bilgisi gibi alanları toplamak için hazırlanmıştır. Alias yapısı ise aynı malzemenin farklı yazımlarını tek bir malzeme kaydıyla eşleştirmek için kullanılmıştır." =
    "Tarif ve malzeme verilerinin uygulamada düzenli kullanılabilmesi için scraper ve alias yapısından yararlanılmıştır. Scraper hattı tarif başlığı, malzeme listesi, hazırlanış adımları, porsiyon ve besin bilgisi gibi alanları toplar. Alias yapısı ise aynı malzemenin farklı yazımlarını tek bir malzeme kaydı altında eşleştirmeye yardımcı olur."

  "Gemini API, sistemde iki farklı amaçla kullanılmıştır. İlk kullanım alanı, besin değeri eksik olan malzemeler için yapılandırılmış JSON çıktısı ile yaklaşık değer üretmektir. İkinci kullanım alanı ise kullanıcının seçtiği tarifi daha hafif, daha proteinli veya belirli malzemeler çıkarılmış şekilde revize etmektir. Gemini çıktıları kesin sağlık bilgisi olarak değil, sistem içinde yardımcı ve tahmini veri olarak değerlendirilmiştir." =
    "Gemini API projede iki noktada devreye alınmıştır. İlk olarak, besin değeri bulunmayan malzemeler için yapılandırılmış JSON formatında yaklaşık değer üretir. İkinci olarak, kullanıcının seçtiği tarifi daha hafif, daha proteinli ya da bazı malzemeleri çıkarılmış şekilde yeniden düzenlemeye yardımcı olur. Bu çıktılar kesin sağlık verisi olarak değil, uygulamanın karar süreçlerini destekleyen tahmini bilgiler olarak ele alınmıştır."

  "Veritabanında ilişkisel model kullanılmıştır. Kullanıcılar, tarifler, malzemeler, günlük kayıtlar ve Gemini revizyonları ayrı tablolar üzerinden yönetilir. Bir tarif birden fazla malzeme içerebilir. Aynı malzeme de birden fazla tarifte kullanılabilir. Bu ilişki recipe_ingredients tablosu ile kurulmuştur." =
    "Veritabanı tasarımında ilişkisel model tercih edilmiştir. Kullanıcılar, tarifler, malzemeler, günlük kayıtlar ve Gemini revizyonları ayrı tablolar altında tutulur. Bir tarifin birden fazla malzemesi olabildiği gibi, aynı malzeme farklı tariflerde de yer alabilir. Bu bağlantı `recipe_ingredients` tablosu üzerinden kurulmuştur."

  "Güncel sistemde besin değeri verileri için ayrı USDA eşleştirme tabloları kullanılmamaktadır. Önceki mimaride malzeme adlarının İngilizceye çevrilmesi ve USDA üzerinde aranması denenmiştir. Ancak Türkçe malzeme adlarında yaşanan eşleşme belirsizlikleri ve gereksiz tablo bağımlılıkları nedeniyle bu yapı sadeleştirilmiştir." =
    "Güncel sistemde besin değeri verileri için ayrı USDA eşleştirme tabloları kullanılmaz. İlk mimaride malzeme adlarını İngilizceye çevirip USDA üzerinde arama yaklaşımı denenmiştir. Fakat Türkçe malzeme adlarında doğru eşleşmeyi yakalamak her zaman mümkün olmadığı için bu yapı sadeleştirilmiştir."

  "Besin değerleri artık ingredients tablosundaki inline kolonlarda tutulur. Sistem önce yerel veritabanındaki değeri kullanır. Eksik kalan malzemeler için Gemini 2.5 Flash modelinden tahmini değer alınır. Bu yaklaşım veri erişimini kolaylaştırmış, tarif hesaplamalarında kullanılan sorguları da daha anlaşılır hale getirmiştir." =
    "Besin değerleri artık `ingredients` tablosundaki inline kolonlarda tutulmaktadır. Sistem önce yerel veritabanındaki mevcut değere bakar; eksik kalan malzemelerde ise Gemini 2.5 Flash modelinden tahmini değer alır. Bu tercih, veri erişimini sadeleştirmiş ve tarif hesaplamalarında kullanılan sorguları daha anlaşılır hale getirmiştir."

  "Projenin güncel veritabanı yapısı 13 temel tablodan oluşmaktadır. Bu tablolar kullanıcı yönetimi, malzeme yönetimi, tarif kayıtları, sağlıklı tarif ayrımı, favoriler, günlük tüketim kayıtları, e-posta doğrulama ve Gemini revizyon önbelleği gibi işlevleri karşılar." =
    "Projenin güncel veritabanı yapısında 13 temel tablo bulunmaktadır. Bu tablolar kullanıcı yönetimi, malzeme yönetimi, tarif kayıtları, sağlıklı tarif ayrımı, favoriler, günlük tüketim kayıtları, e-posta doğrulama ve Gemini revizyon önbelleği gibi bölümlerin verilerini taşır."

  "Kullanıcı hesap bilgileri, profil verileri ve günlük kalori hedefi" =
    "Kullanıcı hesabı, profil bilgileri ve günlük kalori hedefi"

  "Kayıt, e-posta doğrulama, şifre sıfırlama ve güvenlik işlemleri için geçici doğrulama kodları" =
    "Kayıt, e-posta onayı, şifre sıfırlama ve güvenlik işlemlerinde kullanılan geçici kodlar"

  "Malzemelerin kategori bilgisini tutar" =
    "Malzemelerin hangi kategoriye ait olduğunu tutar"

  "Global ve kullanıcıya özel malzemeleri, ayrıca 8 temel besin değeri alanını saklar" =
    "Ortak ve kullanıcıya özel malzemeleri, ayrıca 8 temel besin değeri alanını saklar"

  "ingredient_categories tablosu malzemeleri sebze, et, süt ürünü, bakliyat ve benzeri kategorilere ayırmak için kullanılır. Kategori bilgisi arayüzde malzeme seçimini kolaylaştırır ve veri düzenini korur." =
    "ingredient_categories tablosu malzemeleri sebze, et, süt ürünü, bakliyat gibi gruplara ayırmak için kullanılır. Bu kategori bilgisi, arayüzde malzeme seçimini kolaylaştırır ve malzeme listesinin daha düzenli kalmasını sağlar."

  "Bu tablo aynı malzemenin farklı yazım biçimlerini tek bir malzemeye bağlamak için tasarlanmıştır. Kullanıcı yeşil biber, sivri biber veya karakter farklılıklarıyla giriş yaptığında sistem alias yapısıyla daha doğru eşleşme yapabilir." =
    "Bu tablo, aynı malzemenin farklı yazım biçimlerini tek bir ana malzeme kaydıyla ilişkilendirmek için hazırlanmıştır. Örneğin kullanıcı yeşil biber, sivri biber ya da Türkçe karakter farkı olan bir ad girdiğinde sistem alias kaydı sayesinde daha doğru eşleşme yapabilir."

  "Testlerde önce temel kullanıcı işlemleri denenmiştir. Kayıt olma, e-posta doğrulama, giriş yapma, profil düzenleme, malzeme seçme, tarif önerisi alma, tarif detayına bakma, favoriye ekleme, sevilmeyen malzeme ekleme ve günlük kayıt oluşturma adımları kontrol edilmiştir." =
    "Test sürecinde önce kullanıcının uygulamada izleyeceği temel adımlar denenmiştir. Kayıt olma, e-posta doğrulama, giriş yapma, profil düzenleme, malzeme seçme, tarif önerisi alma, tarif detayını açma, favoriye ekleme, sevilmeyen malzeme belirleme ve günlük kayıt oluşturma işlemleri ayrı ayrı kontrol edilmiştir."

  "Kod tarafında eski USDA tabanlı besin değeri yapısının aktif backend akışından kaldırıldığı doğrulanmıştır. IngredientNutritionValue ve IngredientUsdaMapping gibi eski model sınıfları kullanılmamaktadır. Health score hesabında da ayrı nutrition ilişkisi yerine ingredients tablosundaki inline besin değeri kolonları kullanılmaktadır." =
    "Kod tarafında eski USDA tabanlı besin değeri akışının artık aktif backend sürecinde yer almadığı kontrol edilmiştir. `IngredientNutritionValue` ve `IngredientUsdaMapping` gibi eski model sınıfları kullanılmamaktadır. Health score hesabı da ayrı bir nutrition ilişkisi yerine `ingredients` tablosundaki inline besin değeri kolonlarını okuyacak şekilde çalışmaktadır."

  "Besin değeri hesaplamasında sistemin 8 temel alanla çalıştığı kontrol edilmiştir. Bu alanlar kalori, protein, karbonhidrat, yağ, doymuş yağ, lif, şeker ve sodyum değerleridir. Önceki sürümde düşünülen bazı ek mikro besin kolonları sadeleştirme kapsamında aktif sağlık puanı hesabına dahil edilmemiştir." =
    "Besin değeri hesaplamasında sistemin 8 temel alan üzerinden çalıştığı doğrulanmıştır. Bu alanlar kalori, protein, karbonhidrat, yağ, doymuş yağ, lif, şeker ve sodyum değerleridir. Önceki sürümlerde düşünülen bazı ek mikro besin kolonları, sağlık puanı hesabında kullanılmadığı için sadeleştirme kapsamında dışarıda bırakılmıştır."

  "Veritabanı bütünlük kontrollerinde sistemde 13 temel tablo bulunduğu, tarif, malzeme ve tarif malzeme ilişkilerinin beklenen şekilde kayıtlı olduğu görülmüştür. Geliştirme ortamında 484 tarif, 241 malzeme, 3569 tarif malzeme ilişkisi ve 14 malzeme kategorisi bulunmaktadır." =
    "Veritabanı bütünlük kontrollerinde sistemde 13 temel tablo olduğu görülmüştür. Tarif, malzeme ve tarif-malzemesi ilişkileri beklenen şekilde kayıtlıdır. Geliştirme ortamında 484 tarif, 241 malzeme, 3569 tarif-malzemesi ilişkisi ve 14 malzeme kategorisi bulunmaktadır."

  "Scraper tarafında yalnızca yemek.com ve yemek.com diyet hattının aktif olduğu doğrulanmıştır. BBC Good Food, EatingWell ve SkinnyTaste kaynaklarına ait eski dosyalar güncel backend referanslarından kaldırılmıştır." =
    "Scraper tarafında aktif hattın yalnızca yemek.com ve yemek.com diyet kaynaklarından oluştuğu kontrol edilmiştir. BBC Good Food, EatingWell ve SkinnyTaste için daha önce denenmiş dosyalar güncel backend referanslarından çıkarılmıştır."
}

try {
  [System.IO.Directory]::CreateDirectory($temp) | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($src, $temp)

  $docXmlPath = Join-Path $temp "word\document.xml"
  [xml]$xml = Get-Content -LiteralPath $docXmlPath -Raw -Encoding UTF8
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

  $changed = 0
  foreach ($node in $xml.SelectNodes("//w:p | //w:tc", $ns)) {
    $text = (Get-NodeText $node $ns).Trim()
    if ($replacements.ContainsKey($text)) {
      Set-NodeText $node $ns $replacements[$text]
      $changed++
    }
  }

  $xml.Save($docXmlPath)
  if (Test-Path $dst) { Remove-Item -LiteralPath $dst -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $dst)
  Write-Output "Changed: $changed"
  Write-Output $dst
}
finally {
  if (Test-Path $temp) {
    Remove-Item -LiteralPath $temp -Recurse -Force
  }
}
