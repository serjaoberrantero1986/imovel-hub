param(
  [string]$SupabaseUrl = $env:SUPABASE_URL,
  [string]$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
)

$ErrorActionPreference = 'Stop'
if ([string]::IsNullOrWhiteSpace($SupabaseUrl) -or [string]::IsNullOrWhiteSpace($ServiceRoleKey)) {
  throw 'Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de executar a carga.'
}

$sourceUrl = 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Bairro_csv/Agregados_por_bairros_basico_BR_20260520.zip'
$work = Join-Path ([System.IO.Path]::GetTempPath()) ('webimoveis-ibge-' + [guid]::NewGuid().ToString('N'))
$zip = Join-Path $work 'bairros.zip'
$extract = Join-Path $work 'extract'
New-Item -ItemType Directory -Path $extract -Force | Out-Null

try {
  Invoke-WebRequest -Uri $sourceUrl -OutFile $zip
  Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
  $csv = Get-ChildItem -LiteralPath $extract -Filter '*.csv' -File | Select-Object -First 1
  if (-not $csv) { throw 'O arquivo oficial não contém um CSV reconhecível.' }

  $rows = Import-Csv -LiteralPath $csv.FullName -Delimiter ';' | Where-Object {
    $_.CD_UF -eq '35' -and -not [string]::IsNullOrWhiteSpace($_.CD_MUN) -and -not [string]::IsNullOrWhiteSpace($_.CD_BAIRRO) -and -not [string]::IsNullOrWhiteSpace($_.NM_MUN) -and -not [string]::IsNullOrWhiteSpace($_.NM_BAIRRO)
  } | ForEach-Object {
    [ordered]@{
      municipality_ibge_id = [int64]$_.CD_MUN
      municipality_name = $_.NM_MUN.Trim()
      neighborhood_code = $_.CD_BAIRRO.Trim()
      neighborhood_name = $_.NM_BAIRRO.Trim()
      source = 'IBGE_CENSO_2022'
      source_version = '2022-05-20'
    }
  }
  if (-not $rows) { throw 'Nenhum bairro de São Paulo foi encontrado no arquivo oficial.' }

  $headers = @{ apikey = $ServiceRoleKey; Authorization = "Bearer $ServiceRoleKey"; Prefer = 'resolution=merge-duplicates,return=minimal' }
  $endpoint = "$($SupabaseUrl.TrimEnd('/'))/rest/v1/partnership_official_sp_neighborhoods?on_conflict=municipality_ibge_id,neighborhood_code"
  $batchSize = 500
  for ($offset = 0; $offset -lt $rows.Count; $offset += $batchSize) {
    $count = [Math]::Min($batchSize, $rows.Count - $offset)
    $batch = @($rows[$offset..($offset + $count - 1)])
    Invoke-RestMethod -Method Post -Uri $endpoint -Headers $headers -ContentType 'application/json; charset=utf-8' -Body ($batch | ConvertTo-Json -Depth 4 -Compress) | Out-Null
    Write-Host "Carregados $([Math]::Min($offset + $count, $rows.Count)) de $($rows.Count) registros oficiais..."
  }
  Write-Host "Carga concluída: $($rows.Count) bairros oficiais de São Paulo."
}
finally {
  if (Test-Path -LiteralPath $work) { Remove-Item -LiteralPath $work -Recurse -Force }
}
