# 🪙 TokenWar — Le Jeu du Token

Un jeu incrémental (« idle / clicker ») dans l'esprit de **Universal Paperclips**, mais où
l'on ne fabrique pas des trombones : on **produit le plus de tokens possible**.

De votre première inférence sur un GPU de gamer jusqu'à la **conversion de l'univers entier
en calcul** — et le **nouveau Big Bang** qui s'ensuit — vous pilotez un laboratoire d'IA à
travers toute l'histoire (réelle puis spéculative) des grands modèles de langage.

> 🎮 **Jouer :** https://guilhem-.github.io/tokenwar/
> ⏱️ Terminable en moins de 4 h. Sauvegarde automatique locale + export/import.

## Le concept

Un seul but : **maximiser les tokens produits**. Pour y arriver, vous traversez quatre ères.

| Phase | Ère | Vous gérez… |
|------|-----|-------------|
| 1 | **Startup** | Prix ↔ demande, marketing, GPU, hébergement, énergie, équipe, charges, R&D, levées de fonds, bourse, événements. |
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

## Une économie réaliste

- **Prix fixes et réels** : RTX 3090 ~$1 500, RTX 5090 ~$2 000, H100 ~$30k, B200 ~$40k,
  rack GB200 NVL72 ~$3 M… puis du matériel inventé jusqu'en **2100** (photonique,
  neuromorphique, supraconducteur, quantique-hybride, énergie du vide).
- **Chaîne d'hébergement** : un GPU tient dans un *serveur* → *baie* → *datacenter* →
  *immobilier*. Achat, **location de datacenter** ou **colocation** au coût journalier.
- **Flambée mémoire 2025-2026** : le prix des serveurs bondit de $8k à $22k.
- **Énergie** : plafond dur de production, avec un **mix à coût marginal** (merit order) —
  solaire $5/MWh, nucléaire $20, gaz $70, réseau $120… jusqu'au collecteur Dyson gratuit.
- **Équipe** : les RH ouvrent des postes, les ingénieurs R&D débloquent l'entraînement des
  modèles, les marketeurs relèvent le plafond marketing, Ops et Data boostent le parc.
- **Charges journalières** affichées et prélevées en continu : électricité + salaires + loyers.
- **Tokens invendus = perdus** : la production doit suivre la demande, pas l'inverse.
- **Bourse** (débloquée à $100k) : trois profils de risque, mouvement brownien géométrique.

## Confort de jeu

- **Automatisations** achetables : auto-inférence, auto-achat **par élément coché ⟳**
  (carte précise, source précise, niveau d'infra précis), activables/désactivables.
- **Achats groupés** : ×10 dès 20 exemplaires possédés, ×100 dès 200.
- **Graphe de production** (tokens/s et $/s, échelle log).
- **16 succès** à débloquer, écran de fin avec bilan moral (le sanctuaire de la biosphère…).
- **Hors-ligne** : progression simulée à 50 % (charges suspendues) avec résumé au retour ;
  aucun événement ne s'affiche pendant les 25 premières secondes.
- **Mobile** : une seule colonne, modales larges, cibles tactiles ≥ 48 px.
- **Export / import** de sauvegarde (fichier JSON) depuis l'aide (bouton **?**).

## Événements — des décisions, tout le temps

30+ événements datés inspirés de faits réels, avec deux choix aux conséquences durables :
pénurie de GPU H100 · choc DeepSeek (−17 % NVIDIA) · procès copyright · EU AI Act ·
saturation du réseau (SMR nucléaire) · pannes · jailbreaks · model collapse · guerre des
prix « mini » · embargo sur les puces · tentatives d'arrêt de l'AGI · promesse du
sanctuaire reposée à 85 % de la Terre consommée · IA rivales · mort thermique…

## Tech

100 % statique, **vanilla JavaScript (modules ES)**, aucune dépendance, aucun build.

```
index.html        structure & panneaux
styles.css        thème « salle de contrôle IA », responsive, accents évoluant par phase
js/data.js        contenu : modèles, GPU, hébergement, énergie, équipe, événements, succès
js/game.js        moteur : économie, production, phases, événements, sauvegarde versionnée
js/ui.js          rendu & interactions (sparkline, modales accessibles, export/import)
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
