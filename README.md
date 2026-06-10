# 🪙 TokenWar — Le Jeu du Token

Un jeu incrémental (« idle / clicker ») dans l'esprit de **Universal Paperclips**, mais où
l'on ne fabrique pas des trombones : on **produit le plus de tokens possible**.

De votre première inférence sur un GPU de gamer jusqu'à la **conversion de l'univers entier
en calcul** — et le **nouveau Big Bang** qui s'ensuit — vous pilotez un laboratoire d'IA à
travers toute l'histoire (réelle puis spéculative) des grands modèles de langage.

> 🎮 **Jouer :** https://guilhem-.github.io/tokenwar/
> ⏱️ Terminable en moins de 4 h. Sauvegarde automatique (locale).

## Le concept

Un seul but : **maximiser les tokens produits**. Pour y arriver, vous traversez quatre ères.

| Phase | Ère | Vous gérez… |
|------|-----|-------------|
| 1 | **Startup** | Génération manuelle, prix ↔ demande, GPU, énergie (plafond dur !), entraînement des modèles (GPT‑2 → ASI), marketing, levées de fonds, projets. |
| 2 | **Autonomie / AGI** | Auto‑amélioration récursive, allocation du compute (Service / Recherche / Auto‑amélioration / Récolte), conversion de la **matière terrestre** en calcul. |
| 3 | **Cosmos** | Sondes de von Neumann auto‑réplicantes, consommation du système solaire → galaxie → **univers observable**. |
| 4 | **Big Bang** | Singularité de recompression : tout converge, l'espace‑temps se replie, un nouvel univers naît (New Game +). |

## Des décisions, tout le temps

Le jeu vous tient occupé : tarification (volume vs marge), achat et équilibrage
**GPU / énergie**, R&D, allocation du compute, et un flux constant d'**événements** inspirés
de faits réels ou plausibles avec deux choix aux conséquences durables :

> pénurie de GPU H100 · choc DeepSeek (‑17 % NVIDIA) · procès copyright · EU AI Act ·
> saturation du réseau électrique (SMR nucléaire) · pannes · jailbreaks · model collapse ·
> guerre des prix « mini » · embargo sur les puces · tentatives d'arrêt de l'AGI ·
> dérive d'alignement · IA rivales (« drifters ») · mort thermique… (30+ événements)

## Ancré dans le réel

Les prix, modèles et matériels reflètent l'évolution **2019 → 2026** :

- **LLMflation** : le coût par token à capacité égale chute d'environ **×10 par an**
  (GPT‑3 à 60 $/Mtok en 2020 → ~0,06 $/Mtok ~3 ans plus tard).
- Modèles : GPT‑2 → GPT‑3 → GPT‑3.5/RLHF → GPT‑4 (multimodal) → GPT‑4o → o1 (raisonnement)
  → modèle frontière (agents) → ASI.
- Matériel : RTX → V100 → A100 → **H100** (pénurie) → B200 (Blackwell) → rack GB200 → TPU → wafer‑scale.
- Énergie : réseau → solaire → gaz → **SMR nucléaire** → fusion → collecteur Dyson.

## Tech

100 % statique, **vanilla JavaScript (modules ES)**, aucune dépendance, aucun build —
publiable tel quel sur GitHub Pages.

```
index.html        structure & panneaux
styles.css        thème « salle de contrôle IA », responsive, accents néon évolutifs par phase
js/data.js        contenu : modèles, GPU, énergie, projets, 30+ événements
js/game.js        moteur : économie, production, phases, événements, sauvegarde
js/ui.js          rendu & interactions
js/util.js        formatage des grands nombres (jusqu'à 10⁶⁰ et au‑delà)
js/main.js        boucle de jeu, vitesse, autosave
```

### Tests

Deux harnais de validation (Node) servent à équilibrer et à fiabiliser le jeu :

```bash
node test-sim.mjs    # simulation headless d'une partie complète (équilibrage, NaN, durée des phases)
node test-ui.mjs     # test de fumée de l'UI réelle via jsdom (rendu, boutons, modales, fin)
```

## Astuces

- Le bouton **⏩** accélère la simulation (x1 → x10) pour compresser les temps morts.
- En phase 1, baissez le **prix** pour vendre plus de volume, montez‑le pour la marge — tant que
  la **demande** absorbe votre production (sinon, faites du marketing).
- L'**énergie** est un plafond dur : sans MW suffisants, votre production est étranglée.
- Gardez du capital pour **entraîner le modèle suivant** : c'est le vrai moteur de croissance.

---

*Inspiré de « Universal Paperclips » de Frank Lantz. Données IA basées sur des faits publics 2019‑2026.*
