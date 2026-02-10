# scripts/install-dalevision-skills.ps1
$ErrorActionPreference = "Stop"

$SRC  = Join-Path (Get-Location) ".agent\skills-src"
$DEST = Join-Path (Get-Location) ".codex\skills"

if (!(Test-Path $SRC))  { throw "Fonte não encontrada: $SRC. Rode o git clone primeiro." }
if (!(Test-Path $DEST)) { New-Item -ItemType Directory -Force -Path $DEST | Out-Null }

# Skills escolhidos para DaleVision (pack curado)
$SKILLS = @(
  "computer-vision-expert",
  "ai-engineer",
  "rag-engineer",
  "architecture",
  "event-sourcing-architect",
  "postgres-best-practices",
  "analytics-tracking",
  "n8n-mcp-tools-expert",
  "supabase-automation",
  "frontend-dev-guidelines",
  "react-best-practices",
  "clean-code",
  "code-review-excellence",
  "error-detective"
)

# Procura pastas de skills pelo nome e copia para .codex/skills
# (cada skill normalmente é uma pasta contendo SKILL.md)
$found = 0
foreach ($skill in $SKILLS) {
  $matches = Get-ChildItem -Path $SRC -Directory -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ieq $skill }

  if ($matches.Count -eq 0) {
    Write-Host "❌ Skill não encontrada: $skill"
    continue
  }

  # Se tiver mais de um match, pega o primeiro (normalmente é único)
  $skillDir = $matches[0].FullName
  $target   = Join-Path $DEST $skill

  if (Test-Path $target) { Remove-Item -Recurse -Force $target }

  Copy-Item -Recurse -Force $skillDir $target
  Write-Host "✅ Instalado: $skill"
  $found++
}

Write-Host ""
Write-Host "Resumo: $found / $($SKILLS.Count) skills instalados em $DEST"
Write-Host "Agora reinicie o Codex CLI para ele recarregar os skills."
