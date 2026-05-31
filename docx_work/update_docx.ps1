param(
  [Parameter(Mandatory=$true)][string]$UnzipDir,
  [Parameter(Mandatory=$true)][string]$OutDocx
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.IO.Compression.FileSystem

$docPath = Join-Path $UnzipDir 'word\document.xml'
$xml = [xml](Get-Content -LiteralPath $docPath -Raw -Encoding UTF8)
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace('w', 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')

function WAttr([System.Xml.XmlElement]$node, [string]$name, [string]$value) {
  [void]$node.SetAttribute($name, 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', $value)
}

function New-WElement([string]$name) {
  return $xml.CreateElement('w', $name, 'http://schemas.openxmlformats.org/wordprocessingml/2006/main')
}

function Set-CellText($cell, [string]$text) {
  $p = $cell.SelectSingleNode('./w:p', $ns)
  if (-not $p) {
    $p = New-WElement 'p'
    [void]$cell.AppendChild($p)
  }

  foreach ($child in @($p.ChildNodes)) {
    [void]$p.RemoveChild($child)
  }

  $r = New-WElement 'r'
  $t = New-WElement 't'
  $t.InnerText = $text
  [void]$r.AppendChild($t)
  [void]$p.AppendChild($r)
}

$abbr = @{
  'Bcrypt|1' = 'Blowfish Crypt'
  'BST|1' = 'Information Systems and Technologies'
  'CSS|2' = 'Basamaklı Stil Sayfaları'
  'Gemini|1' = 'Google Gemini'
  'HTML|2' = 'Hiper Metin İşaretleme Dili'
  'HTTP|2' = 'Hiper Metin Aktarım Protokolü'
  'JSON|2' = 'JavaScript Nesne Gösterimi'
  'JWT|2' = 'JSON Web Belirteci'
  'ORM|2' = 'Nesne İlişkisel Eşleme'
  'REST|2' = 'Temsili Durum Aktarımı'
  'SMTP|2' = 'Basit Posta Aktarım Protokolü'
  'SQL|2' = 'Yapılandırılmış Sorgu Dili'
  'USDA|2' = 'Amerika Birleşik Devletleri Tarım Bakanlığı'
  'Vite|1' = 'Vite frontend build tool'
}

$abbrTable = $xml.SelectNodes('//w:tbl', $ns)[0]
foreach ($row in $abbrTable.SelectNodes('./w:tr', $ns)) {
  $cells = @($row.SelectNodes('./w:tc', $ns))
  if ($cells.Count -lt 3) { continue }
  $key = (($cells[0].SelectNodes('.//w:t', $ns) | ForEach-Object { $_.InnerText }) -join '')
  for ($i = 1; $i -lt 3; $i++) {
    $mapKey = "$key|$i"
    if ($abbr.ContainsKey($mapKey)) {
      Set-CellText $cells[$i] $abbr[$mapKey]
    }
  }
}

$paras = @($xml.SelectNodes('//w:p', $ns))
$figureListEntry = $paras[112]
$nextFigureEntry = $paras[113]
$figureCaption = $paras[275]

$bookmarkName = '_Toc230992956'
$bookmarkId = 105

foreach ($node in @($xml.SelectNodes("//w:bookmarkStart[@w:name='$bookmarkName']", $ns))) {
  [void]$node.ParentNode.RemoveChild($node)
}
foreach ($node in @($xml.SelectNodes("//w:bookmarkEnd[@w:id='$bookmarkId']", $ns))) {
  [void]$node.ParentNode.RemoveChild($node)
}

$visibleRun = $figureCaption.SelectSingleNode('./w:r[w:t]', $ns)
if ($visibleRun) {
  $bookmarkStart = New-WElement 'bookmarkStart'
  WAttr $bookmarkStart 'id' "$bookmarkId"
  WAttr $bookmarkStart 'name' $bookmarkName
  [void]$figureCaption.InsertBefore($bookmarkStart, $visibleRun)

  $bookmarkEnd = New-WElement 'bookmarkEnd'
  WAttr $bookmarkEnd 'id' "$bookmarkId"
  [void]$figureCaption.InsertAfter($bookmarkEnd, $visibleRun)
}

$tcInstr = $figureCaption.SelectSingleNode('.//w:instrText[contains(., "Şekil 2.1 Yummy ekran görüntüsü")]', $ns)
if ($tcInstr) {
  $tcInstr.InnerText = 'TC "Şekil 2.1 Yummy ekran görüntüsü" \f F '
}

foreach ($child in @($figureListEntry.ChildNodes)) {
  [void]$figureListEntry.RemoveChild($child)
}

$pPr = New-WElement 'pPr'
$pStyle = New-WElement 'pStyle'
WAttr $pStyle 'val' 'T1'
[void]$pPr.AppendChild($pStyle)
$tabs = New-WElement 'tabs'
$tabStop = New-WElement 'tab'
WAttr $tabStop 'val' 'right'
WAttr $tabStop 'leader' 'dot'
WAttr $tabStop 'pos' '8495'
[void]$tabs.AppendChild($tabStop)
[void]$pPr.AppendChild($tabs)
[void]$figureListEntry.AppendChild($pPr)

function Append-FieldRun($parent, [string]$kind, [string]$instr) {
  $r = New-WElement 'r'
  if ($kind -eq 'instr') {
    $instrText = New-WElement 'instrText'
    $space = $xml.CreateAttribute('xml', 'space', 'http://www.w3.org/XML/1998/namespace')
    $space.Value = 'preserve'
    [void]$instrText.Attributes.Append($space)
    $instrText.InnerText = $instr
    [void]$r.AppendChild($instrText)
  } else {
    $fld = New-WElement 'fldChar'
    WAttr $fld 'fldCharType' $kind
    if ($kind -eq 'begin') { WAttr $fld 'dirty' 'true' }
    [void]$r.AppendChild($fld)
  }
  [void]$parent.AppendChild($r)
}

Append-FieldRun $figureListEntry 'begin' ''
Append-FieldRun $figureListEntry 'instr' ' TOC \f F \h \z '
Append-FieldRun $figureListEntry 'separate' ''

$hyperlink = New-WElement 'hyperlink'
WAttr $hyperlink 'anchor' $bookmarkName
WAttr $hyperlink 'history' '1'

$textRun = New-WElement 'r'
$text = New-WElement 't'
$text.InnerText = 'Şekil 2.1 Yummy ekran görüntüsü'
[void]$textRun.AppendChild($text)
[void]$hyperlink.AppendChild($textRun)

$tabRun = New-WElement 'r'
[void]$tabRun.AppendChild((New-WElement 'tab'))
[void]$hyperlink.AppendChild($tabRun)

Append-FieldRun $hyperlink 'begin' ''
Append-FieldRun $hyperlink 'instr' " PAGEREF $bookmarkName \h "
Append-FieldRun $hyperlink 'separate' ''

$pageRun = New-WElement 'r'
$pageText = New-WElement 't'
$pageText.InnerText = '4'
[void]$pageRun.AppendChild($pageText)
[void]$hyperlink.AppendChild($pageRun)

Append-FieldRun $hyperlink 'end' ''
[void]$figureListEntry.AppendChild($hyperlink)

$tocRuns = @()
foreach ($run in @($nextFigureEntry.SelectNodes('./w:r', $ns))) {
  $hasTocInstr = $run.SelectSingleNode('./w:instrText[contains(., "TOC \f F")]', $ns)
  $hasFld = $run.SelectSingleNode('./w:fldChar', $ns)
  if ($hasTocInstr -or ($tocRuns.Count -lt 3 -and $hasFld)) {
    $tocRuns += $run
  }
  if ($tocRuns.Count -eq 3) { break }
}
foreach ($run in $tocRuns) {
  [void]$nextFigureEntry.RemoveChild($run)
}

$settingsPath = Join-Path $UnzipDir 'word\settings.xml'
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

if (Test-Path -LiteralPath $OutDocx) {
  Remove-Item -LiteralPath $OutDocx -Force
}
[System.IO.Compression.ZipFile]::CreateFromDirectory((Resolve-Path $UnzipDir), (Resolve-Path (Split-Path $OutDocx -Parent)).Path + '\' + (Split-Path $OutDocx -Leaf))

