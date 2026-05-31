param(
  [Parameter(Mandatory=$true)][string]$InputPath,
  [Parameter(Mandatory=$true)][string]$OutputPath
)

function Set-CellText {
  param($Cell, [string]$Text)
  $range = $Cell.Range
  $range.End = $range.End - 1
  $range.Text = $Text
}

function CellText {
  param($Cell)
  return (($Cell.Range.Text -replace "[`r`a]", "").Trim())
}

function Replace-All {
  param($Doc, [string]$Find, [string]$Replace)
  $range = $Doc.Content
  $findObj = $range.Find
  $findObj.ClearFormatting()
  $findObj.Replacement.ClearFormatting()
  $findObj.Text = $Find
  $findObj.Replacement.Text = $Replace
  $findObj.Forward = $true
  $findObj.Wrap = 1
  $findObj.Format = $false
  $findObj.MatchCase = $false
  $findObj.MatchWholeWord = $false
  $findObj.MatchWildcards = $false
  [void]$findObj.Execute($Find, $false, $false, $false, $false, $false, $true, 1, $false, $Replace, 2)
}

$src = (Resolve-Path $InputPath).Path
$dst = (Join-Path (Get-Location) $OutputPath)
Copy-Item -LiteralPath $src -Destination $dst -Force

$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Open($dst, $false, $false)

  Replace-All $doc "Tarif kaynağı. scraper veya custom gibi" "Tarif kaynağı. yemekcom, yemekcom_diet veya custom"
  Replace-All $doc "healthy_recipes tablosu sağlıklı tarifler ekranında gösterilecek tarifleri işaretlemek için kullanılır. Tarif bilgileri recipes tablosunda tutulmaya devam eder. Bu tablo yalnızca sağlıklı liste ile ilişkiyi yönetir." "healthy_recipes tablosu sağlıklı tarifler ekranında gösterilecek tarifleri işaretlemek için kullanılır. Güncel sistemde bu liste yemekcom_diet kaynaklı tariflerden beslenir. Tarif bilgileri recipes tablosunda tutulmaya devam eder."
  Replace-All $doc "Bu durumda backend kullanıcıya uygun hata kodu döndürür." "Bu durumda backend kullanıcıya 429 hata kodu döndürür."
  Replace-All $doc "JWTJSON Web Token" "JWTJSON Web Token (bu prototipte aktif oturum yöntemi değildir)"

  if ($doc.Tables.Count -ge 21) {
    $t4 = $doc.Tables.Item(4)
    $rowsToAdd = @(
      @("Sağlıklı tarif ilişkisi healthy_recipes", "196"),
      @("Yemek.com kaynaklı tarif source=yemekcom", "271"),
      @("Yemek.com diyet kaynaklı tarif source=yemekcom_diet", "196"),
      @("Kullanıcı özel tarif source=custom", "17"),
      @("Pozitif besin değeri kaydı", "237"),
      @("Gerçek 0 kalorili malzeme", "4")
    )
    foreach ($rowData in $rowsToAdd) {
      $newRow = $t4.Rows.Add()
      Set-CellText $newRow.Cells.Item(1) $rowData[0]
      Set-CellText $newRow.Cells.Item(2) $rowData[1]
    }

    $t8 = $doc.Tables.Item(8)
    for ($r = 1; $r -le $t8.Rows.Count; $r++) {
      if ((CellText $t8.Cell($r, 1)) -eq "source") {
        Set-CellText $t8.Cell($r, 3) "Tarif kaynağı. yemekcom, yemekcom_diet veya custom"
      }
    }

    $t12 = $doc.Tables.Item(12)
    for ($r = $t12.Rows.Count; $r -ge 1; $r--) {
      if ((CellText $t12.Cell($r, 1)) -eq "created_at") {
        $t12.Rows.Item($r).Delete()
      }
    }

    $t14 = $doc.Tables.Item(14)
    for ($r = 1; $r -le $t14.Rows.Count; $r++) {
      if ((CellText $t14.Cell($r, 1)) -eq "source") {
        Set-CellText $t14.Cell($r, 2) "Sağlıklı tarif kaynağı; güncel değer yemekcom_diet"
      }
    }

    $t15 = $doc.Tables.Item(15)
    for ($r = $t15.Rows.Count; $r -ge 1; $r--) {
      if ((CellText $t15.Cell($r, 1)) -eq "created_at") {
        $t15.Rows.Item($r).Delete()
      }
    }

    $t16 = $doc.Tables.Item(16)
    for ($r = $t16.Rows.Count; $r -ge 1; $r--) {
      $first = CellText $t16.Cell($r, 1)
      if ($first -eq "dislike_id") {
        Set-CellText $t16.Cell($r, 1) "disliked_id"
      }
      if ($first -eq "created_at") {
        $t16.Rows.Item($r).Delete()
      }
    }

    $t17 = $doc.Tables.Item(17)
    for ($r = $t17.Rows.Count; $r -ge 1; $r--) {
      $first = CellText $t17.Cell($r, 1)
      if ($first -eq "quantity, unit") {
        Set-CellText $t17.Cell($r, 1) "added_at"
        Set-CellText $t17.Cell($r, 2) "Malzemenin dolaba eklenme zamanı"
      }
      if ($first -eq "created_at") {
        $t17.Rows.Item($r).Delete()
      }
    }
  }

  foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
  foreach ($tof in $doc.TablesOfFigures) { $tof.Update() }
  foreach ($field in $doc.Fields) { $field.Update() | Out-Null }

  $doc.Save()
}
finally {
  if ($doc -ne $null) { $doc.Close($true) }
  if ($word -ne $null) { $word.Quit() }
}

Write-Output $dst
