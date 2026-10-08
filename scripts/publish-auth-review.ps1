param([string]$CommitMessage = 'Ajusta autenticacao, identidade e revisao de CIRP')

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Split-Path -Parent $PSScriptRoot)

# This implementation must not accidentally include the existing portal-to-root move.
$VersionedBaseFiles = @(git ls-files -- package.json src/App.tsx vite.config.ts)
if ($LASTEXITCODE -ne 0 -or $VersionedBaseFiles.Count -ne 3) {
    throw 'A reorganizacao anterior de portal/ para a raiz ainda nao foi versionada. Conclua esse commit separado antes de publicar esta implementacao.'
}

$ImplementationFiles = @(
    'AGENTS.md'
    '.agents/skills/webimovel-product-consistency/SKILL.md'
    'src/components/layout/Navbar.tsx'
    'src/components/media/ImageEditorModal.tsx'
    'src/components/modals/AuthModal.tsx'
    'src/components/profile/CreciDocumentManager.tsx'
    'src/components/profile/CreciReviewNotice.tsx'
    'src/components/ui/PortalBrand.tsx'
    'src/components/ui/ToastContainer.tsx'
    'src/context/AppContext.tsx'
    'src/context/AuthContext.tsx'
    'src/hooks/useCreciReviewNotifications.ts'
    'src/hooks/useResendCooldown.ts'
    'src/lib/creciDocuments.ts'
    'src/lib/formInput.ts'
    'src/lib/imageProcessing.ts'
    'src/views/AdminCreciReviewView.tsx'
    'src/views/ProfileView.tsx'
    'public/assets/email-logo.png'
    'supabase/migrations/20261007000001_creci_review_revisions_and_notices.sql'
    'supabase/templates/confirmation.html'
    'supabase/templates/confirmation-setup.md'
    'tests/auth-review.browser.tsx'
    'scripts/test-auth-review.mjs'
    'scripts/publish-auth-review.ps1'
)

$AlreadyStaged = @(git diff --cached --name-only)
if ($LASTEXITCODE -ne 0) { throw 'Nao foi possivel consultar os arquivos preparados.' }
$UnrelatedStaged = @($AlreadyStaged | Where-Object { $_ -notin $ImplementationFiles })
if ($UnrelatedStaged.Count -gt 0) {
    throw ('Ha arquivos de outras tarefas preparados para commit: ' + ($UnrelatedStaged -join ', ') + '. Conclua ou separe esses arquivos antes de executar este script.')
}
git add -- $ImplementationFiles
if ($LASTEXITCODE -ne 0) { throw 'Falha ao preparar os arquivos desta implementacao.' }
git commit -m $CommitMessage
if ($LASTEXITCODE -ne 0) { throw 'O commit nao foi concluido. O push foi interrompido.' }
git push
if ($LASTEXITCODE -ne 0) { throw 'O commit foi criado, mas o push falhou. Confira a mensagem do Git.' }
