<# Erstellt oder entfernt eine Windows-Aufgabenplanung aus einer XML-Vorlage. #>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string]$Name,
    [string]$Vorlage = (Join-Path (Split-Path $PSScriptRoot -Parent) 'zeitplan\de.eigene-website.waechter.windows.xml.vorlage'),
    [hashtable]$Werte = @{},
    [switch]$Entfernen,
    [switch]$Trocken
)

$ErrorActionPreference = 'Stop'
if ($Entfernen) {
    if ($Trocken) { Write-Output "Unregister-ScheduledTask -TaskName '$Name' -Confirm:`$false"; exit 0 }
    Unregister-ScheduledTask -TaskName $Name -Confirm:$false
    exit 0
}
if (-not (Test-Path $Vorlage -PathType Leaf)) { throw "Vorlage nicht gefunden: $Vorlage" }
$xml = Get-Content -LiteralPath $Vorlage -Raw
foreach ($Schluessel in $Werte.Keys) {
    $wert = [System.Security.SecurityElement]::Escape([string]$Werte[$Schluessel])
    $xml = $xml.Replace(('{{' + $Schluessel + '}}'), $wert).Replace(('__' + $Schluessel + '__'), $wert)
}
if ($xml -match '{{[A-Z_]+}}|__[A-Z_]+__') { throw 'Nicht ersetzter Platzhalter in der XML-Vorlage' }
if ($Trocken) { Write-Output $xml; exit 0 }
Register-ScheduledTask -TaskName $Name -Xml $xml -Force | Out-Null
