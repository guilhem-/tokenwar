# 🪙 TokenWar — Le Jeu du Token

Un jeu incrémental (« idle / clicker ») dans l'esprit de **Universal Paperclips**, mais où
l'on ne fabrique pas des trombones : on **produit le plus de tokens possible**.

De votre première inférence sur un GPU de gamer jusqu'à la **conversion de l'univers entier
en calcul** — et le **nouveau Big Bang** qui s'ensuit — vous pilotez un laboratoire d'IA à
travers toute l'histoire (réelle puis spéculative) des grands modèles de langage.

> 🎮 **Jouer :** https://tokenwar.bonnafous.org
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

**1 053 chaînes × 7 langues = 7 371 traductions**, vérifiées par `test-i18n.mjs` avant tout
déploiement : couverture complète, aucune traduction vide, substitutions `{0}` préservées,
aucune clé orpheline, et aucune écriture étrangère glissée dans une langue.
`tools/strings.mjs` **extrait l'inventaire du code lui-même** (données
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
- **On part de rien** : **$30 000** de capital, **aucun serveur, aucune baie**, et surtout
  **0 kW** — pas le moindre raccordement électrique. Le premier geste n'est pas d'acheter un
  GPU, c'est d'aller chercher du courant, puis de quoi le loger. Une actualité — la
  *subvention énergie pour les jeunes pousses* — donne un vrai coup de pouce (les titres de
  presse ne font pas que commenter : certains débloquent quelque chose).
- **Sous-effectif = incidents** : une équipe déséquilibrée se paie. Moins de **10 % d'Ops/SRE**
  et, chaque année après l'introduction en bourse, **20 % de risque de perdre 15 % de la
  valorisation** — fuite de données, secret industriel dans la nature, entraînement en cours
  annulé… Moins de **20 % de Data engineers** et chaque entraînement de modèle porte **5 % de
  risque d'échec** — hallucinations, résultats désalignés, précision qui plafonne, corpus
  empoisonné. **Vingt titres de presse** couvrent ces deux familles, un seul à la fois, jamais
  deux fois le même tant qu'il reste des inédits.
- **Charges journalières** affichées et prélevées en continu, ventilées par nature.
- **Tokens invendus = perdus** : la production doit suivre la demande, pas l'inverse.
- **Bourse** (débloquée à $100k) : trois profils de risque, mouvement brownien géométrique.
  Un **indice de marché** vit indépendamment de vos positions et alimente un **graphe** —
  le même tirage aléatoire anime l'indice tracé et votre portefeuille, si bien que la courbe
  affichée est exactement celle que vous subissez. La **ligne pointillée** marque votre niveau
  d'entrée : l'aire entre la courbe et cette ligne *est* votre plus- ou moins-value, et elle se
  teinte en vert ou en rouge. Le niveau d'entrée n'est pas stocké — il se déduit des valeurs
  déjà calculées (`indice × mise / valeur`), donc il ne peut pas se désynchroniser.

## 🔬 Grands programmes — rien ne s'achète sur étagère

La **fusion** et la **sphère de Dyson** ne sont pas des lignes de catalogue : elles traversent
**recherche → mise au point → disponibilité → commande → déploiement**, et **chaque étape est
couverte par la presse**. Les phases d'étude s'enchaînent seules ; seule la commande demande
une décision — et un paiement.

- **Programme de fusion** (à partir de 2026) : confinement inertiel puis tokamak compact.
  **Sans programme abouti, aucun réacteur à fusion n'est achetable** — le déblocage ne vient
  plus de la date mais de ce que vous avez mené à terme. Payé en dollars et en recherche ;
  l'ignition met 20 GW sur le réseau. La Une suit aussi l'actualité réelle : le seuil franchi
  au laser, le record du tokamak européen, les dix ans de retard du réacteur international,
  les milliards levés sur une promesse, la pénurie de tritium.
- **Sphère de Dyson** (étudiée dès que la moitié de la Terre est consommée, commandable en
  phase 3) : payée en **matière** — une masse solaire de matériaux — **répétable**, chaque
  exemplaire coûtant six fois plus cher que le précédent, et **+35 % de récolte** cumulatifs
  jusqu'à ×3. C'est enfin un objectif, plus un décor : l'ancien « Collecteur Dyson » libellé
  en dollars, dans une phase où l'argent est masqué et où l'énergie n'est plus une contrainte,
  ne servait à rien.

## ₿ Crypto — un marché qui vous prend vos cartes

Un second marché, bien plus violent que la Bourse, calé sur les **vrais cycles** : bulle 2017,
hiver 2018, envolée 2021, effondrement 2022, ETF au comptant et halving 2024. Il se débloque
dès **$25 000** de trésorerie.

Il ne sert pas qu'à parier. Pendant les envolées, **les mineurs se disputent les mêmes cartes
que vous** : le prix des GPU monte de **45 % en 2021**, exactement comme dans la réalité. Le
panneau affiche l'effet en cours, et la presse raconte le cycle — de la ruée sur les cartes
graphiques aux fermes de minage reconverties en datacenters d'IA.

## 🌍 La chronique — le monde se dégrade avec vous

Chaque année, la presse publie **les chiffres du monde**, à échéance fixe et hors du tirage
aléatoire : réchauffement (**tous les ans**), banquise et biodiversité (**tous les 2 ans**),
fécondité et population (**tous les 3 ans à partir de 2030**), concentration des richesses et
extravagances de milliardaires (**tous les 4 ans**).

