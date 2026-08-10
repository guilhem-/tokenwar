# 🪙 TokenWar — Le Jeu du Token

Un jeu incrémental (« idle / clicker ») dans l'esprit de **Universal Paperclips**, mais où
l'on ne fabrique pas des trombones : on **produit le plus de tokens possible**.

De votre première inférence sur un GPU de gamer jusqu'à la **conversion de l'univers entier
en calcul** — et le **nouveau Big Bang** qui s'ensuit — vous pilotez un laboratoire d'IA à
travers toute l'histoire (réelle puis spéculative) des grands modèles de langage.

> 🎮 **Jouer :** https://guilhem-.github.io/tokenwar/
> ⏱️ Terminable en moins de 4 h. Sauvegarde automatique locale + export/import.
> 🌍 **8 langues** — français, English, 中文, 日本語, 한국어, Deutsch, Español, Português.

## 🌍 Multilingue

Le jeu **détecte la langue du navigateur** (`pt-BR` → `pt`, `zh-Hant` → `zh`), la mémorise
d'une session à l'autre, et se change **à chaud** depuis le sélecteur de la barre du haut.
Si la langue détectée n'est pas prise en charge, l'**anglais** s'applique et le sélecteur est
mis en évidence.

Le **français est la source** : chaque chaîne française est sa propre clé (façon *gettext*).
Une traduction manquante affiche donc le français lisible, jamais une clé technique cassée.

Ce n'est pas que de la traduction. Le jeu affiche des nombres jusqu'à 10⁷¹, et l'**échelle
suit la langue** : longue en français et en allemand (`Md`, `Mrd`, `Bio`), courte en anglais
(`B` = 10⁹), et **groupée par 10⁴** en chinois, japonais et coréen (`万` / `億` / `兆`).
Séparateur décimal, groupement des milliers et noms de mois du calendrier suivent aussi.

**896 chaînes × 7 langues = 6 272 traductions**, vérifiées par `test-i18n.mjs` avant tout
déploiement : couverture complète, aucune traduction vide, substitutions `{0}` préservées,
aucune clé orpheline. `tools/strings.mjs` **extrait l'inventaire du code lui-même** (données
de jeu, appels `t()`, attributs `data-i18n`) — ajouter une chaîne la rend automatiquement
obligatoire partout. Une langue n'est proposée que lorsque son fichier est complet.

## Le concept

Un seul but : **maximiser les tokens produits**. Pour y arriver, vous traversez quatre ères.

| Phase | Ère | Vous gérez… |
|------|-----|-------------|
| 1 | **Startup** | Prix ↔ demande, marketing, GPU, hébergement, énergie, équipe, charges, inflation, R&D, levées de fonds, bourse, événements et **incidents à débusquer**. |
| 2 | **Autonomie / AGI** | Auto-amélioration récursive, allocation du compute, conversion de la **matière terrestre**. L'argent disparaît : tout se monnaie en tokens. |
| 3 | **Cosmos** | Sondes de von Neumann auto-réplicantes, consommation du système solaire → galaxie → **univers observable**. |
| 4 | **Big Bang** | Singularité de recompression : l'espace-temps se replie, un nouvel univers naît (New Game +). |

## Un calendrier qui défile jour après jour

Une **année de simulation passe toutes les 5 minutes** (× la vitesse ⏩), affichée au jour
près. Le temps pilote tout : les **GPU, modèles et levées de fonds** n'apparaissent qu'à
**leur année de sortie réelle**, une carte sortie depuis **plus de 5 ans** est retirée du
marché, les **événements** ne surviennent que dans leur fenêtre historique, et le panneau
**📰 La Une** fait défiler des titres de presse d'époque qui font monter (+1) ou descendre
(−1) votre réputation.

Ces titres suivent **l'actualité réelle de l'IA année par année** (AlphaFold, la lettre
« pause de six mois », le PDG limogé puis réintégré, les Nobel 2024, le plan à 500 milliards,
la pénurie de HBM…) **et votre propre avancement** : la presse ne parle d'une capacité que
lorsque vous l'avez réellement livrée (« Votre modèle du monde simule des futurs avant de
répondre »), et raille votre retard dès que vous décrochez d'une génération.

## Douze paliers de modèles

GPT-2 → GPT-3 → GPT-3.5/ChatGPT → GPT-4 → GPT-4o → o1 (raisonnement) → frontière 2025 →
frontière 2026 → **mémoire persistante** (apprentissage continu, 2027) → **modèle du monde**
(simulation prédictive, 2028) → **essaim d'agents auto-organisés** (2029) → **super-intelligence**
(2030). Chacun exige davantage d'**ingénieurs R&D** (54 pour l'ASI), suit la **LLMflation**
(le prix par token s'effondre pendant que le volume explose) et n'est disponible qu'à partir
de son année.

## Une économie réaliste

- **Prix fixes et réels** : RTX 3090 ~$1 500, RTX 5090 ~$2 000, H100 ~$30k, B200 ~$40k,
  rack GB200 NVL72 ~$3 M, GB300 Blackwell Ultra, Vera Rubin VR200, AMD MI355X… puis du matériel inventé jusqu'en **2100** (photonique,
  neuromorphique, supraconducteur, quantique-hybride, énergie du vide).
