$ErrorActionPreference = 'Stop'
$blenderCommand = Get-Command blender -ErrorAction SilentlyContinue
if ($blenderCommand) {
  $blenderExe = $blenderCommand.Source
} else {
  $blenderExe = 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe'
}
if (-not (Test-Path -LiteralPath $blenderExe)) {
  throw 'Blender executable not found. Install Blender or add blender.exe to PATH.'
}
& $blenderExe --background --python (Join-Path $PSScriptRoot 'build_street_assets.py')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