Ils ne sont pas décoratifs. Les trajectoires partent du réel — +1,1 °C en 2020, ~69 % des
populations suivies disparues depuis 1970, fécondité mondiale sous le seuil de renouvellement —
puis **s'aggravent d'autant plus vite que votre exploitation est lourde**. À 2040, une partie
sage lit *+1,54 °C* ; la même année avec 200 GW de datacenters et 40 % de la Terre convertie
affiche *+2,34 °C*, 67 % de banquise perdue et 88 % d'espèces disparues. Vous lisez votre
propre partie. Un seul texte traduit sert quatre-vingts années, grâce aux substitutions.

## ⚠️ Catastrophes, démentis et couloirs

**Douze catastrophes liées à l'IA**, dont la gravité ne se débloque qu'avec votre niveau de
modèle : diagnostic erroné, tri automatique privant des familles d'aides, deepfake qui fait
plonger les marchés, agent autonome qui vide un entrepôt, drones qui ouvrent le feu sans ordre.
Suivies des **communiqués rassurants** qui arrivent toujours après : « un cas isolé »,
« c'est résolu », « nos garde-fous ont parfaitement fonctionné », et six mois plus tard aucune
des mesures promises n'a été prise.

**Douze articles sur les hyperscaleurs et les États** : lobbying record contre la régulation,
texte européen vidé de sa substance, exonération de taxe foncière sur trente ans, menace de
délocalisation qui enterre une taxe sur l'IA, ancien ministre au conseil d'administration.

## 🏛️ Racheter un pays

Au-delà de **4 000 milliards** de trésorerie, une offre apparaît dans l'Addendum : racheter la
**dette souveraine** d'un pays surendetté pour **2 000 milliards**. Il passe sous votre tutelle
et **cent datacenters** y sont bâtis (avec l'immobilier qui va avec) — au prix de 20 points de
réputation. La presse suit le feuilleton : l'offre, le rachat historique, les cent datacenters
annoncés, les manifestations (« nous ne sommes pas un serveur »), puis l'ONU qui se demande si
un État peut appartenir à une entreprise.

## 🗺️ La carte de l'univers

En phase 3, un champ de **320 galaxies** disposées en spirale d'or. Chacune **vire au bleu**
quand la conversion atteint son rang, du centre vers le bord, avec un halo pour les régions
déjà transformées en énergie. La disposition est **déterministe** : la même partie donne
toujours la même carte.

## Confort de jeu

- **Automatisations** achetables : auto-inférence, auto-achat **GPU**, auto-achat **matériel**
  (baies et serveurs) et auto-achat **immobilier** (bâtiments et datacenters) — deux métiers
  distincts, deux cartes distinctes, parce qu'on ne veut pas laisser un robot commander un
  immeuble pour caser un serveur. Chaque automatisation vise **l'élément coché ⟳** (carte
  précise, source précise, niveau d'infra précis) et s'active/désactive à la volée.
  À chaque achat automatique, **la carte pulse et la ligne concernée s'illumine** : on voit
  ce que la machine fait en son nom.
- **Une carte d'automatisation n'apparaît qu'après 50 clics** sur ce qu'elle automatise. On
  n'automatise que ce qu'on a réellement fait à la main — et l'interface reste vide de boutons
  dont on ne comprend pas encore l'usage.
- **Achats groupés** : ×10 dès 20 exemplaires en service, ×100 dès 200.
- **Un chantier de recherche à la fois** : projets et percées se présentent **un par un**, et
  il s'écoule **au moins 2 mois de jeu** entre la disparition de l'un et l'apparition du
  suivant. Le panneau cesse d'être une liste de courses ; chaque décision a le temps de compter.
- **Rien n'est acquis le jour où c'est payé** : une percée comme une optimisation demande
  **1 à 4 semaines d'intégration**, tirées au hasard et suivies par une **barre de
  progression**. L'effet ne tombe qu'à la fin — et c'est de là que partent les 2 mois.
- **Optimisations récurrentes** : le travail d'ingénierie ne s'arrête jamais. Une
  optimisation **CUDA tous les 18 mois** (+10% compute), une du **moteur d'inférence
  tous les 9 mois** (+6% compute, −2% énergie), une passe sur la **gestion du contexte
  tous les 12 mois** (+5% prix accepté). $1 000 pièce : le montant est négligeable,
  l'enjeu est d'y penser. **Une seule est proposée à la fois**, comme les percées.
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
node test-ui.mjs     # test de fumée de l'UI réelle via jsdom (40+ étapes)
node test-i18n.mjs   # couverture des 7 langues, substitutions, écritures
```

`.github/workflows/tests.yml` rejoue ces trois suites à chaque push et sur les pull requests.

### Déploiement

**Le dépôt ne déploie rien.** Pousser sur git ne met pas le jeu en ligne — la mise en ligne
est un geste manuel, depuis le poste de l'auteur :

```bash
tools/deploy.sh              # tests complets, puis rsync vers le serveur
tools/deploy.sh --dry-run    # montre ce qui changerait, ne transfère rien
```

Le script refuse d'envoyer quoi que ce soit si un test échoue, et n'expédie qu'une **liste
explicite** de fichiers (`index.html`, `styles.css`, `js/`) — jamais les tests, les outils ou
`node_modules`. La destination vit dans `tools/deploy.conf`, ignoré par git. Détails,
prérequis serveur et la question des sauvegardes `localStorage` qui **ne suivent pas** un
changement de domaine : [`DEPLOIEMENT.md`](DEPLOIEMENT.md).

---

*Inspiré de « Universal Paperclips » de Frank Lantz. Données IA basées sur des faits publics 2019-2026.*
