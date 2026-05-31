param(
  [Parameter(Mandatory=$true)][string]$DocxPath,
  [Parameter(Mandatory=$true)][string]$OutPath
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("docx_extract_" + [guid]::NewGuid().ToString("N"))
[System.IO.Directory]::CreateDirectory($temp) | Out-Null

try {
  [System.IO.Compression.ZipFile]::ExtractToDirectory((Resolve-Path $DocxPath).Path, $temp)
  [xml]$xml = Get-Content -LiteralPath (Join-Path $temp "word\document.xml") -Raw -Encoding UTF8
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

  $lines = New-Object System.Collections.Generic.List[string]
  $pIndex = 0
  foreach ($p in $xml.SelectNodes("//w:p", $ns)) {
    $pIndex++
    $texts = $p.SelectNodes(".//w:t", $ns) | ForEach-Object { $_.'#text' }
    $line = ($texts -join "")
    if ($line.Trim().Length -gt 0) {
      $styleNode = $p.SelectSingleNode("./w:pPr/w:pStyle", $ns)
      $style = if ($styleNode) { $styleNode.GetAttribute("val", $ns.LookupNamespace("w")) } else { "" }
      $lines.Add(("P{0:D4} [{1}] {2}" -f $pIndex, $style, $line.Trim()))
    }
  }

  $tableIndex = 0
  foreach ($tbl in $xml.SelectNodes("//w:tbl", $ns)) {
    $tableIndex++
    $lines.Add("")
    $lines.Add("--- TABLE $tableIndex ---")
    foreach ($tr in $tbl.SelectNodes("./w:tr", $ns)) {
      $cells = @()
      foreach ($tc in $tr.SelectNodes("./w:tc", $ns)) {
        $cellText = (($tc.SelectNodes(".//w:t", $ns) | ForEach-Object { $_.'#text' }) -join "")
        $cells += $cellText.Trim()
      }
      if ($cells.Count -gt 0) {
        $lines.Add(($cells -join " | "))
      }
    }
  }

  [System.IO.File]::WriteAllLines((Join-Path (Get-Location) $OutPath), $lines, [System.Text.Encoding]::UTF8)
}
finally {
  if (Test-Path $temp) {
    Remove-Item -LiteralPath $temp -Recurse -Force
  }
}
