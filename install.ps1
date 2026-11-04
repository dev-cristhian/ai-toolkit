# ai-toolkit installer for Windows (PowerShell 5.1+ or PowerShell 7+).
#
#   irm https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.ps1 | iex
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/dev-cristhian/ai-toolkit/main/install.ps1))) --dry-run
#   .\install.ps1 --level 1 --target claude        # from a local clone
#
# This is a thin wrapper: it checks prerequisites, gets the repository
# (local clone or a fresh download) and runs bin/ai-toolkit.mjs with the
# same arguments. Run with --help to see every option.
#
# Everything runs inside a child script block so that, under "irm | iex",
# no variables or preference settings leak into the caller's session.

& {
  $ErrorActionPreference = 'Stop'
  $Repo = 'dev-cristhian/ai-toolkit'
  $Ref = if ($env:AI_TOOLKIT_REF) { $env:AI_TOOLKIT_REF } else { 'main' }
  $MinNode = '22.20' # required by the pinned skills CLI (skills@1.7.6)
  # $PSCommandPath is only set when running as a .ps1 file. Under "irm | iex"
  # an exit would close the user's window, so we return instead.
  $RunningAsFile = [bool]$PSCommandPath
  $exitCode = 0

  try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
      throw "Node.js $MinNode+ is required. Install it from https://nodejs.org and run this again."
    }
    # No double quotes in the JS: Windows PowerShell 5.1 strips them when
    # passing arguments to native programs.
    $check = 'const [a, b] = process.versions.node.split(/\./).map(Number); const [x, y] = process.argv[1].split(/\./).map(Number); process.exit(a > x || (a === x && b >= y) ? 0 : 1)'
    & node -e $check $MinNode
    if ($LASTEXITCODE -ne 0) {
      throw "Node.js $MinNode+ is required (found $(& node --version))."
    }

    $root = $null
    $tempDir = $null
    if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'bin/ai-toolkit.mjs'))) {
      $root = $PSScriptRoot
    }

    try {
      if (-not $root) {
        # Windows PowerShell 5.1 may default to older TLS versions.
        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        $tempDir = Join-Path ([IO.Path]::GetTempPath()) ('ai-toolkit-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $tempDir | Out-Null
        $zip = Join-Path $tempDir 'ai-toolkit.zip'
        Write-Host "Downloading $Repo ($Ref)..."
        try {
          Invoke-WebRequest -Uri "https://codeload.github.com/$Repo/zip/$Ref" -OutFile $zip -UseBasicParsing
        } catch {
          throw "Could not download https://github.com/$Repo (ref: $Ref). $($_.Exception.Message)"
        }
        Expand-Archive -Path $zip -DestinationPath $tempDir -Force
        $root = (Get-ChildItem -Path $tempDir -Directory | Select-Object -First 1).FullName
      }

      $cli = Join-Path $root 'bin/ai-toolkit.mjs'
      if (-not (Test-Path $cli)) {
        throw "The downloaded copy of $Repo (ref: $Ref) does not contain bin/ai-toolkit.mjs."
      }
      & node $cli @args
      $exitCode = $LASTEXITCODE
    } finally {
      if ($tempDir -and (Test-Path $tempDir)) { Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue }
    }
  } catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
  }

  if ($RunningAsFile) { exit $exitCode }
  if ($exitCode -ne 0) { Write-Host "ai-toolkit finished with exit code $exitCode." -ForegroundColor Yellow }
} @args
