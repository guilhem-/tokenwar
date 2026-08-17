#!/usr/bin/env bash
#
# Déploiement manuel de TokenWar, depuis ce poste.
#
# Le dépôt ne déploie plus rien tout seul : pousser sur git ne met plus le jeu
# en ligne. C'est ce script qui le fait, quand vous le décidez.
#
#   tools/deploy.sh                 # tests complets, puis mise en ligne
#   tools/deploy.sh --fast          # saute la simulation (~2 min de moins)
#   tools/deploy.sh --dry-run       # montre ce qui serait transféré, ne transfère rien
#   tools/deploy.sh --dist-only     # fabrique dist/ et s'arrête là
#   tools/deploy.sh --no-test       # pas de filet. À vos risques.
#
# La destination se configure dans tools/deploy.conf (ignoré par git) :
#
#   DEPLOY_TARGET="user@serveur:/var/www/tokenwar"   # ou un chemin local
#   DEPLOY_SSH_PORT=22                               # facultatif
#
# Voir DEPLOIEMENT.md.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DIST="$ROOT/dist"
CONF="$ROOT/tools/deploy.conf"

RUN_TESTS=1
RUN_SIM=1
DRY_RUN=0
DIST_ONLY=0

for arg in "$@"; do
  case "$arg" in
    --fast)      RUN_SIM=0 ;;
    --no-test)   RUN_TESTS=0 ;;
    --dry-run)   DRY_RUN=1 ;;
    --dist-only) DIST_ONLY=1 ;;
    -h|--help)   sed -n '3,19p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *)           echo "Option inconnue : $arg" >&2; exit 2 ;;
  esac
done

say()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 1. les tests

if [ "$RUN_TESTS" = 1 ]; then
  say "Tests"

  for f in js/*.js; do node --check "$f"; done
  ok "syntaxe des modules"

  node test-i18n.mjs > /tmp/tokenwar-i18n.log 2>&1 \
    || { cat /tmp/tokenwar-i18n.log; die "traductions incomplètes — rien n'est parti"; }
  ok "traductions : couverture complète"

  if [ ! -d node_modules/jsdom ]; then
    echo "  … installation de jsdom (test UI)"
    npm install jsdom --no-save --no-audit --no-fund > /dev/null 2>&1 \
      || die "impossible d'installer jsdom"
  fi
  node test-ui.mjs > /tmp/tokenwar-ui.log 2>&1 \
    || { cat /tmp/tokenwar-ui.log; die "test UI en échec — rien n'est parti"; }
  ok "interface : aucune erreur"

  if [ "$RUN_SIM" = 1 ]; then
    echo "  … partie complète en headless, patientez"
    node test-sim.mjs > /tmp/tokenwar-sim.log 2>&1 \
      || { tail -20 /tmp/tokenwar-sim.log; die "la partie ne se termine plus — rien n'est parti"; }
    ok "$(grep -m1 'Temps écoulé' /tmp/tokenwar-sim.log || echo 'simulation terminée')"
  else
    printf '  \033[33m!\033[0m simulation sautée (--fast)\n'
  fi
else
  printf '\033[33m! tests sautés (--no-test)\033[0m\n'
fi

# ------------------------------------------------------------------- 2. dist/

say "Assemblage de dist/"

# Liste explicite : on n'expédie que le jeu. Pas les tests, pas les outils,
# pas node_modules, pas le README. Ce qui n'est pas nommé ici ne part pas.
rm -rf "$DIST"
mkdir -p "$DIST"
cp index.html styles.css "$DIST/"
cp -R js "$DIST/js"

# Un .nojekyll ne coûte rien et évite qu'un hébergeur de type Pages ignore un
# éventuel fichier commençant par un souligné.
touch "$DIST/.nojekyll"

FILES=$(find "$DIST" -type f | wc -l | tr -d ' ')
SIZE=$(du -sh "$DIST" | cut -f1)
ok "$FILES fichiers, $SIZE"

if [ "$DIST_ONLY" = 1 ]; then
  say "dist/ est prêt : $DIST"
  exit 0
fi

# ---------------------------------------------------------------- 3. mise en ligne

# shellcheck source=/dev/null
[ -f "$CONF" ] && . "$CONF"

if [ -z "${DEPLOY_TARGET:-}" ]; then
  cat <<EOF

Pas de destination configurée. dist/ est prêt ($DIST), mais rien n'a été envoyé.

Créez tools/deploy.conf :

    DEPLOY_TARGET="user@serveur:/var/www/tokenwar"

(un chemin local fait aussi l'affaire, par exemple un dossier synchronisé)
EOF
  exit 0
fi

say "Mise en ligne vers $DEPLOY_TARGET"

RSYNC_OPTS=(-az --delete --human-readable --itemize-changes)
[ "$DRY_RUN" = 1 ] && RSYNC_OPTS+=(--dry-run)
[ -n "${DEPLOY_SSH_PORT:-}" ] && RSYNC_OPTS+=(-e "ssh -p $DEPLOY_SSH_PORT")

command -v rsync > /dev/null || die "rsync introuvable"

# Le / final sur la source est capital : il copie le *contenu* de dist/, pas le
# dossier lui-même. Sans lui on obtiendrait /var/www/tokenwar/dist/index.html.
rsync "${RSYNC_OPTS[@]}" "$DIST/" "$DEPLOY_TARGET"

if [ "$DRY_RUN" = 1 ]; then
  say "Essai à blanc terminé — rien n'a été modifié"
else
  say "En ligne."
  [ -n "${DEPLOY_URL:-}" ] && echo "  $DEPLOY_URL"
fi
