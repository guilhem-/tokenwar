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

**1 159 chaînes × 7 langues = 8 113 traductions**, vérifiées par `test-i18n.mjs` avant tout
déploiement : couverture complète, aucune traduction vide, substitutions `{0}` préservées,
aucune clé orpheline, et aucune écriture étrangère glissée dans une langue.
`tools/strings.mjs` **extrait l'inventaire du code lui-même** (données
de jeu, appels `t()`, attributs `data-i18n`) — ajouter une chaîne la rend automatiquement
obligatoire partout. Une langue n'est proposée que lorsque son fichier est complet.

Un test attrape la fuite la plus sournoise : la chaîne **assemblée en dur dans le code**, qui
n'entre jamais dans l'inventaire et s'affiche donc en français dans *toutes* les langues.
C'est ainsi qu'un « /j d'abonnement » se lisait en anglais. Le critère n'est pas « cette
chaîne est française » — les données de jeu le sont toutes, et c'est normal — mais « elle est
française **et** absente de l'inventaire », donc rien ne la traduira jamais. Deux filets : les
caractères accentués, et une liste de mots que ni l'anglais, ni l'espagnol, ni le portugais ne
partagent (pour attraper « par seconde », qui ne porte aucun accent). Les suffixes d'unités y
sont passés : `/j` devient `/d`, `/T`, `/日`, `/일` selon la langue.

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
- **Flambée mémoire 2025-2026** : le prix des serveurs bondit de $25k à $45k.
- **Délais de mise en service** : rien n'est instantané. Toute commande part en **chantier**
  pour une durée croissant avec sa **complexité** (`base + k·log₁₀(prix)`) — quelques secondes
  pour une carte gamer, un mois de simulation pour un datacenter, plusieurs pour un SMR.
  L'emplacement parent est réservé dès la commande — **et revérifié à la livraison**. Si la
  place a disparu entre-temps (datacenter loué rendu, colocation résiliée), la mise en service
  est **refusée et la commande remboursée au centime payé**, inflation comprise. Le parc ne
  peut donc jamais dépasser sa capacité d'hébergement : plus de cartes logées nulle part.
