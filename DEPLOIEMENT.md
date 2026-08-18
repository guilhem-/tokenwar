# Déploiement

Le site est publié sur **GitHub Pages** à chaque poussée sur la branche par défaut, par
`.github/workflows/pages.yml`.

> 🎮 https://guilhem-.github.io/tokenwar/

## La barrière

Le workflow a deux jobs : `test` puis `deploy`, et `deploy` **dépend** de `test`. Si l'une des
trois suites échoue — syntaxe des modules, couverture des sept traductions, test UI sous jsdom,
partie complète en headless — le déploiement ne s'exécute pas et la version en ligne reste
celle d'avant. Un commit qui casse la partie ne peut pas atteindre les joueurs.

Une pull request passe les tests mais **ne publie pas** (`if: github.event_name != 'pull_request'`).

## Ce qui part en ligne

Le job assemble un `_site/` à partir d'une **liste explicite** : `index.html`, `styles.css`,
`js/`, plus un `.nojekyll`. Ce qui n'est pas nommé ne part pas — ni les tests, ni `tools/`, ni
`node_modules`, ni ce fichier. 18 fichiers, ~1,4 Mo.

## Le domaine personnalisé

Il n'y a **pas** de fichier `CNAME`, et c'est délibéré : `tokenwar.bonnafous.org` résout
aujourd'hui vers un serveur qui n'est pas GitHub. Déployer un `CNAME` dans cet état ferait
rediriger `guilhem-.github.io/tokenwar/` vers un domaine qui ne sert pas le jeu — injoignable
aux deux adresses.

Pour basculer, dans cet ordre :

1. chez le registrar de `bonnafous.org`, **supprimer l'enregistrement A** existant sur
   `tokenwar` (un même nom ne peut pas porter un A et un CNAME), puis créer :

   | Type  | Nom        | Valeur                | TTL   |
   |-------|------------|-----------------------|-------|
   | CNAME | `tokenwar` | `guilhem-.github.io.` | 3600  |

2. vérifier la propagation : `dig +short tokenwar.bonnafous.org CNAME` doit répondre
   `guilhem-.github.io.` ;
3. créer un fichier `CNAME` à la racine contenant `tokenwar.bonnafous.org`, et pousser ;
4. une fois le certificat Let's Encrypt émis (quelques minutes à une heure), cocher
   **« Enforce HTTPS »** dans *Settings → Pages*.

## Déploiement manuel vers un serveur

`tools/deploy.sh` reste disponible pour publier vers un serveur à soi, en `rsync`, après avoir
rejoué les trois suites localement. Il n'est plus le chemin principal — c'est une porte de
sortie si vous voulez héberger ailleurs que sur Pages.

```sh
cp tools/deploy.conf.example tools/deploy.conf   # renseigner DEPLOY_TARGET
tools/deploy.sh --dry-run                        # `--delete` est sans pitié : essayez à blanc
tools/deploy.sh
```

`rsync` n'existe pas dans Git Bash ; lancez-le depuis WSL.

## Les sauvegardes ne suivent pas un changement d'adresse

`localStorage` est lié à l'**origine**. Une partie commencée sur une adresse n'apparaîtra pas
sur une autre. Les joueurs la transfèrent avec **Exporter la sauvegarde** puis **Importer**,
dans le panneau d'aide (bouton `?`). Il n'existe pas d'autre moyen.
