param(
  [ValidateSet("dev", "build", "preview", "desktop", "installer", "installer-minor", "installer-major")]
  [string]$Mode = "dev",
  [string]$BindHost = "127.0.0.1",
  [int]$Port = 0,
  [switch]$Install
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectRoot

function Resolve-NodeDir {
  $globalNode = Get-Command node -ErrorAction SilentlyContinue -CommandType Application
  if ($globalNode) {
    return Split-Path -Parent $globalNode.Source
  }

  $candidates = @()

  $wingetBase = Join-Path $env:LOCALAPPDATA "Microsoft\\WinGet\\Packages\\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe"
  if (Test-Path $wingetBase) {
    $wingetVersion = Get-ChildItem $wingetBase -Directory -Filter "node-v*-win-x64" |
      Sort-Object Name -Descending |
      Select-Object -First 1
    if ($wingetVersion) {
      $candidates += $wingetVersion.FullName
    }
  }

  $toolsBase = Join-Path $projectRoot ".tools"
  if (Test-Path $toolsBase) {
    $toolsVersion = Get-ChildItem $toolsBase -Directory -Filter "node-v*-win-x64" |
      Sort-Object Name -Descending |
      Select-Object -First 1
    if ($toolsVersion) {
      $candidates += $toolsVersion.FullName
    }
    $candidates += (Join-Path $toolsBase "node")
  }

  foreach ($candidate in $candidates) {
    if (Test-Path (Join-Path $candidate "node.exe")) {
      return $candidate
    }
  }

  return $null
}

$nodeDir = Resolve-NodeDir
if (-not $nodeDir) {
  throw "Node.js nao encontrado. Instale com: winget install --id OpenJS.NodeJS.LTS --scope user --accept-package-agreements --accept-source-agreements"
}

$npmCmd = Join-Path $nodeDir "npm.cmd"
if (-not (Test-Path $npmCmd)) {
  throw "npm.cmd nao encontrado em $nodeDir"
}

$env:PATH = "$nodeDir;$env:PATH"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

if ($Install -or -not (Test-Path (Join-Path $projectRoot "node_modules"))) {
  & $npmCmd install
}

if ($Mode -eq "build") {
  & $npmCmd run build
  exit $LASTEXITCODE
}

if ($Mode -eq "preview") {
  if ($Port -le 0) {
    $Port = 4173
  }

  & $npmCmd run build
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & $npmCmd run preview -- --host $BindHost --port $Port
  exit $LASTEXITCODE
}

if ($Mode -eq "desktop") {
  & $npmCmd run desktop:dev
  exit $LASTEXITCODE
}

if ($Mode -eq "installer") {
  & $npmCmd run desktop:pack:release
  exit $LASTEXITCODE
}

if ($Mode -eq "installer-minor") {
  & $npmCmd run desktop:pack:release:minor
  exit $LASTEXITCODE
}

if ($Mode -eq "installer-major") {
  & $npmCmd run desktop:pack:release:major
  exit $LASTEXITCODE
}

if ($Port -le 0) {
  $Port = 8080
}

& $npmCmd run dev -- --host $BindHost --port $Port
exit $LASTEXITCODE