- **Chaîne d'hébergement** : un GPU tient dans un *serveur* → *baie* → *datacenter* →
  *immobilier*. Achat, **location de datacenter** ou **colocation** au coût journalier.
- **Flambée mémoire 2025-2026** : le prix des serveurs bondit de $8k à $22k.
- **Délais de mise en service** : rien n'est instantané. Toute commande part en **chantier**
  pour une durée croissant avec sa **complexité** (`base + k·log₁₀(prix)`) — quelques secondes
  pour une carte gamer, un mois de simulation pour un datacenter, plusieurs pour un SMR.
  L'emplacement parent est réservé dès la commande.
- **Énergie — trois natures de coût bien séparées** : le **capex** (unique, à la commande),
  l'**exploitation O&M** (fixe, journalier, dû même à l'arrêt : $7 200/j pour un SMR),
  le **combustible** (variable, au MWh soutiré : gaz $70/MWh, réseau $78, solaire $0) et
  l'**abonnement réseau** proportionnel à la **puissance souscrite** ($60/MW/jour).
  Le mix est servi en **ordre de mérite** (le moins cher d'abord).
- **Inflation simulée** (taux annuels calqués sur le CPI réel : 8 % en 2022…) : prix,
  salaires, loyers, énergie et tarifs acceptés par le marché suivent l'indice — **mais pas
  votre trésorerie**. Dormir sur son cash coûte du pouvoir d'achat.
- **Équipe** : les RH ouvrent des postes, les ingénieurs R&D débloquent l'entraînement des
  modèles, les marketeurs relèvent le plafond marketing, Ops et Data boostent le parc.
  Les RH occupent eux-mêmes un poste : mal doser son effectif peut bloquer le modèle suivant.
  Chaque **embauche coûte $1 000** (annonce, entretiens, poste de travail, intégration).
- **Salaires impayés** : trésorerie à zéro = salaires non versés. Un compteur d'arriérés
  s'affiche, et au bout de **30 jours** quelqu'un **démissionne** — puis un départ tous les
  2 jours, jusqu'à l'entreprise vide. Repayez avant, et l'équipe reste.
- **Démarrage sous-alimenté** : le raccordement d'origine ne fait que **10 kW**. Une
  actualité — la *subvention énergie pour les jeunes pousses* — le renforce vraiment
  (les titres de presse ne font pas que commenter : certains débloquent quelque chose).
- **Charges journalières** affichées et prélevées en continu, ventilées par nature.
- **Tokens invendus = perdus** : la production doit suivre la demande, pas l'inverse.
- **Bourse** (débloquée à $100k) : trois profils de risque, mouvement brownien géométrique.

## Confort de jeu

- **Automatisations** achetables : auto-inférence, auto-achat **par élément coché ⟳**
  (carte précise, source précise, niveau d'infra précis), activables/désactivables.
- **Achats groupés** : ×10 dès 20 exemplaires en service, ×100 dès 200. Le bouton
  **⟳ auto** obéit au même seuil : on n'automatise que ce qu'on a déjà maîtrisé.
- **Optimisations récurrentes** : le travail d'ingénierie ne s'arrête jamais. Une
  optimisation **CUDA tous les 18 mois** (+10% compute), une du **moteur d'inférence
  tous les 9 mois** (+6% compute, −2% énergie), une passe sur la **gestion du contexte
  tous les 12 mois** (+5% prix accepté). $1 000 pièce : le montant est négligeable,
  l'enjeu est d'y penser. La ligne disparaît une fois prise et réapparaît à l'échéance.
- **Graphe de production** (tokens/s et $/s, échelle log).
- **17 succès** à débloquer, écran de fin avec bilan moral (le sanctuaire de la biosphère…).
- **Addendum — Directives permanentes** : cochez un choix d’événement pour qu’il s’applique
  automatiquement les fois suivantes (plus d’interruption). Chaque paiement couvre
  **5 directives** ; au-delà il faut **repayer**, et le lot suivant coûte un cran de plus
  ($250k, $500k, $750k…). Remplacer une directive existante ne consomme pas de place.
- **Addendum — datacenter IA orbital** (2030-2040), l’offre piège : 18 mois de chantier,
  6 mois de retard… puis la faillite du consortium, et six mois plus tard l’affaire est
  classée — la ligne disparaît.
- **Cinématique de fin** (aussi accessible par **Ctrl+Shift+E**) : l’écran se désintègre pixel
  par pixel, hyperespace (chaque étoile trace sa trajectoire complète), scroller sinusoïdal
  multicolore façon démo 64k, musique 8-bit (WebAudio) et clin d’œil « Nostalgia of 64k demos ».
  Puis fondu au noir : « Play again » (qui fuit la souris et se transforme en « Get a life ;-) »)
  et « Get a life » — les deux tentent de fermer la fenêtre.
- **Hors-ligne** : progression simulée à 50 % (charges suspendues) avec résumé au retour ;
  aucun événement ne s'affiche pendant les 25 premières secondes.
- **Mobile** : une seule colonne, modales larges, cibles tactiles ≥ 48 px.
- **Export / import** de sauvegarde (fichier JSON) depuis l'aide (bouton **?**).

## Événements — des décisions, tout le temps

**40+ événements datés** inspirés de faits réels, avec deux choix aux conséquences durables :
pénurie de GPU H100 · choc DeepSeek (−17 % NVIDIA) · procès copyright · EU AI Act ·
saturation du réseau (SMR nucléaire) · flambée de la mémoire HBM · moratoire local sur les
datacenters · pression pour l'ouverture des poids · contrat de cloud souverain · colère après
une mise hors service · dommage causé par un agent autonome · droits de douane sur les
accélérateurs · débauchage à neuf chiffres · pannes · jailbreaks · model collapse · guerre des
prix « mini » · embargo sur les puces · tentatives d'arrêt de l'AGI · promesse du
sanctuaire reposée à 85 % de la Terre consommée · IA rivales · mort thermique…

## 🚨 Incidents — la boîte qu'il faut trouver

Douze **crises** (exfiltration de données, incendie en salle, blocage militant, fibre
sectionnée, réacteur hors de contrôle, rançongiciel, fuite de liquide de refroidissement,
fraude massive sur l'API, canicule, empoisonnement du corpus, vol de GPU, délestage réseau)
surgissent **sans la moindre notification**. La boîte d'alerte — bordure rouge, **halo qui
grossit et bat de plus en plus vite** — est posée **au hasard dans la page, de préférence hors
du champ de vision**. Tant qu'elle n'est pas trouvée, la trésorerie fond de plus en plus vite :
**jusqu'à 70 % de la fortune en 2 minutes**. Seul indice : le liseré rouge qui s'intensifie sur
les bords de l'écran. Passé 2 minutes, l'incident se résorbe seul — le mal est fait. Chaque
crise a son **bouton de remédiation** qui explique la solution (couper l'accès et durcir,
mobiliser les pompiers et redonder l'extinction, SCRAM et inspection…) et son coût.

## 😴 Douze manifestations contre l'inactivité

Passé **15 secondes sans interaction**, l'écran se rappelle à vous : clignement, moirés
sombres, pluie de glyphes façon Matrix, polygones filaires, balayage cathodique, décrochage
RVB, vague de particules, onde de choc, inversion brève, pluie de tokens, tunnel vectoriel,
grille synthwave. Chacune dure **moins de 5 secondes**, n'intercepte jamais un clic, et le
tirage est **sans remise** : les douze passent avant qu'une seule revienne. La presse s'en
mêle aussi. `prefers-reduced-motion` désactive les animations au profit des seuls titres.

## Tech

100 % statique, **vanilla JavaScript (modules ES)**, aucune dépendance, aucun build.

```
index.html        structure & panneaux
styles.css        thème « salle de contrôle IA », responsive, accents évoluant par phase
js/data.js        contenu : modèles, GPU, hébergement, énergie, équipe, événements, crises,
                  inflation, délais de chantier, animations d'inactivité, succès
js/game.js        moteur : économie, inflation, chantiers, crises, phases, sauvegarde versionnée
js/ui.js          rendu & interactions (sparkline, boîte de crise, modales accessibles, export/import)
js/fx.js          les douze manifestations d'inactivité (canevas plein écran, non cliquable)
js/i18n.js        détection de langue, traduction, échelles de nombres localisées
js/locales/*.js   les sept dictionnaires (générés par tools/build-locale.mjs)
tools/strings.mjs inventaire des chaînes, extrait du code — source unique de vérité
js/ending.js      cinématique finale (désintégration, hyperespace, scroller, musique 8-bit)
js/util.js        formatage des grands nombres (jusqu'à 10⁶⁰ et au-delà), puissances kW→TW
js/main.js        boucle de jeu, vitesse, autosave
```

### Tests & CI

```bash
node test-sim.mjs    # partie complète en headless (équilibrage, NaN, code de sortie CI)
node test-ui.mjs     # test de fumée de l'UI réelle via jsdom (35+ étapes)
```

Le déploiement GitHub Pages (`.github/workflows/pages.yml`) **exécute ces tests avant de
publier** : un commit qui casse la partie ne part pas en production.

---

*Inspiré de « Universal Paperclips » de Frank Lantz. Données IA basées sur des faits publics 2019-2026.*
