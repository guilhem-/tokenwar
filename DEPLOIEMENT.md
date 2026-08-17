# Déploiement

**Le dépôt ne déploie plus rien.** Pousser sur git ne met pas le jeu en ligne : ça ne fait
que lancer les tests. La mise en ligne est un geste manuel, décidé et exécuté depuis le poste
de l'auteur.

```sh
tools/deploy.sh
```

## Ce que fait le script

1. **Il teste.** Syntaxe des modules, couverture des sept traductions, test UI sous jsdom,
   puis une **partie complète en headless**. Au premier échec il s'arrête et **rien n'est
   transféré** — c'est tout l'intérêt de passer par lui plutôt que par un `rsync` à la main.
2. **Il assemble `dist/`** à partir d'une **liste explicite** : `index.html`, `styles.css`,
   `js/`. Ce qui n'est pas nommé ne part pas — ni les tests, ni `tools/`, ni `node_modules`,
   ni le README. `dist/` est reconstruit de zéro à chaque fois, donc jamais de résidu.
3. **Il synchronise** avec `rsync -az --delete`. Le `--delete` fait de la destination une
   copie exacte de `dist/` : un fichier retiré du jeu disparaît aussi du serveur.

| Option | Effet |
|--------|-------|
| *(rien)* | Tests complets, puis mise en ligne |
| `--fast` | Saute la simulation de partie complète (le plus long) |
| `--dry-run` | Montre fichier par fichier ce qui changerait, ne transfère rien |
| `--dist-only` | Fabrique `dist/` et s'arrête — pour inspecter, ou déployer autrement |
| `--no-test` | Aucun filet. À n'utiliser qu'en connaissance de cause |

Le premier déploiement mérite un `tools/deploy.sh --dry-run` : `--delete` est sans pitié si
la destination est mal renseignée.

## Configuration

Une seule fois, sur le poste :

```sh
cp tools/deploy.conf.example tools/deploy.conf
$EDITOR tools/deploy.conf
```

```sh
DEPLOY_TARGET="user@serveur:/var/www/tokenwar"   # ou un chemin local
#DEPLOY_SSH_PORT=22
DEPLOY_URL="https://tokenwar.bonnafous.org"      # affiché à la fin, décoratif
```

`tools/deploy.conf` est **ignoré par git** : le nom d'hôte et le compte de déploiement ne
partent pas dans le dépôt. Sans ce fichier, le script fabrique quand même `dist/` et vous dit
simplement où il est.

L'authentification passe par votre agent SSH habituel. Le script ne manipule ni mot de passe
ni clé.

## Ce que le serveur doit servir

Un site statique, rien de plus. Aucun runtime, aucune base, aucun build.

- `index.html` à la racine du répertoire servi ;
- les **modules ES** (`js/*.js`) servis en `text/javascript` — c'est le seul piège réel :
  un serveur qui renvoie `text/plain` pour un `.js` fait échouer l'import et l'écran reste
  noir. nginx et Apache le font correctement d'origine ;
- **HTTPS**, sinon rien : le jeu n'utilise aucune API qui l'exige strictement, mais
  `localStorage` et l'audio de la cinématique de fin méritent une page de confiance.

Aucun en-tête particulier n'est nécessaire. Une politique de cache courte sur `index.html`
et longue sur `js/` est confortable mais facultative.

## Le domaine

`tokenwar.bonnafous.org` pointe déjà vers le serveur cible. Le déploiement étant manuel vers
ce serveur, **il n'y a pas de DNS à changer** : il suffit que le répertoire servi par ce
domaine soit celui que `DEPLOY_TARGET` désigne.

Le fichier `CNAME` de GitHub Pages a été supprimé — il n'avait de sens que pour un
déploiement automatique par Pages, qui n'existe plus.

## Les sauvegardes ne suivent pas un changement d'adresse

`localStorage` est lié à l'**origine**. Une partie commencée sur
`guilhem-.github.io/tokenwar/` n'apparaîtra pas sur `tokenwar.bonnafous.org`, et
réciproquement. Les joueurs concernés la transfèrent avec **Exporter la sauvegarde** puis
**Importer**, dans le panneau d'aide (bouton `?`). Il n'existe pas d'autre moyen.

## Et l'ancienne adresse ?

`guilhem-.github.io/tokenwar/` continue de servir **la dernière version que Pages avait
déployée**, et se fige là : plus aucun commit ne la mettra à jour. Pour l'éteindre
franchement, désactiver Pages dans *Settings → Pages* du dépôt.

## Le workflow qui reste

`.github/workflows/tests.yml` tourne toujours à chaque push et sur les pull requests. Il
n'a plus aucune permission d'écriture ni d'accès au déploiement : il se contente de dire si
un commit casse la partie. C'est un avis, plus une barrière — c'est `deploy.sh` qui décide
maintenant, en refaisant les mêmes tests localement avant d'envoyer quoi que ce soit.