- **Énergie — trois natures de coût bien séparées** : le **capex** (unique, à la commande,
  ancré sur le $/kW réel — voir plus bas), l'**exploitation O&M** (fixe, journalier, dû même à
  l'arrêt : $100 000/j pour un SMR de 300 MW, soit $122/kW/an),
  le **combustible** (variable, au MWh soutiré : gaz $70/MWh, réseau $78, solaire $0) et
  l'**abonnement réseau** proportionnel à la **puissance souscrite** ($60/MW/jour).
  Le mix est servi en **ordre de mérite** (le moins cher d'abord).
- **Inflation simulée** (taux annuels calqués sur le CPI réel : 8 % en 2022…) : prix,
  salaires, loyers, énergie et tarifs acceptés par le marché suivent l'indice — **mais pas
  votre trésorerie**. Dormir sur son cash coûte du pouvoir d'achat.
- **Équipe** : les RH ouvrent des postes, les ingénieurs R&D débloquent l'entraînement des
  modèles, les marketeurs relèvent le plafond marketing, Ops et Data boostent le parc.
  Les RH occupent eux-mêmes un poste : mal doser son effectif peut bloquer le modèle suivant.
  Chaque **embauche coûte $5 000** (annonce, entretiens, poste de travail, intégration).
- **Salaires impayés** : trésorerie à zéro = salaires non versés. Un compteur d'arriérés
  s'affiche, et au bout de **30 jours** quelqu'un **démissionne** — puis un départ tous les
  2 jours, jusqu'à l'entreprise vide. Repayez avant, et l'équipe reste.
- **On part de rien** : **$50 000** de capital, **aucun serveur, aucune baie**, et surtout
  **0 kW** — pas le moindre raccordement électrique. Le premier geste n'est pas d'acheter un
  GPU, c'est d'aller chercher du courant, puis de quoi le loger. Un raccordement réseau, c'est
  **10 kW** : la puissance d'un branchement, pas d'une centrale. Le bâtiment et sa salle en
  consomment déjà 25 — il en faut trois avant même d'avoir allumé une carte, et il faudra
  passer au solaire pour aller plus loin. Une actualité — la
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
- **Dette** : dix instruments réels, du crédit corporate senior à 5,1 % au prêt de sauvetage à
  14 %, en passant par la ligne revolving, les obligations institutionnelles, la mezzanine à
  intérêts capitalisés et la convertible qui dilue. Chacun a sa mécanique — *bullet*,
  amortissement linéaire, deux ans de grâce, 20 % du capital par an — et son piège.
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

## 💵 Les prix sont ceux du monde réel

Chaque valeur chiffrée du jeu est ancrée sur une référence publique, et un audit complet a
corrigé celles qui ne l'étaient pas.

**L'énergie était offerte.** Une ferme solaire de 3 MW coûtait $1 500 — soit **$0,50 par kW
installé**, deux mille fois moins que la réalité. Conséquence mesurée sur une partie complète :
le joueur dépensait **$1 500 d'électricité en toute la phase 1** et terminait avec 22 GW.
Le capex est désormais calé sur le coût réel au kilowatt, et le multiplicateur de rareté
abaissé en conséquence — c'est le prix de départ qui porte le poids, plus une escalade
artificielle.

| Source | Puissance | Capex | $/kW | Référence réelle |
|---|---:|---:|---:|---:|
| Raccordement réseau | 10 kW | $1 500 | 150 | branchement industriel |
| Ferme solaire + batteries | 3 MW | $3,9 M | 1 300 | ~$1 000/kW + stockage |
| Centrale gaz dédiée | 25 MW | $22,5 M | 900 | turbine à cycle ouvert |
| SMR nucléaire | 300 MW | $1,95 Md | 6 500 | petit réacteur modulaire |
| Réacteur à fusion | 5 GW | $75 Md | 15 000 | tête de série |

Les coûts d'exploitation suivent la même règle, en $/kW/an : solaire 18, gaz 25, nucléaire 122,
fusion 102. Le **programme de fusion** livrait 20 GW pour $40 M — $2 le kW installé, moins cher
que le raccordement d'un pavillon. Il coûte maintenant **$22 milliards**, l'ordre de grandeur
d'ITER, et livre **une tranche de tête de 5 GW** : ce qu'il débloque vraiment, c'est le droit
d'en construire d'autres.

**L'hébergement se contredisait.** Un datacenter s'achetait $20 000 et se louait $800/jour :
l'achat était remboursé en **25 jours**, ce qui rendait la location absurde. Et louer une salle
entière coûtait $100 par baie et par jour quand la colocation au détail en demandait $40 — le
gros était plus cher que le détail.

La référence du métier est le coût **au mégawatt informatique** : $7 à 12 M/MW tout compris pour
un datacenter neuf. Le bâtiment du jeu accueille 4 salles × 8 baies × 12 serveurs × 8 cartes =
**3 072 GPU, soit ~1,5 MW**. Il coûte donc $4,5 M de gros œuvre et de terrain, chaque salle
$2,6 M d'aménagement (froid, onduleurs, distribution, sécurité) — **$9,9 M/MW tout compris**,
au milieu de la fourchette. La location d'une salle suit le tarif de colocation réel
(~$175/kW/mois) avec la remise de gros qui va avec : **$213 la baie et par jour contre $233 au
détail**, et l'achat s'amortit en **4,2 ans**. Un châssis 8 GPU passe de $8 000 à $25 000, son
vrai prix nu.

**Les salaires étaient sous-évalués de moitié.** Un chercheur en IA coûtait $146 k par an à son
employeur ; il en coûte le double. Les cinq métiers sont recalés sur le coût employeur réel :
RH $120 k, R&D $299 k, marketing $131 k, SRE $201 k, data engineer $175 k. Le coût par
recrutement passe de $1 000 à $5 000 — annonce, entretiens, poste de travail, intégration.

**Les caractéristiques matérielles** ont été revérifiées une à une : RTX 5090 à 575 W (et non
650), GTX grand public à 200 W, A100 80 Go à $15 000. Prix de catalogue et TDP constructeur.

**Les entraînements ne coûtaient rien non plus.** GPT-4 se formait pour $200 000 quand le vrai
a dépassé les $100 M. Les douze paliers suivent désormais les ordres de grandeur publiés, et
surtout ils **mordent** : à la sortie de GPT-4, une partie type a $45,9 M en caisse et
l'entraînement en demande $40 M. C'est une décision, plus une ligne qu'on coche.

| Palier | Année | Avant | Après | Trésorerie à cette date |
|---|---:|---:|---:|---:|
| GPT-3 | 2020 | $300 | $25 k | $68 k déjà dépensés |
| GPT-3.5 / ChatGPT | 2022 | $6 k | $2 M | $6,7 M |
| GPT-4 | 2023 | $200 k | $40 M | $45,9 M |
| GPT-4o | 2024 | $8 M | $120 M | $2,2 Md |
| o1 — raisonnement | 2024 | $200 M | $400 M | $2,2 Md |
| Frontière 2025 | 2025 | $3 Md | $4 Md | $25,3 Md |
| Frontière 2026 | 2026 | $8 Md | $12 Md | $280,8 Md |
| Mémoire persistante | 2027 | $14 Md | $25 Md | $10,3 B |
| Modèle du monde | 2028 | $20 Md | $45 Md | $73,7 B |
| Essaim d'agents | 2029 | $28 Md | $90 Md | $329,7 B |
| Super-intelligence | 2030 | $40 Md | $200 Md | $830,4 B |

**Les deux premiers paliers restent volontairement sous le réel.** GPT-3 a coûté ~$4,6 M à
OpenAI ; en 2020 vous avez quelques milliers de dollars en caisse. Ce sont *vos* modèles, à
votre échelle, pas les leurs — la courbe rejoint le réel dès que l'entreprise en a les moyens,
c'est-à-dire dès GPT-3.5.

Tout cela a été vérifié en rejouant une partie complète après chaque correction : **83,8 min,
super-intelligence atteinte, transitions de phase inchangées**.

## 🏦 La dette — et pourquoi la banque ne perd jamais

Dix instruments, tirés de ce qui existe vraiment : crédit corporate senior, ligne revolving,
prêt d'expansion amorti au trimestre, obligations institutionnelles à dix ans, dette
high-yield, prêt garanti par actifs, financement infrastructure sur quinze ans avec deux ans
de grâce, mezzanine à intérêts capitalisés, convertible, et le crédit de sauvetage à 14 % qui
n'apparaît **que lorsque ça va mal**. Trois d'entre eux exigent une **société cotée**.

L'affichage est volontairement maigre — nom, montant, taux. **Le détail vit dans une boîte qui
s'ouvre au survol** : prêteur, durée, mécanique de remboursement, et surtout le **coût total du
crédit**, le seul chiffre qui permette de comparer un 4,8 % amorti dès le premier trimestre à
un 5,9 % payé in fine. Chaque prêt en cours affiche **sa prochaine échéance et son montant**,
et porte ses propres boutons : tirer, rembourser la moitié, solder.

La règle qui gouverne tout le système : **la banque ne perd jamais, et le capital revient.**
Elle tient en deux moitiés. D'abord, les montants sont libellés en **dollars constants**, comme
tous les prix du jeu — le taux affiché est donc un taux *réel*. Sans cela, une dette à 6 % sur
quinze ans face à une inflation qui atteint 8 % en 2022 aurait été de l'argent gratuit, et
emprunter au maximum aurait été la stratégie dominante. Ensuite, à l'échéance, **si la
trésorerie ne suffit pas, les actifs sont saisis** : les cartes d'abord, puis l'infrastructure.
Ce qui reste dû après la saisie ne s'efface pas — il s'ajoute au capital et continue de porter
intérêt. Au passage en phase 2, où l'argent cesse d'exister, tout est soldé avant.

C'est vérifié, pas espéré : un test rejoue chacun des dix prêts sur toute sa durée et calcule
le **taux de rendement interne** des flux vus par le prêteur. Aucun ne descend sous son taux
affiché.

| Instrument | Taux | Durée | TRI réel mesuré |
|---|---:|---:|---:|
| Prêt garanti par actifs | 4,3 % | 6 ans | 4,39 % |
| Prêt d'expansion | 4,8 % | 7 ans | 4,89 % |
| Crédit corporate senior | 5,1 % | 5 ans | 5,20 % |
| Ligne revolving | 5,6 % | 4 ans | 5,72 % |
| Obligations institutionnelles | 5,9 % | 10 ans | 5,99 % |
| Financement infrastructure | 6,0 % | 15 ans | 6,09 % |
| Dette high-yield | 9,2 % | 5 ans | 9,41 % |
| Prêt mezzanine | 11,5 % | 6 ans | 11,50 % |
| Crédit de sauvetage | 14,0 % | 3 ans | 14,75 % |
| Dette convertible | 3,5 % | 5 ans | 3,50 % + dilution |

L'écart au-dessus du taux affiché n'est pas une erreur : c'est la capitalisation périodique.
Un 5,1 % payé chaque trimestre rend 5,20 % sur l'année.

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
- **Achats groupés** : ×10 dès 20 exemplaires en service, ×100 dès 200. La **revente** suit
  les mêmes paliers : à l'unité, **×10 au-delà de 10 cartes**, **tout revendre au-delà de 100**.
  Liquider un parc de 300 RTX obsolètes ne demande plus trois cents clics.
- **La cadence des automatisations est découplée du bouton ⏩.** En ×10 le temps va dix fois
  plus vite, les automatisations seulement **trois** fois : ×1 ×2 ×5 ×10 de vitesse donnent
  ×1 ×1,5 ×2 ×3 d'automatisation. Accélérer aide toujours, mais ne transforme plus la vitesse
  en multiplicateur gratuit — et les cartes cessent de clignoter en stroboscope.
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
- **Raccourcis clavier.** **Espace** passe à la vitesse suivante ; **F** gèle la partie et la
  relâche exactement à la vitesse qu'elle avait — geler ne coûte pas le réglage qu'on avait
  choisi. Gelé, le temps s'arrête net mais l'interface reste vivante : on lit, on compare, on
  achète, une fine bordure froide rappelle l'état. Côté achats : **G** commande la meilleure
  carte qu'on puisse à la fois s'offrir *et* loger, **H** le niveau d'hébergement qui manque
  réellement (en remontant serveur → baie → datacenter → immobilier), **B** la percée proposée,
  **M** un cran de marketing. La ligne achetée clignote : un raccourci n'est jamais une action
  invisible. Rien n'est intercepté dans un champ de saisie ni sous Ctrl.
- **Chiffres exacts au survol** : l'en-tête abrège (`12,4 Md`) parce que ça se lit vite, mais
  survoler un chiffre en donne **toutes les décimales**, groupées selon la langue. Au-delà de
  quinze chiffres significatifs les zéros sont explicites plutôt que menteurs — un `double` ne
  code pas au-delà, et `1e60` ne s'affiche pas en `999 999 …949 387`.
- **Graphe de production** (tokens/s et $/s, échelle log).
- **17 succès** à débloquer, écran de fin avec bilan moral (le sanctuaire de la biosphère…).
- **Addendum — Directives permanentes** : cochez un choix d’événement pour qu’il s’applique
  automatiquement les fois suivantes (plus d’interruption). Elles s’achètent **une par une, au
  prix du moment** — $250k, puis $500k, puis $750k… — et le total est **plafonné au nombre
  d’événements qui portent réellement un choix** : au-delà il n’y aurait plus rien à mémoriser,
  la ligne cesse de se vendre. Remplacer une directive existante ne consomme pas de place.
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

Le site est publié sur **GitHub Pages** à chaque poussée, par
`.github/workflows/pages.yml` — mais le job `deploy` **dépend** du job `test` : si l'une des
trois suites échoue, rien ne part et la version en ligne reste celle d'avant. Une pull request
passe les tests sans publier. Le job n'expédie qu'une **liste explicite** de fichiers
(`index.html`, `styles.css`, `js/`), jamais les tests ni les outils.

Détails, bascule vers un domaine personnalisé et déploiement manuel vers un serveur à soi :
[`DEPLOIEMENT.md`](DEPLOIEMENT.md).


---

*Inspiré de « Universal Paperclips » de Frank Lantz. Données IA basées sur des faits publics 2019-2026.*
