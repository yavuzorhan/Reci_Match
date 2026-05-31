param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$src = (Resolve-Path $InputPath).Path
$dst = Join-Path (Get-Location) $OutputPath
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("docx_humanize_idx_" + [guid]::NewGuid().ToString("N"))

function Set-NodeText {
  param($Node, $Ns, [string]$Text)
  $texts = @($Node.SelectNodes(".//w:t", $Ns))
  if ($texts.Count -eq 0) { return }
  $texts[0].'#text' = $Text
  for ($i = 1; $i -lt $texts.Count; $i++) {
    $texts[$i].'#text' = ""
  }
}

$paragraphsByIndex = @{
  265 = "Projede kullanılan teknolojiler seçilirken uygulamanın tarayıcıda sorunsuz çalışması, kullanıcı işlemlerinin güvenli yürütülmesi, verilerin düzenli saklanması ve tarif önerilerinin hızlı üretilebilmesi dikkate alınmıştır. Bu yüzden her araç, projedeki somut bir ihtiyacı karşılayacak şekilde seçilmiştir."
  267 = "React, uygulamanın arayüz tarafını kurmak için tercih edilmiştir. Kayıt, giriş, ana menü, tarif listesi, tarif detayı, favoriler ve günlük kayıt ekranları ayrı bileşenler olarak hazırlanmıştır. Böylece ekranları tek tek geliştirmek, ortak arayüz parçalarını yeniden kullanmak ve değişiklikleri daha kontrollü yapmak mümkün olmuştur."
  269 = "Vite, React projesinin geliştirme ortamını daha hızlı çalıştırmak için kullanılmıştır. Arayüz üzerinde yapılan değişikliklerin beklemeden görülebilmesi, özellikle ekran tasarımlarını denerken süreci kolaylaştırmıştır. Bu sayede bileşen düzenlemeleri daha pratik biçimde kontrol edilmiştir."
  271 = "CSS, uygulamanın görsel düzenini oluşturmak için kullanılmıştır. Menü yapısı, tarif kartları, form alanları, tema renkleri ve ekranlar arasındaki görsel uyum CSS dosyalarıyla şekillendirilmiştir. Bu çalışma, arayüzün yalnızca işlevsel kalmamasını, aynı zamanda kullanıcı tarafından rahat okunabilir ve tutarlı görünmesini sağlamıştır."
  273 = "FastAPI, backend tarafında frontendden gelen istekleri karşılayan API yapısını kurmak için seçilmiştir. Kullanıcı kaydı, giriş, profil güncelleme, malzeme seçimi, tarif önerisi, favoriler, günlük kayıtlar ve Gemini revizyon işlemleri bu yapı üzerinden ilerler. Python ile birlikte kullanılması, servis katmanındaki iş kurallarını daha okunabilir biçimde yazmayı kolaylaştırmıştır."
  275 = "SQLAlchemy ORM, Python kodu ile PostgreSQL tabloları arasındaki bağlantıyı yönetmek için kullanılmıştır. Kullanıcı, tarif, malzeme ve günlük kayıt gibi yapılar model sınıflarıyla temsil edilmiştir. Bu yaklaşım, veritabanı işlemlerinin repository katmanında daha düzenli ve anlaşılır tutulmasına yardımcı olmuştur."
  277 = "PostgreSQL, projenin ilişkisel veritabanı olarak tercih edilmiştir. Kullanıcı bilgileri, tarifler, malzemeler, tarif-malzemesi ilişkileri, favoriler, sevilmeyen malzemeler, günlük kayıtlar ve revizyon önbelleği bu veritabanında saklanır. İlişkisel yapı sayesinde tarifler, malzemeler ve kullanıcıya ait kayıtlar birbirleriyle tutarlı biçimde bağlanabilmiştir."
  279 = "Kullanıcı hesaplarının güvenliği için e-posta doğrulama, tek kullanımlık kod ve bcrypt ile şifre saklama yapısı kurulmuştur. Böylece hesaplar doğrulama tamamlandıktan sonra kullanılabilir hale gelir ve kullanıcı şifreleri veritabanında açık metin olarak tutulmaz."
  281 = "Tarif ve malzeme verilerinin uygulamada düzenli kullanılabilmesi için scraper ve alias yapısından yararlanılmıştır. Scraper hattı tarif başlığı, malzeme listesi, hazırlanış adımları, porsiyon ve besin bilgisi gibi alanları toplar. Alias yapısı ise aynı malzemenin farklı yazımlarını tek bir malzeme kaydı altında eşleştirmeye yardımcı olur."
  283 = "Gemini API projede iki noktada devreye alınmıştır. İlk olarak, besin değeri bulunmayan malzemeler için yapılandırılmış JSON formatında yaklaşık değer üretir. İkinci olarak, kullanıcının seçtiği tarifi daha hafif, daha proteinli ya da bazı malzemeleri çıkarılmış şekilde yeniden düzenlemeye yardımcı olur. Bu çıktılar kesin sağlık verisi olarak değil, uygulamanın karar süreçlerini destekleyen tahmini bilgiler olarak ele alınmıştır."
  324 = "Veritabanı tasarımında ilişkisel model tercih edilmiştir. Kullanıcılar, tarifler, malzemeler, günlük kayıtlar ve Gemini revizyonları ayrı tablolar altında tutulur. Bir tarifin birden fazla malzemesi olabildiği gibi, aynı malzeme farklı tariflerde de yer alabilir. Bu bağlantı recipe_ingredients tablosu üzerinden kurulmuştur."
  325 = "Güncel sistemde besin değeri verileri için ayrı USDA eşleştirme tabloları kullanılmaz. İlk mimaride malzeme adlarını İngilizceye çevirip USDA üzerinde arama yaklaşımı denenmiştir. Fakat Türkçe malzeme adlarında doğru eşleşmeyi yakalamak her zaman mümkün olmadığı için bu yapı sadeleştirilmiştir."
  326 = "Besin değerleri artık ingredients tablosundaki inline kolonlarda tutulmaktadır. Sistem önce yerel veritabanındaki mevcut değere bakar; eksik kalan malzemelerde ise Gemini 2.5 Flash modelinden tahmini değer alır. Bu tercih, veri erişimini sadeleştirmiş ve tarif hesaplamalarında kullanılan sorguları daha anlaşılır hale getirmiştir."
  328 = "Projenin güncel veritabanı yapısında 13 temel tablo bulunmaktadır. Bu tablolar kullanıcı yönetimi, malzeme yönetimi, tarif kayıtları, sağlıklı tarif ayrımı, favoriler, günlük tüketim kayıtları, e-posta doğrulama ve Gemini revizyon önbelleği gibi bölümlerin verilerini taşır."
  333 = "Kullanıcı hesabı, profil bilgileri ve günlük kalori hedefi"
  335 = "Kayıt, e-posta onayı, şifre sıfırlama ve güvenlik işlemlerinde kullanılan geçici kodlar"
  337 = "Malzemelerin hangi kategoriye ait olduğunu tutar"
  339 = "Ortak ve kullanıcıya özel malzemeleri, ayrıca 8 temel besin değeri alanını saklar"
  638 = "ingredient_categories tablosu malzemeleri sebze, et, süt ürünü, bakliyat gibi gruplara ayırmak için kullanılır. Bu kategori bilgisi, arayüzde malzeme seçimini kolaylaştırır ve malzeme listesinin daha düzenli kalmasını sağlar."
  649 = "Bu tablo, aynı malzemenin farklı yazım biçimlerini tek bir ana malzeme kaydıyla ilişkilendirmek için hazırlanmıştır. Örneğin kullanıcı yeşil biber, sivri biber ya da Türkçe karakter farkı olan bir ad girdiğinde sistem alias kaydı sayesinde daha doğru eşleşme yapabilir."
  902 = "Test sürecinde önce kullanıcının uygulamada izleyeceği temel adımlar denenmiştir. Kayıt olma, e-posta doğrulama, giriş yapma, profil düzenleme, malzeme seçme, tarif önerisi alma, tarif detayını açma, favoriye ekleme, sevilmeyen malzeme belirleme ve günlük kayıt oluşturma işlemleri ayrı ayrı kontrol edilmiştir."
  903 = "Kod tarafında eski USDA tabanlı besin değeri akışının artık aktif backend sürecinde yer almadığı kontrol edilmiştir. IngredientNutritionValue ve IngredientUsdaMapping gibi eski model sınıfları kullanılmamaktadır. Health score hesabı da ayrı bir nutrition ilişkisi yerine ingredients tablosundaki inline besin değeri kolonlarını okuyacak şekilde çalışmaktadır."
  904 = "Besin değeri hesaplamasında sistemin 8 temel alan üzerinden çalıştığı doğrulanmıştır. Bu alanlar kalori, protein, karbonhidrat, yağ, doymuş yağ, lif, şeker ve sodyum değerleridir. Önceki sürümlerde düşünülen bazı ek mikro besin kolonları, sağlık puanı hesabında kullanılmadığı için sadeleştirme kapsamında dışarıda bırakılmıştır."
  905 = "Veritabanı bütünlük kontrollerinde sistemde 13 temel tablo olduğu görülmüştür. Tarif, malzeme ve tarif-malzemesi ilişkileri beklenen şekilde kayıtlıdır. Geliştirme ortamında 484 tarif, 241 malzeme, 3569 tarif-malzemesi ilişkisi ve 14 malzeme kategorisi bulunmaktadır."
  906 = "Scraper tarafında aktif hattın yalnızca yemek.com ve yemek.com diyet kaynaklarından oluştuğu kontrol edilmiştir. BBC Good Food, EatingWell ve SkinnyTaste için daha önce denenmiş dosyalar güncel backend referanslarından çıkarılmıştır. Böylece aktif veri kaynağı Türkçe tarif yapısıyla daha uyumlu hale getirilmiştir."
}

try {
  [System.IO.Directory]::CreateDirectory($temp) | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($src, $temp)

  $docXmlPath = Join-Path $temp "word\document.xml"
  [xml]$xml = Get-Content -LiteralPath $docXmlPath -Raw -Encoding UTF8
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

  $paragraphs = @($xml.SelectNodes("//w:p", $ns))
  $changed = 0
  foreach ($key in $paragraphsByIndex.Keys) {
    if ($key -le $paragraphs.Count) {
      Set-NodeText $paragraphs[$key - 1] $ns $paragraphsByIndex[$key]
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
