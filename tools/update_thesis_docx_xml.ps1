param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$src = (Resolve-Path $InputPath).Path
$dst = (Join-Path (Get-Location) $OutputPath)
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("docx_edit_" + [guid]::NewGuid().ToString("N"))

function NodeText {
  param($Node, $Ns)
  return (($Node.SelectNodes(".//w:t", $Ns) | ForEach-Object { $_.'#text' }) -join "")
}

function SetNodeText {
  param($Node, $Ns, [string]$Text)
  $texts = @($Node.SelectNodes(".//w:t", $Ns))
  if ($texts.Count -eq 0) { return }
  $texts[0].'#text' = $Text
  for ($i = 1; $i -lt $texts.Count; $i++) {
    $texts[$i].'#text' = ""
  }
}

function SetCellText {
  param($Cell, $Ns, [string]$Text)
  SetNodeText $Cell $Ns $Text
}

function CellText {
  param($Cell, $Ns)
  return ((NodeText $Cell $Ns) -replace "[`r`a]", "").Trim()
}

try {
  [System.IO.Directory]::CreateDirectory($temp) | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($src, $temp)

  $docXmlPath = Join-Path $temp "word\document.xml"
  [xml]$xml = Get-Content -LiteralPath $docXmlPath -Raw -Encoding UTF8
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

  $paragraphReplacements = @{
    "Tarif kaynağı. scraper veya custom gibi" = "Tarif kaynağı. yemekcom, yemekcom_diet veya custom"
    "healthy_recipes tablosu sağlıklı tarifler ekranında gösterilecek tarifleri işaretlemek için kullanılır. Tarif bilgileri recipes tablosunda tutulmaya devam eder. Bu tablo yalnızca sağlıklı liste ile ilişkiyi yönetir." = "healthy_recipes tablosu sağlıklı tarifler ekranında gösterilecek tarifleri işaretlemek için kullanılır. Güncel sistemde bu liste yemekcom_diet kaynaklı tariflerden beslenir. Tarif bilgileri recipes tablosunda tutulmaya devam eder."
    "Bu durumda backend kullanıcıya uygun hata kodu döndürür." = "Bu durumda backend kullanıcıya 429 hata kodu döndürür."
    "JWTJSON Web Token" = "JWTJSON Web Token (bu prototipte aktif oturum yöntemi değildir)"
  }

  $listPages = @{
    "Şekil 2.1 Yummly ekran görüntüsü 1" = "Şekil 2.1 Yummly ekran görüntüsü 3"
    "Şekil 2.2 MyFitnessPal ekran görüntüsü 1" = "Şekil 2.2 MyFitnessPal ekran görüntüsü 4"
    "Şekil 2.3 SuperCook ekran görüntüsü 1" = "Şekil 2.3 SuperCook ekran görüntüsü 5"
    "Şekil 3.1 Katmanlı sistem mimarisi diyagramı1" = "Şekil 3.1 Katmanlı sistem mimarisi diyagramı9"
    "Şekil 4.1 Giriş Ekranı1" = "Şekil 4.1 Giriş Ekranı24"
    "Şekil 4.2 Şifremi Unuttum Ekranı1" = "Şekil 4.2 Şifremi Unuttum Ekranı25"
    "Şekil 4.3 Kayıt Ekranı1" = "Şekil 4.3 Kayıt Ekranı25"
    "Şekil 4.4 E-posta Onay Ekranı1" = "Şekil 4.4 E-posta Onay Ekranı26"
    "Şekil 4.5 Profil Oluşturma Ekranı1" = "Şekil 4.5 Profil Oluşturma Ekranı26"
    "Şekil 4.6 Sevilmeyen Malzeme Seçimi Ekranı1" = "Şekil 4.6 Sevilmeyen Malzeme Seçimi Ekranı27"
    "Şekil 4.7 Ana Menü Ekranı1" = "Şekil 4.7 Ana Menü Ekranı28"
    "Şekil 4.8 Ana Menü Karanlık Tema Ekranı1" = "Şekil 4.8 Ana Menü Karanlık Tema Ekranı28"
    "Şekil 4.9 Dolabım Ekranı1" = "Şekil 4.9 Dolabım Ekranı29"
    "Şekil 4.10 Tarifler Ekranı1" = "Şekil 4.10 Tarifler Ekranı29"
    "Şekil 4.11 Sağlıklı Tarifler Ekranı1" = "Şekil 4.11 Sağlıklı Tarifler Ekranı30"
    "Şekil 4.12 Günlük ve Haftalık Kayıt Ekranı1" = "Şekil 4.12 Günlük ve Haftalık Kayıt Ekranı30"
    "Şekil 4.13 Favoriler Ekranı1" = "Şekil 4.13 Favoriler Ekranı31"
    "Şekil 4.14 Profil Ekranı1" = "Şekil 4.14 Profil Ekranı31"
    "Şekil 4.15 Tarif Önerme Malzeme Seçimi Ekranı1" = "Şekil 4.15 Tarif Önerme Malzeme Seçimi Ekranı32"
    "Şekil 4.16 Tarif Önerme Eşleşme Ekranı1" = "Şekil 4.16 Tarif Önerme Eşleşme Ekranı32"
    "Şekil 4.17 Tarif İçerik Ekranı1" = "Şekil 4.17 Tarif İçerik Ekranı33"
    "Şekil E.1. Gemini ile besin değeri alma kod parçası1" = "Şekil E.1. Gemini ile besin değeri alma kod parçası39"
    "Şekil E.2. Yerel veritabanı ve Gemini tabanlı besin değeri çözümleme akışı1" = "Şekil E.2. Yerel veritabanı ve Gemini tabanlı besin değeri çözümleme akışı40"
    "Şekil E.3. Sağlık puanı hesaplama kod parçası1" = "Şekil E.3. Sağlık puanı hesaplama kod parçası41"
    "Şekil E.4. Tarif öneri skoru hesaplama kod parçası1" = "Şekil E.4. Tarif öneri skoru hesaplama kod parçası42"
    "Şekil E.5. Gemini tarif revizyonu1" = "Şekil E.5. Gemini tarif revizyonu42"
    "Tablo 2.1 Benzer uygulamaların ReciMatch ile karşılaştırılması1" = "Tablo 2.1 Benzer uygulamaların ReciMatch ile karşılaştırılması6"
    "Tablo 3.2 Sağlık puanı kalite eşikleri1" = "Tablo 3.2 Sağlık puanı kalite eşikleri10"
    "Tablo 3.3 Güncel veritabanı tabloları ve görevleri1" = "Tablo 3.3 Güncel veritabanı tabloları ve görevleri13"
    "Tablo 3.4 Canlı veritabanı örnek kayıt sayıları1" = "Tablo 3.4 Canlı veritabanı örnek kayıt sayıları14"
    "Tablo 3.5 users tablosu alanları1" = "Tablo 3.5 users tablosu alanları14"
    "Tablo 3.6 ingredients tablosu alanları1" = "Tablo 3.6 ingredients tablosu alanları15"
    "Tablo 3.7 ingredients tablosundan örnek kayıtlar1" = "Tablo 3.7 ingredients tablosundan örnek kayıtlar16"
    "Tablo 3.8 recipes tablosu alanları1" = "Tablo 3.8 recipes tablosu alanları16"
    "Tablo 3.9 recipes tablosundan örnek kayıtlar1" = "Tablo 3.9 recipes tablosundan örnek kayıtlar17"
    "Tablo 3.10 recipe_ingredients tablosu alanları1" = "Tablo 3.10 recipe_ingredients tablosu alanları17"
    "Tablo 3.11 email_verification_codes tablosu alanları1" = "Tablo 3.11 email_verification_codes tablosu alanları18"
    "Tablo 3.12 ingredient_categories tablosu alanları1" = "Tablo 3.12 ingredient_categories tablosu alanları18"
    "Tablo 3.13 ingredient_aliases tablosu alanları1" = "Tablo 3.13 ingredient_aliases tablosu alanları18"
    "Tablo 3.14 healthy_recipes tablosu alanları1" = "Tablo 3.14 healthy_recipes tablosu alanları19"
    "Tablo 3.15 favorites tablosu alanları1" = "Tablo 3.15 favorites tablosu alanları19"
    "Tablo 3.16 disliked_ingredients tablosu alanları1" = "Tablo 3.16 disliked_ingredients tablosu alanları19"
    "Tablo 3.17 owned_ingredients tablosu alanları1" = "Tablo 3.17 owned_ingredients tablosu alanları20"
    "Tablo 3.18 daily_logs tablosu alanları1" = "Tablo 3.18 daily_logs tablosu alanları20"
    "Tablo 3.19 revision_cache tablosu alanları1" = "Tablo 3.19 revision_cache tablosu alanları20"
    "Tablo 3.20 Backend servis dosyaları ve görevleri1" = "Tablo 3.20 Backend servis dosyaları ve görevleri22"
    "Tablo 4.1 Uygulama ekranları ve temel işlevleri1" = "Tablo 4.1 Uygulama ekranları ve temel işlevleri24"
  }

  foreach ($p in $xml.SelectNodes("//w:p", $ns)) {
    $text = (NodeText $p $ns).Trim()
    if ($paragraphReplacements.ContainsKey($text)) {
      SetNodeText $p $ns $paragraphReplacements[$text]
    }
    elseif ($listPages.ContainsKey($text)) {
      SetNodeText $p $ns $listPages[$text]
    }
  }

  $tables = @($xml.SelectNodes("//w:tbl", $ns))
  if ($tables.Count -ge 21) {
    $t4 = $tables[3]
    $rowsToAdd = @(
      @("Sağlıklı tarif ilişkisi healthy_recipes", "196"),
      @("Yemek.com kaynaklı tarif source=yemekcom", "271"),
      @("Yemek.com diyet kaynaklı tarif source=yemekcom_diet", "196"),
      @("Kullanıcı özel tarif source=custom", "17"),
      @("Pozitif besin değeri kaydı", "237"),
      @("Gerçek 0 kalorili malzeme", "4")
    )
    $lastRow = @($t4.SelectNodes("./w:tr", $ns))[-1]
    foreach ($rowData in $rowsToAdd) {
      $newRow = $lastRow.CloneNode($true)
      $cells = @($newRow.SelectNodes("./w:tc", $ns))
      SetCellText $cells[0] $ns $rowData[0]
      SetCellText $cells[1] $ns $rowData[1]
      [void]$t4.AppendChild($newRow)
    }

    $t8 = $tables[7]
    foreach ($row in @($t8.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -ge 3 -and (CellText $cells[0] $ns) -eq "source") {
        SetCellText $cells[2] $ns "Tarif kaynağı. yemekcom, yemekcom_diet veya custom"
      }
    }

    $t12 = $tables[11]
    foreach ($row in @($t12.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -gt 0 -and (CellText $cells[0] $ns) -eq "created_at") {
        [void]$t12.RemoveChild($row)
      }
    }

    $t14 = $tables[13]
    foreach ($row in @($t14.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -ge 2 -and (CellText $cells[0] $ns) -eq "source") {
        SetCellText $cells[1] $ns "Sağlıklı tarif kaynağı; güncel değer yemekcom_diet"
      }
    }

    $t15 = $tables[14]
    foreach ($row in @($t15.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -gt 0 -and (CellText $cells[0] $ns) -eq "created_at") {
        [void]$t15.RemoveChild($row)
      }
    }

    $t16 = $tables[15]
    foreach ($row in @($t16.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -gt 0) {
        $first = CellText $cells[0] $ns
        if ($first -eq "dislike_id") {
          SetCellText $cells[0] $ns "disliked_id"
        }
        elseif ($first -eq "created_at") {
          [void]$t16.RemoveChild($row)
        }
      }
    }

    $t17 = $tables[16]
    foreach ($row in @($t17.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -ge 2) {
        $first = CellText $cells[0] $ns
        if ($first -eq "quantity, unit") {
          SetCellText $cells[0] $ns "added_at"
          SetCellText $cells[1] $ns "Malzemenin dolaba eklenme zamanı"
        }
        elseif ($first -eq "created_at") {
          [void]$t17.RemoveChild($row)
        }
      }
    }
  }

  $settingsPath = Join-Path $temp "word\settings.xml"
  if (Test-Path $settingsPath) {
    [xml]$settings = Get-Content -LiteralPath $settingsPath -Raw -Encoding UTF8
    $settingsNs = New-Object System.Xml.XmlNamespaceManager($settings.NameTable)
    $settingsNs.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")
    $existing = $settings.SelectSingleNode("//w:updateFields", $settingsNs)
    if ($null -eq $existing) {
      $node = $settings.CreateElement("w", "updateFields", $settingsNs.LookupNamespace("w"))
      $attr = $settings.CreateAttribute("w", "val", $settingsNs.LookupNamespace("w"))
      $attr.Value = "true"
      [void]$node.Attributes.Append($attr)
      [void]$settings.DocumentElement.AppendChild($node)
    } else {
      $existing.SetAttribute("val", $settingsNs.LookupNamespace("w"), "true")
    }
    $settings.Save($settingsPath)
  }

  $xml.Save($docXmlPath)
  if (Test-Path $dst) { Remove-Item -LiteralPath $dst -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($temp, $dst)
  Write-Output $dst
}
finally {
  if (Test-Path $temp) {
    Remove-Item -LiteralPath $temp -Recurse -Force
  }
}
