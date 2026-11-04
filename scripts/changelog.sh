#!/usr/bin/env bash
# Gera/atualiza CHANGELOG.md a partir do git log (Conventional Commits)
# Uso: bash scripts/changelog.sh [--from TAG] [--to TAG]

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANGELOG="$REPO_ROOT/CHANGELOG.md"
TODAY=$(date +%Y-%m-%d)

FROM="${2:-}"
TO="${4:-HEAD}"

# Determina o range de commits
if [ -n "$FROM" ]; then
    RANGE="$FROM..$TO"
else
    LAST_TAG=$(git -C "$REPO_ROOT" describe --tags --abbrev=0 2>/dev/null || echo "")
    if [ -n "$LAST_TAG" ]; then
        RANGE="$LAST_TAG..HEAD"
    else
        RANGE="HEAD"
    fi
fi

echo "Gerando CHANGELOG.md..."
echo "  Range: $RANGE"
echo ""

# Coleta commits por tipo
get_commits() {
    local type="$1"
    git -C "$REPO_ROOT" log "$RANGE" --pretty=format:"- %s" --no-merges 2>/dev/null \
        | grep -E "^- $type(\(.+\))?: " || true
}

FEAT=$(get_commits "feat")
FIX=$(get_commits "fix")
PERF=$(get_commits "perf")
REFACTOR=$(get_commits "refactor")
DOCS=$(get_commits "docs")
CHORE=$(get_commits "chore")
CI=$(get_commits "ci")
BUILD=$(get_commits "build")

# Gera bloco [Unreleased]
UNRELEASED="## [Unreleased] — $TODAY"

if [ -n "$FEAT" ]; then
    UNRELEASED="$UNRELEASED

### Added
$FEAT"
fi

if [ -n "$FIX" ]; then
    UNRELEASED="$UNRELEASED

### Fixed
$FIX"
fi

if [ -n "$PERF" ]; then
    UNRELEASED="$UNRELEASED

### Performance
$PERF"
fi

if [ -n "$REFACTOR" ]; then
    UNRELEASED="$UNRELEASED

### Changed
$REFACTOR"
fi

if [ -n "$DOCS" ]; then
    UNRELEASED="$UNRELEASED

### Documentation
$DOCS"
fi

if [ -n "$CHORE" ] || [ -n "$CI" ] || [ -n "$BUILD" ]; then
    MAINTENANCE="$CHORE"
    [ -n "$CI" ] && MAINTENANCE="$MAINTENANCE
$CI"
    [ -n "$BUILD" ] && MAINTENANCE="$MAINTENANCE
$BUILD"
    UNRELEASED="$UNRELEASED

### Maintenance
$MAINTENANCE"
fi

# Cria ou atualiza o CHANGELOG
if [ -f "$CHANGELOG" ]; then
    {
        head -n 3 "$CHANGELOG"
        echo ""
        echo "$UNRELEASED"
        echo ""
        awk '/^## \[[0-9]/{found=1} found' "$CHANGELOG" || true
    } > "${CHANGELOG}.tmp"
    mv "${CHANGELOG}.tmp" "$CHANGELOG"
else
    cat > "$CHANGELOG" << EOF
# Changelog

Todas as mudanças notáveis neste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

$UNRELEASED
EOF
fi

echo "CHANGELOG.md atualizado!"
echo ""
cat "$CHANGELOG"
