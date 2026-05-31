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

function CellText {
  param($Cell, $Ns)
  return ((NodeText $Cell $Ns) -replace "[`r`a]", "").Trim()
}

function SetCellText {
  param($Cell, $Ns, [string]$Text)
  SetNodeText $Cell $Ns $Text
}

try {
  [System.IO.Directory]::CreateDirectory($temp) | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($src, $temp)

  $docXmlPath = Join-Path $temp "word\document.xml"
  [xml]$xml = Get-Content -LiteralPath $docXmlPath -Raw -Encoding UTF8
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

  $paragraphs = @($xml.SelectNodes("//w:p", $ns))

  foreach ($p in $paragraphs) {
    $texts = @($p.SelectNodes(".//w:t", $ns))
    foreach ($t in $texts) {
      if ($t.'#text' -eq "scraper veya custom gibi") {
        $t.'#text' = "yemekcom, yemekcom_diet veya custom"
      }
      if ($t.'#text' -eq "uygun hata kodu") {
        $t.'#text' = "429 hata kodu"
      }
    }
    $paragraphText = NodeText $p $ns
    if ($paragraphText.Contains("uygun hata kodu")) {
      SetNodeText $p $ns ($paragraphText.Replace("uygun hata kodu", "429 hata kodu"))
    }
  }

  $figurePages = @("3","4","5","9","24","25","25","26","26","27","28","28","29","29","30","30","31","31","32","32","33","39","40","41","42","42")
  for ($i = 0; $i -lt $figurePages.Count; $i++) {
    $p = $paragraphs[112 + $i]
    $text = (NodeText $p $ns).Trim()
    if ($text.EndsWith("1")) {
      SetNodeText $p $ns ($text.Substring(0, $text.Length - 1) + $figurePages[$i])
    }
  }

  $tablePages = @("6","10","13","14","14","15","16","16","17","17","18","18","18","19","19","19","20","20","20","22","24")
  for ($i = 0; $i -lt $tablePages.Count; $i++) {
    $p = $paragraphs[140 + $i]
    $text = (NodeText $p $ns).Trim()
    if ($text.EndsWith("1")) {
      SetNodeText $p $ns ($text.Substring(0, $text.Length - 1) + $tablePages[$i])
    }
  }

  $tables = @($xml.SelectNodes("//w:tbl", $ns))
  if ($tables.Count -ge 21) {
    $t8 = $tables[7]
    foreach ($row in @($t8.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -ge 3 -and (CellText $cells[0] $ns) -eq "source") {
        $old = CellText $cells[2] $ns
        $new = $old.Replace("scraper veya custom gibi", "yemekcom, yemekcom_diet veya custom")
        SetCellText $cells[2] $ns $new
      }
    }

    $t12 = $tables[11]
    foreach ($row in @($t12.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -gt 0 -and (CellText $cells[0] $ns) -eq "created_at") {
        [void]$t12.RemoveChild($row)
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
        } elseif ($first -eq "created_at") {
          [void]$t16.RemoveChild($row)
        }
      }
    }

    $t17 = $tables[16]
    $createdAtDescription = $null
    foreach ($row in @($t17.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -ge 2 -and (CellText $cells[0] $ns) -eq "created_at") {
        $createdAtDescription = CellText $cells[1] $ns
      }
    }
    foreach ($row in @($t17.SelectNodes("./w:tr", $ns))) {
      $cells = @($row.SelectNodes("./w:tc", $ns))
      if ($cells.Count -ge 2) {
        $first = CellText $cells[0] $ns
        if ($first -eq "quantity, unit") {
          SetCellText $cells[0] $ns "added_at"
          if ($createdAtDescription) { SetCellText $cells[1] $ns $createdAtDescription }
        } elseif ($first -eq "created_at") {
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
