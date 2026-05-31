param(
  [Parameter(Mandatory=$true)][string]$InputDocx,
  [Parameter(Mandatory=$true)][string]$OutputDocx
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.IO.Compression.FileSystem

$workRoot = Join-Path (Resolve-Path '.\docx_work') ('insert_' + (Get-Date -Format 'HHmmssfff'))
New-Item -ItemType Directory -Force -Path $workRoot | Out-Null
$unzipDir = Join-Path $workRoot 'unzipped'
[System.IO.Compression.ZipFile]::ExtractToDirectory((Resolve-Path $InputDocx), $unzipDir)

$docPath = Join-Path $unzipDir 'word\document.xml'
$xml = [xml](Get-Content -LiteralPath $docPath -Raw -Encoding UTF8)
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

function New-WElement([string]$name) {
  return $xml.CreateElement('w', $name, 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
}

function Set-WAttr([System.Xml.XmlElement]$node, [string]$name, [string]$value) {
  [void]$node.SetAttribute($name, 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', $value)
}

function New-Paragraph([string]$text, [string]$style) {
  $p = New-WElement 'p'
  if ($style) {
    $pPr = New-WElement 'pPr'
    $pStyle = New-WElement 'pStyle'
    Set-WAttr $pStyle 'val' $style
    [void]$pPr.AppendChild($pStyle)
    [void]$p.AppendChild($pPr)
  }

  $r = New-WElement 'r'
  $t = New-WElement 't'
  $t.InnerText = $text
  [void]$r.AppendChild($t)
  [void]$p.AppendChild($r)
  return $p
}

$sectionItems = @(
  @{ Text = '3.1. Kullanılan teknolojiler'; Style = 'Balk2' },
  @{ Text = 'Projede kullanılan teknolojiler seçilirken uygulamanın tarayıcı üzerinde rahat çalışması, kullanıcı işlemlerinin güvenli yürütülmesi, verilerin düzenli saklanması ve tarif önerilerinin hızlı üretilebilmesi dikkate alınmıştır. Bu nedenle her teknoloji, projede karşılığı olan gerçek bir ihtiyaca göre tercih edilmiştir.'; Style = '' },
  @{ Text = '3.1.1. React'; Style = 'Balk3' },
  @{ Text = 'React, uygulamanın arayüz tarafını kurmak için kullanılmıştır. Kayıt, giriş, ana menü, tarif listesi, tarif detayı, favoriler ve günlük kayıt ekranları ayrı bileşenler halinde hazırlanmıştır. Bu yapı sayesinde ekranları tek tek geliştirmek, ortak arayüz parçalarını yeniden kullanmak ve değişiklikleri daha kontrollü yapmak mümkün olmuştur.'; Style = '' },
  @{ Text = '3.1.2. Vite'; Style = 'Balk3' },
  @{ Text = 'Vite, React projesinin geliştirme ortamını hızlandırmak için tercih edilmiştir. Arayüzde yapılan değişikliklerin kısa sürede görülebilmesi, özellikle ekran tasarımlarını denerken süreci kolaylaştırmıştır. Böylece bileşen düzenlemeleri daha pratik biçimde kontrol edilmiştir.'; Style = '' },
  @{ Text = '3.1.3. CSS'; Style = 'Balk3' },
  @{ Text = 'CSS, uygulamanın görsel düzenini oluşturmak için kullanılmıştır. Menü yapısı, tarif kartları, form alanları, tema renkleri ve ekranlar arasındaki görsel bütünlük CSS dosyalarıyla düzenlenmiştir. Bu çalışma arayüzün yalnızca çalışır durumda kalmasını değil, kullanıcı tarafından daha rahat okunabilir ve tutarlı görünmesini de sağlamıştır.'; Style = '' },
  @{ Text = '3.1.4. FastAPI ve Python'; Style = 'Balk3' },
  @{ Text = 'FastAPI, backend tarafında frontendden gelen istekleri karşılayan API yapısını kurmak için seçilmiştir. Kullanıcı kaydı, giriş, profil güncelleme, malzeme seçimi, tarif önerisi, favoriler, günlük kayıtlar ve Gemini revizyon işlemleri bu yapı üzerinden ilerler. Python ile birlikte kullanılması, servis katmanındaki iş kurallarının daha okunabilir yazılmasını kolaylaştırmıştır.'; Style = '' },
  @{ Text = '3.1.5. SQLAlchemy ORM'; Style = 'Balk3' },
  @{ Text = 'SQLAlchemy ORM, Python kodu ile PostgreSQL tabloları arasındaki bağlantıyı yönetmek için kullanılmıştır. Kullanıcı, tarif, malzeme ve günlük kayıt gibi yapılar model sınıflarıyla temsil edilmiştir. Bu yaklaşım, veritabanı işlemlerinin repository katmanında daha düzenli tutulmasına yardımcı olmuştur.'; Style = '' },
  @{ Text = '3.1.6. PostgreSQL'; Style = 'Balk3' },
  @{ Text = 'PostgreSQL, projenin ilişkisel veritabanı olarak tercih edilmiştir. Kullanıcı bilgileri, tarifler, malzemeler, tarif ve malzeme ilişkileri, favoriler, sevilmeyen malzemeler, günlük kayıtlar ve revizyon önbelleği bu veritabanında saklanır. İlişkisel yapı sayesinde tarifler, malzemeler ve kullanıcıya ait kayıtlar tutarlı biçimde bağlanabilmiştir.'; Style = '' },
  @{ Text = '3.1.7. Doğrulama ve güvenlik araçları'; Style = 'Balk3' },
  @{ Text = 'Kullanıcı hesaplarının güvenliği için e-posta doğrulama, tek kullanımlık kod ve bcrypt ile şifre saklama yapısı kurulmuştur. Böylece hesaplar doğrulama tamamlandıktan sonra kullanılabilir hale gelir. Kullanıcı şifreleri de veritabanında açık metin olarak tutulmaz.'; Style = '' },
  @{ Text = '3.1.8. Veri hazırlama ve alias yapısı'; Style = 'Balk3' },
  @{ Text = 'Tarif ve malzeme verilerinin uygulamada düzenli kullanılabilmesi için scraper ve alias yapısından yararlanılmıştır. Scraper hattı tarif başlığı, malzeme listesi, hazırlanış adımları, porsiyon ve besin bilgisi gibi alanları toplar. Alias yapısı ise aynı malzemenin farklı yazımlarını tek bir malzeme kaydı altında eşleştirmeye yardımcı olur.'; Style = '' },
  @{ Text = '3.1.9. Gemini API'; Style = 'Balk3' },
  @{ Text = 'Gemini API projede iki temel noktada kullanılmıştır. İlk olarak, besin değeri bulunmayan malzemeler için yapılandırılmış JSON formatında yaklaşık değer üretir. İkinci olarak, kullanıcının seçtiği tarifi daha hafif, daha proteinli ya da bazı malzemeler çıkarılmış şekilde yeniden düzenlemeye yardımcı olur. Bu çıktılar kesin sağlık verisi olarak değil, uygulamanın karar süreçlerini destekleyen tahmini bilgiler olarak değerlendirilmiştir.'; Style = '' }
)

$paras = @($xml.SelectNodes('//w:p', $ns))
$insertBefore = $null
foreach ($p in $paras) {
  $text = (($p.SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '')
  $styleNode = $p.SelectSingleNode('./w:pPr/w:pStyle', $ns)
  $style = if ($styleNode) { $styleNode.GetAttribute('val', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main') } else { '' }
  if ($text -eq '3.2. Sistem mimarisi ve kullanıcı akışı' -and $style -eq 'Balk2') {
    $insertBefore = $p
    break
  }
}

if (-not $insertBefore) {
  throw '3.2 ana başlığı bulunamadı.'
}

foreach ($item in $sectionItems) {
  $newP = New-Paragraph $item.Text $item.Style
  [void]$insertBefore.ParentNode.InsertBefore($newP, $insertBefore)
}

$settingsPath = Join-Path $unzipDir 'word\settings.xml'
$settings = [xml](Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8)
$settingsNs = New-Object System.Xml.XmlNamespaceManager($settings.NameTable)
$settingsNs.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
if (-not $settings.SelectSingleNode('//w:updateFields', $settingsNs)) {
  $updateFields = $settings.CreateElement('w', 'updateFields', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
  $updateFields.SetAttribute('val', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'true')
  [void]$settings.DocumentElement.AppendChild($updateFields)
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Resolve-Path $docPath), $xml.OuterXml, $utf8NoBom)
[System.IO.File]::WriteAllText((Resolve-Path $settingsPath), $settings.OuterXml, $utf8NoBom)

if (Test-Path -LiteralPath $OutputDocx) {
  Remove-Item -LiteralPath $OutputDocx -Force
}
[System.IO.Compression.ZipFile]::CreateFromDirectory($unzipDir, $OutputDocx)

