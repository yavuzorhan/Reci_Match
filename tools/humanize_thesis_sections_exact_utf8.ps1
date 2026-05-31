param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath,
  [string]$ReplacementPath = "tools\humanize_exact_replacements.tsv"
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

$src = (Resolve-Path $InputPath).Path
$dst = Join-Path (Get-Location) $OutputPath
$replacementFile = (Resolve-Path $ReplacementPath).Path
$temp = Join-Path ([System.IO.Path]::GetTempPath()) ("docx_humanize_exact_" + [guid]::NewGuid().ToString("N"))

function Get-NodeText {
  param($Node, $Ns)
  return (($Node.SelectNodes(".//w:t", $Ns) | ForEach-Object { $_.'#text' }) -join "")
}

function Set-NodeText {
  param($Node, $Ns, [string]$Text)
  $texts = @($Node.SelectNodes(".//w:t", $Ns))
  if ($texts.Count -eq 0) { return }
  $texts[0].InnerText = $Text
  for ($i = 1; $i -lt $texts.Count; $i++) {
    $texts[$i].InnerText = ""
  }
}

$replacements = @{}
foreach ($line in [System.IO.File]::ReadAllLines($replacementFile, [System.Text.Encoding]::UTF8)) {
  if ([string]::IsNullOrWhiteSpace($line)) { continue }
  $tab = $line.IndexOf("`t")
  if ($tab -lt 1) { continue }
  $old = $line.Substring(0, $tab).Trim()
  $new = $line.Substring($tab + 1)
  $replacements[$old] = $new
}

try {
  [System.IO.Directory]::CreateDirectory($temp) | Out-Null
  [System.IO.Compression.ZipFile]::ExtractToDirectory($src, $temp)

  $docXmlPath = Join-Path $temp "word\document.xml"
  [xml]$xml = Get-Content -LiteralPath $docXmlPath -Raw -Encoding UTF8
  $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
  $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

  $changed = 0
  foreach ($p in $xml.SelectNodes("//w:p", $ns)) {
    $text = (Get-NodeText $p $ns).Trim()
    if ($replacements.ContainsKey($text)) {
      Set-NodeText $p $ns $replacements[$text]
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
