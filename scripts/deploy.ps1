param(
    [string]$Profile = "default",
    [string]$Stage = "dev"
)

# Encontrar Node.js en el sistema
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    $nodePath = "${env:ProgramFiles}\nodejs\node.exe"
}

if (-not (Test-Path $nodePath)) {
    Write-Error "Node.js no encontrado. Por favor, asegúrate de que Node.js está instalado."
    exit 1
}

# Configurar variables de entorno
$env:NODE_OPTIONS = "--max-old-space-size=8192"
$env:PATH = "$env:ProgramFiles\nodejs;$env:PATH"

Write-Host "Deploying with profile: $Profile to stage: $Stage using Node at: $nodePath"

# Ejecutar el despliegue
try {
    if ($Stage -eq "dev") {
        & $nodePath $(npm prefix)/node_modules/serverless/bin/serverless.js deploy --aws-profile $Profile
    } else {
        & $nodePath $(npm prefix)/node_modules/serverless/bin/serverless.js deploy --stage $Stage --aws-profile $Profile
    }
} catch {
    Write-Error "Error durante el despliegue: $_"
    exit 1
}
