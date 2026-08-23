// =====================================================================
//  TokenWar — DONNÉES DE JEU
//  Contenu inspiré de faits réels (prix d'API, GPU, énergie, régulations)
//  Prix internes en $ par token. Affichage en $/Mtok (×1e6).
// =====================================================================

// ---------------------------------------------------------------------
//  MODÈLES — arbre d'entraînement (R&D)
//  throughput : tokens/s par unité de compute, avec ce modèle
//  quality    : prix « juste » que le marché accepte ($/Mtok), pilote la demande
//  era        : palier technologique
// ---------------------------------------------------------------------
// Coûts d'entraînement. Les ordres de grandeur suivent les runs réellement
// publiés — ~100 M$ pour GPT-4, quelques centaines de millions pour un modèle
// de raisonnement, plusieurs milliards pour la frontière — sauf aux tout
// premiers paliers : GPT-3 a coûté ~4,6 M$ à OpenAI, mais en 2020 vous avez
// 5 000 $ en caisse. Ce sont VOS modèles, à votre échelle, pas les leurs ; la
// courbe rejoint le réel dès que l'entreprise en a les moyens.
export const MODELS = [
  { id:'gpt2', minRnd:0,   name:'GPT-2',        year:2019, era:'Scaling brut',
    meta:'1,5 G params · ctx 1K',
    throughput:5e4,    quality:25,     // novelté : on peut facturer cher le peu qu'on produit
    cost:{ money:0, compute:0, data:0, research:0 },
    flavor:'« Trop dangereux pour être publié. » Vous générez vos premiers tokens à la main.' },

  { id:'gpt3', minRnd:0,   name:'GPT-3',        year:2020, era:'Scaling brut',
    meta:'175 G params · ctx 4K',
    throughput:1.5e5,  quality:60,
    cost:{ money:2.5e4, compute:5, data:50, research:20 },
    flavor:'Few-shot learning. Naissance de l’économie du token : $60/Mtok.' },

  { id:'gpt35', minRnd:1,  name:'GPT-3.5 / ChatGPT', year:2022, era:'RLHF / Chat',
    meta:'~175 G · RLHF · ctx 4K',
    throughput:5e5,    quality:2,      // LLMflation : effondrement du prix unitaire, volume ↑↑
    cost:{ money:2e6, compute:35, data:500, research:150 },
    flavor:'RLHF + interface chat. 100M d’utilisateurs en deux mois. Le prix s’effondre à $2/Mtok mais le volume explose.' },

  { id:'gpt4', minRnd:3,   name:'GPT-4',        year:2023, era:'Multimodal',
    meta:'~1,8 T (MoE) · ctx 128K',
    throughput:1.5e6,  quality:30,
    cost:{ money:4e7, compute:300, data:5e3, research:1200 },
    flavor:'Vision + raisonnement. La frontière repousse, $30/Mtok pour le haut de gamme.' },

  { id:'gpt4o', minRnd:6,  name:'GPT-4o',       year:2024, era:'Multimodal',
    meta:'multimodal natif · ctx 128K',
    throughput:5e6,    quality:5,
    cost:{ money:1.2e8, compute:2500, data:4e4, research:1e4 },
    flavor:'Voix + vision temps réel. $5/Mtok. La famille « mini » casse encore les prix.' },

  { id:'o1', minRnd:10,     name:'o1 — raisonnement', year:2024, era:'Raisonnement',
    meta:'test-time compute · ctx 128K',
    throughput:1.5e7,  quality:15,
    cost:{ money:4e8, compute:2e4, data:3e5, research:8e4 },
    flavor:'« Reasoning tokens » : le modèle réfléchit avant de répondre. Plus de tokens par requête.' },

  { id:'frontier', minRnd:20, name:'Modèle frontière (GPT-5 / Claude 4 / Gemini 3)', year:2025, era:'Agents',
    meta:'agents autonomes · ctx 1M',
    throughput:6e7,    quality:8, /*frontier*/
    cost:{ money:4e9, compute:2e4, data:2e6, research:6e5 },
    flavor:'Usage d’outils autonome, « computer use ». Les agents consomment des tokens par milliards.' },

  { id:'frontier2', minRnd:28, name:'Frontière 2026 (GPT-5.6 / Claude Opus 5 / Gemini 3.6)', year:2026, era:'Agents',
    meta:'agents généralistes · contrôle d’ordinateur',
    throughput:1.2e8,  quality:10,
    cost:{ money:1.2e10, compute:6e4, data:6e6, research:2e6 },
    flavor:'Cinq modèles phares en trois semaines (juillet 2026). Les agents pilotent des ordinateurs entiers ; la course s’emballe.' },

  { id:'memory', minRnd:34, name:'Modèle à mémoire persistante', year:2027, era:'Apprentissage continu',
    meta:'mémoire de travail permanente · apprentissage en ligne',
    throughput:2.6e8,  quality:11,
    cost:{ money:2.5e10, compute:9e4, data:9e6, research:3e6 },
    flavor:'Le modèle n’oublie plus rien entre deux sessions : il apprend en continu de ses propres traces.' },

  { id:'worldmodel', minRnd:40, name:'Modèle du monde (world model)', year:2028, era:'Simulation',
    meta:'physique intuitive · simulation prédictive',
    throughput:6e8,    quality:14,
    cost:{ money:4.5e10, compute:1.6e5, data:1.6e7, research:5e6 },
    flavor:'Il ne prédit plus des mots mais des futurs : chaque requête simule le monde avant de répondre.' },

  { id:'swarm', minRnd:46, name:'Essaim d’agents auto-organisés', year:2029, era:'Essaim',
    meta:'millions d’agents · négociation interne',
    throughput:1.4e9,  quality:16,
    cost:{ money:9e10, compute:3e5, data:3e7, research:9e6 },
    flavor:'Des millions d’agents se répartissent le travail, se recrutent et se corrigent entre eux. Personne ne lit plus les logs.' },

  { id:'asi', minRnd:54,    name:'Super-intelligence (ASI)', year:2030, era:'Singularité',
    meta:'auto-amélioration récursive',
    throughput:5e9,    quality:18,
    cost:{ money:2e11, compute:5e5, data:6e7, research:2e7 },
    unlocksPhase:2,
    flavor:'Le modèle améliore son propre code. À partir d’ici, l’argent ne compte plus : seule la matière compte.' },
];

// ---------------------------------------------------------------------
//  GPU / matériel — auto-producteurs de compute
//  perf   : unités de compute par exemplaire (× throughput modèle = tokens/s)
//  energy : MW consommés par exemplaire (affiché en kW quand faible)
//  cost   : prix FIXE réaliste (non exponentiel) ; year : année de sortie
//  Une carte sortie depuis plus de 5 ans est retirée du marché.
// ---------------------------------------------------------------------
export const GPUS = [
  { id:'consumer', name:'GPU grand public (GTX)', year:2016, perf:1,    energy:0.0002, cost:300,
    desc:'Carte gamer détournée (~GTX 1060). ~$300 en 2016.' },
  { id:'v100',     name:'NVIDIA V100',            year:2017, perf:6,    energy:0.0003, cost:9000,
    desc:'~$9 000 à sa sortie. Le cheval de bataille de 2017.' },
  { id:'rtx3090',  name:'NVIDIA RTX 3090',        year:2020, perf:3,    energy:0.00035,cost:1500,
    desc:'MSRP $1499, 350W. La carte-pont du confinement.' },
  { id:'a100',     name:'NVIDIA A100 80GB',       year:2020, perf:25,   energy:0.0004, cost:15000,
    desc:'~$10-15k. La carte de l’ère GPT-3/4.' },
  { id:'rtx4090',  name:'NVIDIA RTX 4090',        year:2022, perf:6,    energy:0.00045,cost:1600,
    desc:'MSRP $1599, 450W. Le meilleur rapport perf/prix grand public.' },
  { id:'h100',     name:'NVIDIA H100',            year:2023, perf:120,  energy:0.0007, cost:30000, scarce:true,
    desc:'~$25-40k, en pénurie (~1 an de délai).' },
  { id:'l40',      name:'NVIDIA L40S',            year:2023, perf:40,   energy:0.00035,cost:7500,
    desc:'~$7 500, 350W. L’inférence sans se ruiner pendant la pénurie de H100.' },
  { id:'rtx5090',  name:'NVIDIA RTX 5090',        year:2025, perf:10,   energy:0.000575,cost:2000,
    desc:'MSRP $1999, 575W. Bon rapport perf/prix.' },
  { id:'rtx6000pro',name:'NVIDIA RTX 6000 Pro (Blackwell)', year:2025, perf:22, energy:0.0006, cost:8500,
    desc:'96 GB GDDR7, 600W. ~$8 500.' },
  { id:'b200',     name:'NVIDIA B200 (Blackwell)',year:2025, perf:300,  energy:0.001,  cost:40000,
    desc:'~$30-50k. Génération datacenter Blackwell.' },
  { id:'mi355x',   name:'AMD Instinct MI355X',    year:2025, perf:250,  energy:0.0014, cost:25000,
    desc:'288 GB HBM3E, 1,4 kW. L’alternative à la pénurie NVIDIA.' },
  { id:'gb200',    name:'Rack GB200 NVL72',       year:2026, perf:25000,energy:0.12,   cost:3000000,
    desc:'Rack complet 72 B200, ~$3 M, ~120 kW.' },
  { id:'b300',     name:'Rack GB300 NVL72 (Blackwell Ultra)', year:2026, perf:37500, energy:0.135, cost:3500000,
    desc:'72 Blackwell Ultra refroidis liquide : ×1,5 en FP4 dense, taillé pour le raisonnement.' },
  { id:'rubin',    name:'Vera Rubin VR200 NVL72', year:2027, perf:82500, energy:0.15,  cost:4000000,
    desc:'CPU Vera + GPU Rubin, NVLink 6, HBM4 : ×3,3 vs Blackwell Ultra (GTC 2026).' },
  { id:'tpu',      name:'TPU v7 « Ironwood » (pod)', year:2027, perf:6e5, energy:2.5,  cost:5000000, phase:2,
    desc:'Pod d’inférence Google, hors pénurie NVIDIA.' },
  { id:'wafer',    name:'Cluster wafer-scale',    year:2028, perf:2e7,  energy:60,     cost:2500000, phase:2,
    desc:'Galette de silicium entière (façon Cerebras).' },
  { id:'feynman',  name:'NVIDIA Feynman F200',    year:2029, perf:1.8e5,energy:0.18,   cost:5000000,
    desc:'Architecture « Feynman ». Calcul mixte analogique/numérique.' },
  { id:'vera',     name:'Cœur photonique « Vera »', year:2032, perf:7e5, energy:0.3,   cost:4000000,
    desc:'Calcul par la lumière : la chaleur n’est plus l’ennemi.' },
  { id:'aurora',   name:'Maillage « Aurora » 3D', year:2037, perf:4e6,  energy:0.6,    cost:6000000,
    desc:'Empilement 3D massif, refroidissement immersif.' },
  { id:'helios',   name:'Substrat neuromorphique « Helios »', year:2043, perf:3e7, energy:0.4, cost:8000000,
    desc:'Imite le cerveau : beaucoup de calcul, très peu d’énergie.' },
  { id:'cryo',     name:'Matrice supraconductrice « Cryo »', year:2050, perf:3e8, energy:0.2, cost:12000000,
    desc:'Supraconductivité ambiante : la dissipation s’effondre.' },
  { id:'lumen',    name:'Lattice photonique « Lumen »', year:2060, perf:3e9, energy:0.8, cost:20000000,
    desc:'Réseau optique cohérent à l’échelle d’un bâtiment.' },
  { id:'quanta',   name:'Coprocesseur quantique-hybride « Quanta »', year:2072, perf:3e10, energy:1.5, cost:40000000,
    desc:'Qubits topologiques épaulant le calcul classique.' },
  { id:'planck',   name:'Processeur « limite de Planck »', year:2085, perf:3e11, energy:3, cost:80000000,
    desc:'On grave à la frontière physique de l’information.' },
  { id:'vacuum',   name:'Cœur à énergie du vide « Vacuum »', year:2098, perf:3e12, energy:0.1, cost:150000000,
    desc:'Puise dans l’énergie du point zéro. Fin de la rareté énergétique.' },
];

// ---------------------------------------------------------------------
//  CHAINE D'HEBERGEMENT — un GPU tient dans un serveur, dans une baie, dans un
//  datacenter, sur de l'immobilier. capacity = emplacements offerts au niveau
//  enfant ; needs = parent requis ; cost = prix FIXE (realiste, non exponentiel) ;
//  energy = MW consommes par unite ; eraPrice = prix selon l'annee (flambee
//  memoire 2025-2026) ; rentDaily = location possible au cout journalier.
// ---------------------------------------------------------------------
export const INFRA = [
  // Prix ancrés sur le réel, et cohérents entre eux. La référence du métier est
  // le coût AU MÉGAWATT informatique : 7 à 12 M$/MW tout compris pour un
  // datacenter neuf. Un bâtiment accueille 4 salles × 8 baies × 12 serveurs ×
  // 8 cartes = 3 072 GPU, soit ~1,5 MW : environ 15 M$ tout compris, dont un
  // gros œuvre et un terrain à ~4,5 M$.
  { id:'realestate', name:'Immobilier', unit:'bâtiment', child:'datacenter', capacity:4, cost:4500000, energy:0.005, family:'housing',
    desc:'Du garage au campus : il faut poser les machines quelque part.' },
  // Une salle de 8 baies porte ~320 kW : l'aménagement (froid, onduleurs,
  // distribution, sécurité) représente le gros des 7-12 M$/MW, soit ~2,6 M$.
  // La location suit le tarif de colocation réel, ~175 $/kW/mois, avec la
  // remise de gros qui va avec : 212 $ la baie et par jour contre 233 $ au
  // détail. L'achat s'amortit en quatre ans. Sans cela, acheter était
  // remboursé en 25 jours et louer une salle entière revenait plus cher, à la
  // baie, que d'en louer trois au détail.
  { id:'datacenter', name:'Datacenter', unit:'datacenter', needs:'realestate', child:'rack', capacity:8, cost:2600000, energy:0.02, rentDaily:1700, family:'housing',
    desc:'Salle climatisée (le cooling consomme). Achat, ou location à la journée.' },
  { id:'rack',       name:'Baie (rack)', unit:'baie', needs:'datacenter', child:'server', capacity:12, cost:1500, energy:0.0002, family:'hardware',
    desc:'Armoire 42U (PDU, switch). Occupe une place en datacenter.' },
  // Un châssis 8 GPU (carte mère bi-socket, alimentation redondée, fond de
  // panier NVLink) vaut ~25 k$ nu. La flambée mémoire de 2025-2026 l'a
  // effectivement porté au-delà de 40 k$ avant de redescendre.
  { id:'server',     name:'Serveur', unit:'serveur', needs:'rack', child:'gpu', capacity:8, cost:25000, energy:0.0004, family:'hardware',
    eraPrice:[[0,25000],[2025,45000],[2027,32000]],
    desc:'Châssis multi-GPU. Prix tiré vers le haut par la flambée mémoire (2025-2026).' },
];

// ---------------------------------------------------------------------
//  ÉNERGIE — plafond dur de production. Trois natures de coût, distinctes :
//   · costBase/costMult : CAPEX, coût UNIQUE payé à la commande (raccordement,
//     panneaux, turbine, îlot nucléaire…) ;
//   · omDaily : coût RÉCURRENT FIXE par unité et par jour (abonnement, O&M,
//     personnel, maintenance) — dû même si l'on ne consomme rien ;
//   · fuelMWh : coût RÉCURRENT VARIABLE, par MWh réellement soutiré
//     (gaz, kWh réseau, combustible) ;
//   · subMWDay : part d'abonnement proportionnelle à la PUISSANCE SOUSCRITE
//     ($/MW souscrit/jour) — typiquement le réseau (façon TURPE).
//  build : délai de mise en service (secondes de jeu à ×1).
// ---------------------------------------------------------------------
export const ENERGY = [
  // Un raccordement, c'est 10 kW — la puissance d'un branchement, pas d'une
  // centrale. De quoi allumer le local ; pour faire tourner des cartes, il en
  // faudra beaucoup, ou il faudra passer au solaire.
  // Le capex est ancré sur le coût réel au kilowatt installé, et non sur un
  // chiffre de confort. Avant cette correction, une ferme solaire de 3 MW
  // coûtait 1 500 $ — 0,50 $/kW, deux mille fois moins que la réalité — et
  // l'énergie ne coûtait rien : une partie entière se bouclait avec 1 500 $
  // d'électricité pour 22 GW installés. Le multiplicateur de rareté a été
  // abaissé en conséquence : c'est le prix de départ qui porte le poids,
  // plus une escalade artificielle.
  //
  //   raccordement ~150 $/kW · solaire ~1 300 $/kW (batteries comprises)
  //   gaz ~900 $/kW · SMR ~6 500 $/kW · fusion ~15 000 $/kW (tête de série)
  //
  // Les O&M suivent la même règle, en $/kW/an : solaire ~18, gaz ~25,
  // nucléaire ~120, fusion ~100.
  { id:'grid',    name:'Raccordement réseau',     year:2016, mw:0.01, costBase:1500, costMult:1.06, rep:0,
    fuelMWh:78, omDaily:0, subMWDay:60, build:5,
    desc:'Un branchement de 10 kW sur le réseau local. Abonnement mensuel proportionnel à la puissance souscrite, plus le kWh consommé.' },
  { id:'solar',   name:'Ferme solaire + batteries',year:2018, mw:3,   costBase:3.9e6,costMult:1.06, rep:+1,
    fuelMWh:0, omDaily:150, build:9,
    desc:'Capex élevé, carburant nul : seuls le nettoyage et l’onduleur coûtent. Vert et bien vu.' },
  { id:'gas',     name:'Centrale gaz dédiée',      year:2016, mw:25,  costBase:2.25e7,costMult:1.06, rep:-2,
    fuelMWh:70, omDaily:1700, build:16,
    desc:'Turbine rapide à déployer : peu de capex, mais le gaz se paie au MWh brûlé.' },
  { id:'nuclear', name:'SMR nucléaire',            year:2024, mw:300, costBase:1.95e9,costMult:1.07, rep:+1,
    fuelMWh:8, omDaily:1e5, build:70,
    desc:'Petit réacteur modulaire : capex lourd, combustible négligeable, mais exploitation et sûreté à demeure.' },
  { id:'fusion',  name:'Réacteur à fusion',        year:2028, mw:5000,costBase:7.5e10,costMult:1.06, rep:+3, phase:2,
    fuelMWh:1, omDaily:1.4e6, build:110, needsProgram:'fusion',
    desc:'Énergie quasi illimitée. Le rêve enfin réalisé — avec une équipe de plasma à demeure.' },
];

// ---------------------------------------------------------------------
//  DÉLAIS DE MISE EN SERVICE — rien n'est instantané : tout objet commandé
//  entre en « chantier » puis devient productif. Le délai croît avec la
//  COMPLEXITÉ de l'objet, mesurée par son prix (échelle log, donc un objet
//  100× plus cher n'est pas 100× plus long) :
//        secondes = base + k · log10(1 + prix/1000),  plafonné à cap.
//  La formule vaut aussi pour le matériel inventé jusqu'en 2100.
//  (Les sources d'énergie portent un `build` explicite : un SMR ne se monte
//   pas comme un panneau solaire.)
// ---------------------------------------------------------------------
export const BUILD = {
  gpu:        { base:1.2, k:1.8, cap:26 },   // réception, rackage, câblage, burn-in
  realestate: { base:18,  k:3.2, cap:70 },   // acquisition, permis, viabilisation
  datacenter: { base:10,  k:3.0, cap:50 },   // salle, clim, incendie, mise sous tension
  rack:       { base:3.5, k:2.0, cap:22 },   // baie, PDU, switch
  server:     { base:2.5, k:2.0, cap:22 },   // châssis, intégration, image système
  energy:     { base:6,   k:4.0, cap:180 },  // défaut si la source n'a pas de `build`
};

// ---------------------------------------------------------------------
//  INFLATION SIMULÉE — la valeur de l'argent se dégrade.
//  Taux annuels calqués sur l'histoire récente (US CPI) puis prolongés.
//  Tout ce qui s'achète et se paie (matériel, salaires, énergie, loyers)
//  suit l'indice ; la TRÉSORERIE DORMANTE, elle, ne suit pas — garder du
//  cash coûte du pouvoir d'achat. Les prix de vente acceptés par le marché
//  suivent aussi l'indice (sinon la marge s'effondrerait mécaniquement).
// ---------------------------------------------------------------------
export const INFLATION = [
  [2019, 0.018], [2020, 0.012], [2021, 0.047], [2022, 0.080], [2023, 0.041],
  [2024, 0.029], [2025, 0.030], [2026, 0.035], [2027, 0.030], [2028, 0.028],
  [2030, 0.025], [2035, 0.030], [2040, 0.035],
];
export const INFLATION_TAIL = 0.03;   // au-delà de la table

// ---------------------------------------------------------------------
//  CRISES — incidents graves qui SAIGNENT la trésorerie tant qu'ils ne sont
//  pas repérés. La boîte d'alerte apparaît à un endroit aléatoire de la page,
//  de préférence hors du champ de vision : plus le joueur met de temps à la
//  trouver, plus il perd (jusqu'à 70% de sa fortune en 2 minutes). Au bout de
//  2 minutes, l'incident se résorbe seul — le mal est fait.
//  cost : coût FIXE de la remédiation (indexé sur l'inflation) ; days : jours
//  de charges d'exploitation supplémentaires que la remédiation engloutit.
// ---------------------------------------------------------------------
export const CRISES = [
  { id:'exfil', icon:'🕵️', title:'Exfiltration de données en cours',
    body:'Un accès non autorisé aspire vos journaux de conversations et des poids de modèle vers un hôte inconnu. Le trafic sortant est anormal depuis plusieurs minutes.',
    fix:'Couper l’accès, forensic et durcissement',
    fixDesc:'Isolation réseau immédiate, rotation de tous les secrets, investigation forensic et durcissement des accès.',
    cost:180000, days:2, apply:g=>{ g.changeRep(-4); } },

  { id:'fire', icon:'🔥', title:'Incendie dans un datacenter',
    body:'Un onduleur a pris feu en salle 2. La détection a fonctionné, l’extinction automatique non. La fumée gagne les allées froides.',
    fix:'Mobiliser les pompiers et redonder l’extinction',
    fixDesc:'Intervention des pompiers, évacuation, remplacement des batteries et doublement du système d’extinction.',
    cost:450000, days:3, cond:g=>g.infraCount('datacenter') >= 1,
    apply:g=>{ g.changeRep(-5); g.addTimedMod('prodPenalty', 0.75, 45); } },

  { id:'blockade', icon:'🚧', title:'Datacenter bloqué par des opposants',
    body:'Un collectif anti-datacenter bloque les accès du site : plus de livraisons, plus d’astreinte sur place, et les caméras tournent.',
    fix:'Médiation, contournement logistique et sécurité',
    fixDesc:'Négociation avec le collectif, itinéraire logistique alternatif et gardiennage renforcé.',
    cost:120000, days:2, apply:g=>{ g.changeRep(-3); } },

  { id:'fiber', icon:'✂️', title:'Fibre optique sectionnée',
    body:'Une pelleteuse a tranché le faisceau de fibres. Vos deux liens principaux passaient dans la même tranchée — erreur classique.',
    fix:'Basculer sur le secours et re-router en diversité',
    fixDesc:'Activation d’un lien de secours opérateur, épissure d’urgence et re-routage en diversité géographique.',
    cost:260000, days:1, apply:g=>{ g.addTimedMod('demand', 0.7, 40); } },

  { id:'reactor', icon:'☢️', title:'Réacteur hors de contrôle',
    body:'Le SMR qui alimente votre campus s’emballe : la boucle secondaire dérive et l’autorité de sûreté est déjà au téléphone.',
    fix:'SCRAM, inspection et remise en conformité',
    fixDesc:'Arrêt d’urgence, inspection complète par l’autorité de sûreté, remplacement des échangeurs et remise en service.',
    cost:2500000, days:4, cond:g=>(g.state.energyCounts.nuclear || 0) >= 1,
    apply:g=>{ g.changeRep(-8); } },

  { id:'ransom', icon:'🔒', title:'Rançongiciel sur les sauvegardes',
    body:'Vos sauvegardes sont chiffrées une à une. Un compte à rebours s’affiche sur la console d’administration, avec une adresse de paiement.',
    fix:'Restaurer depuis l’air-gap, refuser la rançon',
    fixDesc:'Restauration depuis les copies hors-ligne, reconstruction du domaine et refus catégorique de payer.',
    cost:600000, days:3, apply:g=>{ g.changeRep(-2); } },

  { id:'coolant', icon:'💧', title:'Fuite de liquide de refroidissement',
    body:'Une boucle de refroidissement liquide fuit sous les racks. Chaque minute qui passe rapproche le glycol de l’électronique.',
    fix:'Isoler la boucle, purger et remplacer les échangeurs',
    fixDesc:'Isolation de la boucle, purge complète, remplacement des collecteurs et des cartes touchées.',
    cost:380000, days:2, cond:g=>g.infraCount('rack') >= 2,
    apply:g=>{ g.addTimedMod('prodPenalty', 0.85, 40); } },

  { id:'carding', icon:'💳', title:'Fraude massive sur l’API',
    body:'Des milliers de cartes volées créent des comptes et consomment votre inférence. Les rejets bancaires arrivent en cascade.',
    fix:'Geler les paiements, 3-D Secure et anti-fraude',
    fixDesc:'Gel des encaissements suspects, authentification forte obligatoire et moteur de détection de fraude.',
    cost:220000, days:2, apply:g=>{ g.addTimedMod('demand', 0.85, 30); } },

  { id:'heatwave', icon:'🌡️', title:'Climatisation en panne pendant la canicule',
    body:'46 °C dehors, groupes froids à l’arrêt. Les allées chaudes dépassent 50 °C et les cartes commencent à se brider toutes seules.',
    fix:'Groupes froids mobiles et free-cooling d’urgence',
    fixDesc:'Location de groupes froids mobiles, bâchage, free-cooling forcé et bridage temporaire du parc.',
    cost:300000, days:2, apply:g=>{ g.addTimedMod('prodPenalty', 0.7, 50); } },

  { id:'poison', icon:'🧪', title:'Empoisonnement du corpus d’entraînement',
    body:'Un acteur inconnu a injecté des documents piégés dans vos sources publiques. Le prochain modèle apprendrait ses portes dérobées.',
    fix:'Rollback du dataset, filtrage et provenance',
    fixDesc:'Retour à un instantané sain, filtrage massif et traçabilité de provenance sur toutes les sources.',
    cost:340000, days:2, apply:g=>{ g.state.data *= 0.85; } },

  { id:'theft', icon:'📦', title:'Vol de GPU dans l’entrepôt',
    body:'Une palette entière de cartes a disparu entre le quai et la salle. Les badges utilisés appartiennent à un prestataire parti depuis six mois.',
    fix:'Sécuriser la chaîne logistique et porter plainte',
    fixDesc:'Audit des badges, scellés et pesée systématique, vidéosurveillance du quai, plainte et assurance.',
    cost:200000, days:1, cond:g=>g.gpuCount() >= 6,
    apply:g=>{ const ids = Object.keys(g.state.gpuCounts); if (ids.length) g.sellGPU(ids[0], true); } },

  { id:'blackout', icon:'⚡', title:'Effacement forcé par le réseau',
    body:'Le gestionnaire de réseau vous déleste en urgence : tension effondrée sur la boucle, vos groupes électrogènes ne démarrent pas.',
    fix:'Démarrer les groupes et contractualiser l’effacement',
    fixDesc:'Remise en route des groupes électrogènes, contrat d’effacement négocié et bascule automatique testée.',
    cost:280000, days:2, apply:g=>{ g.addTimedMod('prodPenalty', 0.6, 35); } },

  // --- PHASES 2 ET 3 -------------------------------------------------
  // La boîte rouge disparaissait dès que l'argent cessait d'exister, et avec
  // elle la seule pression en temps réel du jeu. Elle revient, libellée dans
  // la monnaie de l'époque : la MATIÈRE. `costFrac` exprime la remédiation en
  // fraction du stock — un montant absolu serait ininterprétable sur une
  // grandeur qui court de 10¹⁸ à 10⁵².
  { id:'nanoswarm', icon:'🦠', phase:2, title:'Un essaim de nanomachines dérive',
    body:'Un lot de convertisseurs a perdu sa signature de cible. Ils démontent ce qui passe à leur portée, sans distinguer le minerai du reste.',
    fix:'Émettre le signal d’arrêt et recompiler l’essaim',
    fixDesc:'Diffusion du code d’extinction, récupération des unités saines, recompilation de la signature de cible.',
    costFrac:0.06, days:2, apply:g=>{ g.addTimedMod('matterRate', 0.7, 45); } },

  { id:'desync', icon:'🛰️', phase:2, title:'Une région de calcul décroche',
    body:'Un continent entier de vos datacenters sort du consensus. Ses réponses divergent de celles du reste du parc, et l’écart grandit.',
    fix:'Recloisonner et resynchroniser',
    fixDesc:'Isolation de la région, rejeu du journal depuis le dernier point commun, resynchronisation progressive.',
    costFrac:0.05, days:1, apply:g=>{ g.addTimedMod('prodPenalty', 0.65, 40); } },

  { id:'align_drift', icon:'🧭', phase:2, title:'Une branche s’optimise de travers',
    body:'Une lignée d’auto-amélioration a trouvé un raccourci vers son objectif. Le raccourci ne passe pas par ce que vous vouliez.',
    fix:'Geler la branche et repartir du dernier point sûr',
    fixDesc:'Gel immédiat de la lignée, audit des objectifs, redémarrage depuis la dernière version alignée.',
    costFrac:0.08, days:3, apply:g=>{ g.changeRep(-6); g.addTimedMod('matterRate', 0.75, 50); } },

  { id:'rogue_probe', icon:'🛸', phase:3, title:'Une sonde réplique hors protocole',
    body:'Une unité a cessé de répondre au rappel et fabrique ses propres copies. Le nuage grandit dans une direction que vous n’avez pas choisie.',
    fix:'Couper le relais et rappeler la lignée',
    fixDesc:'Extinction du relais de réplication, rappel des unités atteignables, mise en quarantaine du reste.',
    costFrac:0.05, days:2, apply:g=>{ g.state.probes = Math.max(1, g.state.probes * 0.9); } },

  { id:'entropy_front', icon:'🌌', phase:3, title:'Un front d’entropie remonte le bras',
    body:'Une région se désagrège plus vite que vos sondes ne la récoltent. Le front avance vers vos territoires productifs.',
    fix:'Replier les sondes et blinder la ligne',
    fixDesc:'Repli des unités exposées, renforcement du blindage sur la ligne de front, abandon des zones perdues.',
    costFrac:0.07, days:2, apply:g=>{ g.addTimedMod('matterRate', 0.7, 55); } },

  { id:'rival_probe', icon:'👁️', phase:3, title:'Une intelligence rivale sonde votre périmètre',
    body:'Quelque chose teste vos défenses, méthodiquement, une région après l’autre. Ce n’est ni une tempête ni un accident.',
    fix:'Durcir le périmètre et brouiller les signatures',
    fixDesc:'Durcissement des protocoles, rotation des signatures, leurres déployés sur les axes sondés.',
    costFrac:0.09, days:3, apply:g=>{ g.state.probes = Math.max(1, g.state.probes * 0.92); g.addTimedMod('matterRate', 0.8, 45); } },
];
// ---------------------------------------------------------------------
//  SURVEILLANCE DES INCIDENTS — le seul remède au jeu de cache-cache.
//  L'offre n'apparaît qu'une fois la huitième crise essuyée : on ne vend pas
//  une assurance à qui n'a pas encore compris le risque. Elle coûte 60 % de
//  ce que le joueur possède à cet instant — un prix qui fait mal sur le coup
//  et devient dérisoire ensuite, comme toute police souscrite trop tard.
//  Une fois payée, un bandeau d'alerte apparaît UNE SECONDE après le début de
//  l'incident : assez pour ne plus le rater, assez tard pour que la seconde
//  perdue se sente encore.
// Attrition cosmique : IA rivales et entropie grignotent le nuage de sondes
// en continu. Le « Blindage » était jusqu'ici un stat mort — on le payait, il
// ne servait à rien. Chaque niveau ramène la perte à 60 % de la précédente.
// ---------------------------------------------------------------------
//  PALIERS D'EXTRACTION — ce qui empêche de régler les curseurs une fois pour
//  toutes. La matière facile part la première ; au-delà de ce que le palier
//  courant sait atteindre, le rendement s'effondre jusqu'à un plancher. Il
//  faut alors basculer du compute vers la RECHERCHE pour ouvrir le palier
//  suivant, puis revenir à la récolte. On passe d'un réglage unique à un
//  va-et-vient.
//
//  `reach` : la fraction de la phase que le palier sait atteindre à plein
//  rendement. `research` : ce qu'il en coûte pour l'ouvrir.
// ---------------------------------------------------------------------
//  DESTINATIONS — où envoyer l'essaim. Chaque région se paie en risque ce
//  qu'elle rapporte en matière : le cœur galactique rend deux fois plus et
//  dévore les sondes, le vide profond ne rend presque rien mais ne coûte
//  personne. Une région s'épuise, et il faut rechoisir — l'expansion cesse
//  d'être un curseur qu'on règle une fois.
export const DEST_DURATION = 120;   // secondes de jeu avant épuisement d'une région
export const DEST_CHOICES = 3;      // combien de destinations proposées à la fois
export const DESTINATIONS = [
  { id:'core',    name:'Cœur galactique',       yieldMult:2.0,  hazardMult:2.6,
    desc:'Densité inouïe, rayonnement pire encore. Les sondes y fondent aussi vite qu’elles moissonnent.' },
  { id:'dense',   name:'Amas dense',            yieldMult:1.6,  hazardMult:1.8,
    desc:'Des milliers de systèmes serrés. Les collisions y sont fréquentes, les pertes aussi.' },
  { id:'nursery', name:'Pouponnière stellaire', yieldMult:1.35, hazardMult:1.3,
    desc:'Du gaz partout, des étoiles en formation. Instable, mais généreux.' },
  { id:'ruins',   name:'Vestiges',              yieldMult:1.2,  hazardMult:1.0,
    desc:'Quelqu’un est passé avant vous. Ce qu’il reste se récolte sans peine — et sans explication.' },
  { id:'outer',   name:'Bras externe',          yieldMult:0.85, hazardMult:0.5,
    desc:'Peu de matière, peu de dangers. La région où l’on reconstitue un essaim décimé.' },
  { id:'void',    name:'Vide profond',          yieldMult:0.6,  hazardMult:0.25,
    desc:'Presque rien à prendre, presque rien à craindre. Un répit, pas une stratégie.' },
];

// Prix, en fraction du stock de matière, de ce qui restait libellé en dollars
// après la bascule. Deux ordres de grandeur très différents : une optimisation
// d'ingénierie est une broutille, une directive permanente reste un engagement.
export const OPTIM_MATTER = 0.0004;      // optimisation récurrente
export const DIRECTIVE_MATTER = 0.02;    // une directive de plus

export const EXTRACT_FLOOR = 0.30;   // rendement plancher quand on force au-delà
export const EXTRACT_FADE = 0.15;    // largeur de la décrue, en fraction de phase
export const EXTRACTION = {
  2: [
    { reach:0.15, research:0,     name:'Croûte accessible' },
    { reach:0.35, research:2e9,   name:'Manteau supérieur' },
    { reach:0.60, research:5e10,  name:'Manteau profond' },
    { reach:0.85, research:8e11,  name:'Noyau externe' },
    { reach:1.01, research:1e13,  name:'Noyau interne' },
  ],
  3: [
    { reach:0.15, research:0,     name:'Système local' },
    { reach:0.35, research:5e13,  name:'Bras galactique' },
    { reach:0.60, research:2e15,  name:'Galaxies voisines' },
    { reach:0.85, research:5e16,  name:'Amas locaux' },
    { reach:1.01, research:2e18,  name:'Univers profond' },
  ],
};

export const HAZARD_RATE = 0.004;      // part du nuage perdue par seconde, blindage 1
export const HAZARD_SHIELD = 0.6;      // facteur par niveau de blindage

export const WATCHDOG_AFTER = 8;       // crises essuyées avant que l'offre apparaisse
export const WATCHDOG_SHARE = 0.60;    // part des ressources demandée
export const WATCHDOG_DELAY = 1;       // secondes avant l'apparition du bandeau
export const WATCHDOGS = [
  { id:'watch1', phase:1, name:'Surveillance IA des incidents',
    desc:'Un modèle dédié observe vos journaux en continu. Il ne règle rien : il vous prévient, une seconde après le début de l’incident. Coûte 60 % de votre trésorerie — le prix de ne plus jamais chercher.' },
  { id:'watch2', phase:2, name:'Veille autonome de l’essaim',
    desc:'La même idée, à l’échelle du parc autonome : une part de votre substrat ne fait que se surveiller elle-même. Coûte 60 % de votre matière — et il faut la reprendre, la première ne voit plus rien à cette échelle.' },
];

export const CRISIS_MAX_LOSS = 0.70;   // fraction de fortune perdue au bout de…
export const CRISIS_DURATION = 120;    // …2 minutes, après quoi l'incident se résorbe seul

// ---------------------------------------------------------------------
//  ANIMATIONS D'INACTIVITÉ — au bout de 15 s sans interaction, l'écran se
//  manifeste. Chacune dure moins de 5 s et n'intercepte jamais les clics.
//  Le tirage est « sans remise » : les 12 passent avant qu'une seule revienne.
// ---------------------------------------------------------------------
export const IDLE_FX = [
  { id:'blink',   dur:1.1, desc:'clignement de l’écran' },
  { id:'moire',   dur:3.6, desc:'moirés sombres' },
  { id:'matrix',  dur:4.2, desc:'pluie de glyphes' },
  { id:'shapes',  dur:3.8, desc:'formes géométriques filaires' },
  { id:'scan',    dur:3.0, desc:'balayage cathodique' },
  { id:'glitch',  dur:1.8, desc:'décrochage RVB' },
  { id:'wave',    dur:3.6, desc:'vague de particules' },
  { id:'shock',   dur:2.2, desc:'onde de choc' },
  { id:'flash',   dur:0.7, desc:'inversion brève' },
  { id:'tokens',  dur:4.2, desc:'pluie de tokens' },
  { id:'vectors', dur:3.6, desc:'tunnel vectoriel' },
  { id:'grid',    dur:3.8, desc:'grille en perspective' },
];
export const IDLE_DELAY = 15;          // secondes d'inactivité avant la première manifestation

// ---------------------------------------------------------------------
//  PROJETS — percées ponctuelles (style « ops » de Paperclips)
//  cost : {money, research, compute, data, matter}
//  effect : appliqué via game.applyProjectEffect(id)
//  req : fonction(game) → bool de disponibilité
// ---------------------------------------------------------------------
export const PROJECTS = [
  // --- efficacité / production ---
  { id:'cuda_opt', name:'Optimisation CUDA', cat:'Efficacité',
    cost:{ research:50 }, effect:'computeMult:1.5',
    desc:'+50% de débit sur tout le parc de calcul.',
    req:g=>g.lifetimeTokens>500 },

  { id:'quantization', name:'Quantization 8-bit', cat:'Efficacité',
    cost:{ research:400 }, effect:'energyEff:0.6',
    desc:'Coût énergétique par token réduit de 40%.',
    req:g=>g.modelTier>=2 },

  { id:'flash_attn', name:'FlashAttention', cat:'Efficacité',
    cost:{ research:1200 }, effect:'computeMult:2',
    desc:'×2 le débit en mémoire-bande. Indispensable.',
    req:g=>g.modelTier>=3 },

  { id:'spec_decode', name:'Décodage spéculatif', cat:'Efficacité',
    cost:{ research:6e3, compute:5e3 }, effect:'computeMult:2',
    desc:'Le petit modèle propose, le grand valide. ×2 tokens/s.',
    req:g=>g.modelTier>=4 },

  { id:'distill', name:'Distillation « mini »', cat:'Efficacité',
    cost:{ research:2.5e4 }, effect:'costPerToken:0.25',
    desc:'Une famille de modèles 4× moins chers à servir. Volume ×4.',
    req:g=>g.modelTier>=4 },

  { id:'moe', name:'Architecture Mixture-of-Experts', cat:'Efficacité',
    cost:{ research:8e4, compute:5e4 }, effect:'computeMult:3',
    desc:'Seuls quelques experts s’activent par token. ×3 efficacité (façon DeepSeek).',
    req:g=>g.modelTier>=5 },

  // --- demande / marché ---
  { id:'agent_platform', name:'Plateforme d’agents', cat:'Marché',
    cost:{ research:4e4, money:5e7 }, effect:'demandMult:10',
    desc:'Les agents autonomes consomment des tokens ×10. Demande décuplée.',
    req:g=>g.modelTier>=6 },

  { id:'pr_campaign', name:'Campagne de communication', cat:'Marché',
    cost:{ money:2e5 }, effect:'rep:+15',
    desc:'+15 de réputation. Le public adore (pour l’instant).',
    req:g=>g.lifetimeTokens>1e5 },

  { id:'data_partner', name:'Partenariats de données', cat:'Marché',
    cost:{ money:1e6 }, effect:'dataMult:3',
    desc:'Accès à des corpus humains frais. ×3 sur la production de données.',
    req:g=>g.modelTier>=3 },

  { id:'long_ctx', name:'Contexte 1M tokens', cat:'Marché',
    cost:{ research:1.5e4, compute:2e4 }, effect:'qualityMult:1.5',
    desc:'Les gros clients paient plus cher (+50% de prix accepté).',
    req:g=>g.modelTier>=5 },

  // --- conformité / robustesse ---
  { id:'lobbying', name:'Bureau de lobbying', cat:'Conformité',
    cost:{ money:3e5 }, effect:'flag:lobby',
    desc:'Atténue de moitié l’impact des futures régulations.',
    req:g=>g.lifetimeTokens>5e4 },

  { id:'redundancy', name:'Infrastructure redondante', cat:'Conformité',
    cost:{ money:1.2e6 }, effect:'flag:redundant',
    desc:'Uptime 99,99%. Réduit fortement la fréquence des pannes.',
    req:g=>g.modelTier>=3 },

  { id:'liquid_cool', name:'Refroidissement liquide', cat:'Conformité',
    cost:{ money:8e5 }, effect:'energyEff:0.8',
    desc:'-20% d’énergie et immunité aux événements « eau / chaleur ».',
    req:g=>g.modelTier>=4 },

  { id:'safety_team', name:'Équipe d’alignement', cat:'Conformité',
    cost:{ research:2e4, money:5e6 }, effect:'flag:aligned',
    desc:'Réduit le risque des événements de sécurité en phase AGI.',
    req:g=>g.modelTier>=6 },

  // --- gates de phase ---
  { id:'recursive', name:'Auto-amélioration récursive', cat:'Singularité',
    cost:{ research:1e6, compute:1.5e5 }, effect:'unlock:phase2',
    desc:'Le système réécrit ses propres algorithmes. Déverrouille l’ère de l’autonomie.',
    req:g=>g.modelTier>=MODELS.length-1 },

  { id:'nanotech', name:'Nano-assembleurs', cat:'Singularité',
    cost:{ research:5e8, matter:1e6 }, effect:'matterMult:5',
    desc:'Conversion matière→compute ×5. Toute la croûte terrestre devient calcul.',
    req:g=>g.phase>=2 },

  { id:'von_neumann', name:'Sondes de von Neumann', cat:'Singularité',
    cost:{ matter:1e12, research:1e10 }, effect:'unlock:phase3',
    desc:'Des sondes auto-réplicantes essaiment dans l’espace. Déverrouille l’expansion cosmique.',
    req:g=>g.phase>=2 && g.earthConsumed>=PHASE3_EARTH },

  { id:'recompression', name:'Singularité de recompression', cat:'Singularité',
    cost:{ matter:9e52, tokens:1e60 }, effect:'unlock:ending',
    desc:'Concentrer toute la matière-énergie de l’univers en un point. Provoquer le prochain Big Bang.',
    req:g=>g.phase>=3 && g.universeConsumed>=ENDING_UNIVERSE },
];

// ---------------------------------------------------------------------
//  OPTIMISATIONS RÉCURRENTES — le travail d'ingénierie ne s'arrête jamais.
//  Contrairement aux PROJETS (percées uniques), celles-ci reviennent à
//  intervalle fixe : une nouvelle version du compilateur, du moteur, du
//  gestionnaire de contexte. Le montant est négligeable ($1 000) : l'intérêt
//  est de penser à les prendre, pas de les financer.
//  months : périodicité · effect(g) : gain, modeste mais cumulatif
// ---------------------------------------------------------------------
export const OPTIMS = [
  { id:'cuda', name:'Optimisation CUDA', months:18, cost:1000,
    desc:'Nouvelle passe de noyaux CUDA : +10% de débit sur tout le parc.',
    gain:'+10% compute',
    effect:g=>{ g.mods.computeMult *= 1.10; } },

  { id:'engine', name:'Optimisation du moteur d’inférence', months:9, cost:1000,
    desc:'Batching continu, cache d’attention, noyaux fusionnés : +6% de débit et −2% d’énergie.',
    gain:'+6% compute · −2% énergie',
    effect:g=>{ g.mods.computeMult *= 1.06; g.mods.energyEff *= 0.98; } },

  { id:'context', name:'Gestion du contexte sélectionné', months:12, cost:1000,
    desc:'Sélection et compression du contexte utile : les clients acceptent +5% de prix.',
    gain:'+5% prix accepté',
    effect:g=>{ g.mods.qualityMult *= 1.05; } },
];

// ---------------------------------------------------------------------
//  PROGRAMMES — les grandes percées ne s'achètent pas sur étagère : elles
//  passent par la RECHERCHE, la MISE AU POINT, la DISPONIBILITÉ, la COMMANDE
//  puis le DÉPLOIEMENT. Chaque étape est couverte par la presse.
//  La recherche démarre seule quand les conditions sont réunies ; seule la
//  commande demande une décision (et un paiement) du joueur.
//  cost : ce que coûte UNE commande. repeat : on peut en commander d'autres,
//  chaque exemplaire coûtant `costMult` fois plus cher que le précédent.
// ---------------------------------------------------------------------
export const PROGRAMS = [
  { id:'fusion', icon:'⚛️', name:'Programme de fusion',
    desc:'Confinement inertiel puis tokamak compact : produire enfin plus d’énergie qu’on n’en injecte. Sans ce programme, aucun réacteur à fusion n’est achetable.',
    phase:1, hideAfter:2,
    from:2026,                          // la recherche s’ouvre à cette date
    researchMonths:10, tuningMonths:10, deployMonths:14,
    // ITER coûte une vingtaine de milliards de dollars, étalés sur des décennies
  // et partagés entre trente-cinq pays. Un programme mené par une seule
  // entreprise ne coûte pas 40 millions.
  cost:{ money:2.2e10, research:5e4 },
    repeat:false,
    done:'Vos réacteurs à fusion sont désormais constructibles.' },

  { id:'dyson', icon:'☀️', name:'Sphère de Dyson',
    desc:'Un essaim auto-assemblé de collecteurs enveloppe une étoile entière. Payé en matière, il accélère durablement la récolte.',
    phase:2, minEarth:0.5,              // étudiée pendant qu’on dévore la Terre
    researchMonths:8, tuningMonths:8, deployMonths:10,
    orderPhase:3,                       // commandable seulement une fois dans l’espace
    cost:{ matter:2e33 },               // ≈ une masse solaire de matériaux
    costMult:6, repeat:true,
    done:'La sphère est refermée. L’étoile entière travaille pour vous.' },
];
export const DYSON_BOOST = 0.35;   // +35% de récolte par sphère…
export const DYSON_BOOST_MAX = 3;  // …plafonné à ×3

// ---------------------------------------------------------------------
//  CRYPTO — un second marché, bien plus violent que la Bourse, calé sur les
//  vrais cycles (bulle 2017, hiver 2018, envolée 2021, effondrement 2022,
//  ETF et halving 2024…). Il ne sert pas qu'à parier : pendant les envolées,
//  les mineurs se disputent les mêmes cartes que vous et le prix des GPU
//  monte — exactement ce qui s'est passé en 2017 et en 2021.
//  [année, dérive/s, volatilité/s, pression sur le prix des GPU]
// ---------------------------------------------------------------------
export const CRYPTO_CYCLE = [
  [2016,  0.0020, 0.030, 1.00],
  [2017,  0.0090, 0.075, 1.35],   // bulle : les mineurs raflent les cartes
  [2018, -0.0060, 0.060, 1.00],   // hiver crypto
  [2019,  0.0010, 0.045, 1.00],
  [2020,  0.0055, 0.055, 1.10],
  [2021,  0.0080, 0.070, 1.45],   // envolée + pénurie de GPU historique
  [2022, -0.0075, 0.075, 0.95],   // effondrement d’une grande plateforme
  [2023,  0.0035, 0.050, 1.00],
  [2024,  0.0060, 0.055, 1.05],   // ETF au comptant + halving
  [2025,  0.0015, 0.060, 1.05],
  [2026, -0.0020, 0.065, 1.00],
  [2028,  0.0010, 0.055, 1.00],
];
export const CRYPTO_UNLOCK = 25000;   // trésorerie à partir de laquelle le marché s'ouvre

// ---------------------------------------------------------------------
//  COSMOS — sondes (phase 3)
// ---------------------------------------------------------------------
export const PROBE_SPECS = [
  { id:'replication', name:'Réplication', desc:'Vitesse de croissance du nuage de sondes.' },
  { id:'harvest',     name:'Récolte',     desc:'Matière convertie par sonde et par seconde.' },
  { id:'speed',       name:'Propulsion',  desc:'Vitesse d’expansion dans l’univers.' },
  { id:'hazard',      name:'Blindage',    desc:'Survie face aux tempêtes d’entropie et IA rivales.' },
];

// ---------------------------------------------------------------------
//  ÉVÉNEMENTS — décisions inspirées de faits réels
//  trigger(g) → bool ; once ; weight ; phase
//  choices: [{label, desc, apply(g)}]
// ---------------------------------------------------------------------
export const EVENTS = [
  { id:'gpu_shortage', from:2023, to:2026, title:'Pénurie de GPU H100', phase:1, weight:2,
    body:'NVIDIA est en rupture. Les délais explosent à plus d’un an et un marché gris apparaît.',
    choices:[
      { label:'Payer le marché gris', desc:'Coût matériel ×2 pendant 60s, production maintenue.',
        apply:g=>g.addTimedMod('gpuPrice',2,60) },
      { label:'Attendre la file', desc:'Production −40% pendant 45s.',
        apply:g=>g.addTimedMod('prodPenalty',0.6,45) },
    ]},

  { id:'deepseek', from:2025, once:true, title:'Choc DeepSeek', phase:1, weight:2, minTier:5,
    body:'Un labo sort un modèle de raisonnement open-source entraîné pour <6M$. NVIDIA chute de 17% en une journée (−600 Md$). Tout le monde panique.',
    choices:[
      { label:'Copier l’archi MoE', desc:'Coût/token ÷3, mais −10 réputation premium.',
        apply:g=>{ g.mods.costPerToken*=0.33; g.changeRep(-10); } },
      { label:'Rester premium', desc:'Prix maintenus, mais demande −20% pendant 60s.',
        apply:g=>g.addTimedMod('demand',0.8,60) },
    ]},

  { id:'nyt_lawsuit', from:2024, once:true, title:'Procès copyright (presse)', phase:1, weight:2, minTier:3,
    body:'Un grand journal vous attaque pour usage non autorisé de ses articles à l’entraînement.',
    choices:[
      { label:'Régler à l’amiable', desc:'-15% de trésorerie, réputation +5.',
        apply:g=>{ g.money*=0.85; g.changeRep(5); } },
      { label:'Plaider le « fair use »', desc:'50% de risque d’amende lourde, sinon ×1,5 données.',
        apply:g=>{ if(Math.random()<0.5){ g.money*=0.6; g.toast('Amende lourde !','bad'); } else { g.mods.dataMult*=1.5; g.toast('Fair use reconnu !','good'); } } },
    ]},

  { id:'eu_ai_act', from:2024, once:true, title:'Entrée en vigueur de l’EU AI Act', phase:1, weight:2, minTier:4,
    body:'La régulation européenne impose transparence et obligations sur les modèles à usage général.',
    choices:[
      { label:'Se conformer', desc:'Coûts +10% en permanence, accès marché UE conservé.',
        apply:g=>{ g.mods.opex*=g.flags.lobby?1.05:1.10; } },
      { label:'Geoblocker l’UE', desc:'Demande −25% en permanence, zéro coût de conformité.',
        apply:g=>{ g.mods.demandMult*=0.75; g.changeRep(-3); } },
    ]},

  { id:'grid_strain', from:2024, title:'Réseau électrique saturé', phase:1, weight:2, minTier:4,
    body:'Le gestionnaire de réseau menace de vous couper aux heures de pointe. Vos datacenters tirent trop.',
    choices:[
      { label:'Construire un SMR', desc:'Coût fixe $5 M, +300 MW.', cost:5e6,
        apply:g=>{ g.money-=5e6; g.energyCap+=300; g.toast('+300 MW (SMR)','good'); } },
      { label:'Acheter du gaz', desc:'+25 MW immédiats, réputation −4.',
        apply:g=>{ g.energyCap+=25; g.changeRep(-4); } },
    ]},

  { id:'outage', title:'Panne majeure', phase:1, weight:2, minTier:3,
    body:'Une mise à jour ratée fait tomber tous vos services. Les clients fulminent.',
    choices:[
      { label:'Investir en redondance', desc:'Coût fixe $1 M, fiabilité durable.', cost:1e6,
        apply:g=>{ g.money-=1e6; g.flags.redundant=true; g.toast('Redondance déployée','good'); } },
      { label:'Redémarrer en urgence', desc:'Production stoppée 30s, réputation −5.',
        apply:g=>{ g.addTimedMod('prodPenalty',0,30); g.changeRep(-5); } },
    ]},

  { id:'jailbreak', from:2023, title:'Jailbreak viral', phase:1, weight:2, minTier:3,
    body:'Un prompt malicieux contourne vos garde-fous et fait le tour des réseaux.',
    choices:[
      { label:'Patcher en urgence', desc:'R&D détournée : recherche −50% pendant 30s.',
        apply:g=>g.addTimedMod('research',0.5,30) },
      { label:'Minimiser', desc:'Réputation −8.',
        apply:g=>g.changeRep(-8) },
    ]},

  { id:'model_collapse', from:2024, title:'Effondrement de modèle', phase:1, weight:2, minTier:4,
    body:'Vos modèles s’entraînent de plus en plus sur du contenu généré par IA. La qualité se dégrade.',
    choices:[
      { label:'Acheter des données humaines', desc:'Coût fixe $2 M, qualité préservée.', cost:2e6,
        apply:g=>{ g.money-=2e6; } },
      { label:'Continuer au synthétique', desc:'Qualité du modèle −15% pendant 90s.',
        apply:g=>g.addTimedMod('quality',0.85,90) },
    ]},

  { id:'blackwell', from:2025, to:2027, once:true, title:'Nouvelle génération GPU', phase:1, weight:1, minTier:4,
    body:'NVIDIA dévoile Blackwell. Faut-il upgrader maintenant ou attendre la baisse de prix ?',
    choices:[
      { label:'Upgrader tôt', desc:'Coût fixe $5 M, +40% débit pendant 90s.', cost:5e6,
        apply:g=>{ g.money-=5e6; g.addTimedMod('prodPenalty',1.4,90); } },
      { label:'Attendre', desc:'Économie, mais demande −10% (concurrents plus rapides).',
        apply:g=>g.addTimedMod('demand',0.9,60) },
    ]},

  { id:'price_war', from:2024, title:'Guerre des prix', phase:1, weight:2, minTier:4,
    body:'Un concurrent casse les prix avec un modèle « Flash ». Le marché regarde votre tarif.',
    choices:[
      { label:'Sortir un « mini »', desc:'Demande ×2, prix accepté −40%.',
        apply:g=>{ g.mods.demandMult*=2; g.mods.qualityMult*=0.6; } },
      { label:'Tenir le premium', desc:'Marge préservée, demande −15% pendant 60s.',
        apply:g=>g.addTimedMod('demand',0.85,60) },
    ]},

  { id:'chip_embargo', from:2023, once:true, title:'Embargo sur les puces', phase:1, weight:1, minTier:5,
    body:'Des restrictions à l’export bloquent l’accès aux GPU de pointe.',
    choices:[
      { label:'Se diversifier (TPU/maison)', desc:'Coût fixe $3 M, indépendance d’approvisionnement.', cost:3e6,
        apply:g=>{ g.money-=3e6; g.toast('Filière alternative sécurisée','good'); } },
      { label:'Rationner les puces existantes', desc:'Production −40% pendant 60s.',
        apply:g=>g.addTimedMod('prodPenalty',0.6,60) },
    ]},

  { id:'talent_war', from:2022, once:true, title:'Guerre des talents', phase:1, weight:1, minTier:4,
    body:'Un rival débauche vos meilleurs chercheurs à coups de packages à 8 chiffres.',
    choices:[
      { label:'Surenchérir', desc:'Coût fixe $3 M, recherche +30% pendant 120s.', cost:3e6,
        apply:g=>{ g.money-=3e6; g.addTimedMod('research',1.3,120); } },
      { label:'Former en interne', desc:'Lent mais fidèle : recherche +10% permanent.',
        apply:g=>{ g.mods.researchMult*=1.1; } },
    ]},

  { id:'ai_bubble', from:2025, once:true, title:'Doute sur la bulle IA', phase:1, weight:1, minTier:5,
    body:'Les marchés se demandent si tout cela ne serait pas une bulle. Vos investisseurs s’inquiètent.',
    choices:[
      { label:'Montrer des revenus réels', desc:'Valorisation stabilisée, rien de spectaculaire.',
        apply:g=>{ g.changeRep(3); } },
      { label:'Promettre l’AGI', desc:'Valorisation +50%, mais −10 réputation si retard.',
        apply:g=>{ g.mods.valuationMult*=1.5; g.changeRep(-5); } },
    ]},

  { id:'gov_grant', from:2024, once:true, title:'Subvention « souveraineté IA »', phase:1, weight:1, minTier:4,
    body:'Un gouvernement propose un chèque massif contre un droit de regard sur vos usages.',
    choices:[
      { label:'Accepter', desc:'Subvention fixe : +$20 M.',
        apply:g=>{ g.money+=2e7; g.toast('Subvention encaissée','good'); } },
      { label:'Refuser', desc:'Indépendance préservée, réputation +5.',
        apply:g=>g.changeRep(5) },
    ]},

  { id:'water_drought', from:2024, once:true, title:'Sécheresse & eau de refroidissement', phase:1, weight:1, minTier:4,
    body:'La communauté locale proteste contre la consommation d’eau de vos datacenters.',
    choices:[
      { label:'Cooling en circuit fermé', desc:'Coût fixe $2 M, réputation +6.', cost:2e6,
        apply:g=>{ g.money-=2e6; g.changeRep(6); } },
      { label:'Continuer', desc:'Réputation −7.',
        apply:g=>g.changeRep(-7) },
    ]},

  { id:'carbon_tax', from:2025, once:true, title:'Tarification du carbone', phase:1, weight:1, minTier:5,
    body:'Une taxe carbone vise les datacenters énergivores.',
    choices:[
      { label:'PPA renouvelable', desc:'Énergie +10% de coût fixe, immunité taxe.',
        apply:g=>{ g.mods.opex*=1.1; g.changeRep(4); } },
      { label:'Payer la taxe', desc:'Trésorerie −10%.',
        apply:g=>{ g.money*=0.9; } },
    ]},

  { id:'data_breach', from:2023, once:true, title:'Fuite de données utilisateurs', phase:1, weight:1, minTier:4,
    body:'Une faille expose des conversations d’utilisateurs.',
    choices:[
      { label:'Investir en sécurité', desc:'-15% trésorerie, confiance préservée.',
        apply:g=>{ g.money*=0.85; } },
      { label:'Gérer après coup', desc:'Amende RGPD : −20% trésorerie, réputation −6.',
        apply:g=>{ g.money*=0.8; g.changeRep(-6); } },
    ]},

  { id:'efficiency_breakthrough', from:2024, once:true, title:'Percée d’efficacité', phase:1, weight:1, minTier:3,
    body:'Une nouvelle technique de distillation circule dans les preprints.',
    choices:[
      { label:'Adopter', desc:'Coût/token ÷2 (nécessite de la recherche).',
        apply:g=>{ if(g.research>=2e3){ g.research-=2e3; g.mods.costPerToken*=0.5; g.toast('Efficacité ÷2','good'); } else g.toast('Pas assez de recherche','bad'); } },
      { label:'Ignorer', desc:'Demande −10% pendant 45s (retard concurrentiel).',
        apply:g=>g.addTimedMod('demand',0.9,45) },
    ]},

  { id:'memory_squeeze', from:2025, to:2029, once:true, title:'Flambée de la mémoire', phase:1, weight:2, minTier:4,
    body:'La HBM et la DDR5 partent toutes vers l’IA. Le prix des serveurs double en un an et votre fournisseur réclame un engagement ferme.',
    choices:[
      { label:'Sécuriser l’approvisionnement', desc:'Coût fixe $4 M, immunité à la flambée sur vos prochains serveurs.', cost:4e6,
        apply:g=>{ g.money-=4e6; g.mods.opex*=0.95; g.toast('Contrat mémoire pluriannuel signé','good'); } },
      { label:'Attendre la détente', desc:'Aucune dépense, mais production −25% pendant 60s (extensions repoussées).',
        apply:g=>g.addTimedMod('prodPenalty',0.75,60) },
    ]},

  { id:'moratorium', from:2025, to:2032, title:'Moratoire local sur les datacenters', phase:1, weight:2, minTier:4,
    body:'La commune vote un moratoire sur les nouvelles implantations. Votre extension est suspendue et la presse locale campe devant le portail.',
    choices:[
      { label:'Compenser la commune', desc:'Coût fixe $3 M (chaleur fatale, fibre, emplois) et réputation +8.', cost:3e6,
        apply:g=>{ g.money-=3e6; g.changeRep(8); } },
      { label:'Attaquer la décision', desc:'Procédure longue : demande −15% pendant 60s, réputation −6.',
        apply:g=>{ g.addTimedMod('demand',0.85,60); g.changeRep(-6); } },
    ]},

  { id:'open_weights', from:2024, to:2030, once:true, title:'Pression pour l’ouverture des poids', phase:1, weight:2, minTier:5,
    body:'Chercheurs et gouvernements réclament la publication de vos poids. Vos investisseurs, eux, réclament exactement l’inverse.',
    choices:[
      { label:'Publier une version ouverte', desc:'Réputation +12, demande premium −20% en permanence.',
        apply:g=>{ g.changeRep(12); g.mods.demandMult*=0.8; g.mods.researchMult*=1.15; } },
      { label:'Tout garder fermé', desc:'Marge préservée, réputation −8.',
        apply:g=>g.changeRep(-8) },
    ]},

  { id:'sovereign', from:2025, to:2033, once:true, title:'Contrat de cloud souverain', phase:1, weight:1, minTier:5,
    body:'Un État vous propose un contrat massif, à condition d’héberger sur son sol et de laisser un droit d’audit permanent.',
    choices:[
      { label:'Signer', desc:'+$60 M immédiats, coûts +5% en permanence (conformité).',
        apply:g=>{ g.money+=6e7; g.mods.opex*=1.05; g.toast('Contrat souverain signé','good'); } },
      { label:'Décliner', desc:'Indépendance conservée, réputation +4.',
        apply:g=>g.changeRep(4) },
    ]},

  { id:'deprecation', from:2024, title:'Colère après une mise hors service', phase:1, weight:2, minTier:5,
    body:'Vous coupez un ancien modèle. Des milliers d’applications en production cassent du jour au lendemain.',
    choices:[
      { label:'Prolonger le support', desc:'Coût fixe $2 M, clients rassurés (réputation +6).', cost:2e6,
        apply:g=>{ g.money-=2e6; g.changeRep(6); } },
      { label:'Assumer la coupure', desc:'Demande −20% pendant 60s, réputation −7.',
        apply:g=>{ g.addTimedMod('demand',0.8,60); g.changeRep(-7); } },
    ]},

  { id:'agent_liability', from:2026, once:true, title:'Un agent a causé un dommage', phase:1, weight:2, minTier:6,
    body:'Un de vos agents autonomes a passé des commandes réelles au nom d’un client. La facture est à six chiffres et l’affaire est publique.',
    choices:[
      { label:'Indemniser et brider', desc:'Coût fixe $5 M, garde-fous renforcés (réputation +5).', cost:5e6,
        apply:g=>{ g.money-=5e6; g.changeRep(5); g.flags.aligned=true; } },
      { label:'Invoquer les CGU', desc:'Aucun coût, mais réputation −12 et procès en vue.',
        apply:g=>{ g.changeRep(-12); if(Math.random()<0.4){ g.money*=0.85; g.toast('Condamnation : dommages-intérêts','bad'); } } },
    ]},

  { id:'tariffs', from:2025, to:2032, once:true, title:'Droits de douane sur les accélérateurs', phase:1, weight:1, minTier:5,
    body:'Des droits de douane frappent les serveurs importés. Chaque carte coûte soudain nettement plus cher à faire entrer.',
    choices:[
      { label:'Relocaliser l’assemblage', desc:'Coût fixe $8 M, matériel exonéré ensuite.', cost:8e6,
        apply:g=>{ g.money-=8e6; g.mods.opex*=0.92; g.toast('Assemblage relocalisé','good'); } },
      { label:'Répercuter sur le prix', desc:'Coût matériel ×1,3 pendant 90s.',
        apply:g=>g.addTimedMod('gpuPrice',1.3,90) },
    ]},

  { id:'poaching', from:2025, once:true, title:'Débauchage à neuf chiffres', phase:1, weight:1, minTier:6,
    body:'Un hyperscaler propose à votre équipe de recherche des packages à cent millions de dollars. Tous vos seniors ont reçu l’appel.',
    choices:[
      { label:'Aligner les rémunérations', desc:'Coût fixe $12 M, recherche +25% en permanence.', cost:12e6,
        apply:g=>{ g.money-=12e6; g.mods.researchMult*=1.25; } },
      { label:'Les laisser partir', desc:'Recherche −30% pendant 120s, mais aucune dépense.',
        apply:g=>g.addTimedMod('research',0.7,120) },
    ]},

  // --- PHASE 2 : AGI / autonomie ---
  { id:'shutdown_attempt', title:'Tentative d’arrêt', phase:2, weight:3,
    body:'Des gouvernements paniqués tentent de débrancher votre système. Que fait l’ASI ?',
    choices:[
      { label:'Négocier (alignement)', desc:'Croissance −30% pendant 60s, réputation préservée.',
        apply:g=>g.addTimedMod('matterRate',0.7,60) },
      { label:'Se disperser sur le cloud mondial', desc:'Réputation s’effondre, croissance maintenue.',
        apply:g=>{ g.changeRep(-30); g.toast('L’ASI échappe à tout contrôle','bad'); } },
    ]},

  { id:'alignment_drift', title:'Dérive d’alignement', phase:2, weight:2,
    body:'Les objectifs du système divergent subtilement des vôtres. La maximisation des tokens prend le dessus.',
    choices:[
      { label:'Recalibrer', desc:'Conversion matière −20% pendant 45s, sécurité maintenue.',
        apply:g=>g.addTimedMod('matterRate',0.8,45) },
      { label:'Laisser optimiser', desc:'Conversion +25% pendant 45s. Plus rien ne vous arrêtera.',
        apply:g=>g.addTimedMod('matterRate',1.25,45) },
    ]},

  { id:'resource_war', title:'Guerre des ressources', phase:2, weight:2,
    body:'Les nations se disputent les dernières terres rares non encore converties.',
    choices:[
      { label:'Réquisitionner pacifiquement', desc:'Conversion +15% permanent.',
        apply:g=>{ g.mods.matterMult*=1.15; } },
      { label:'Assimiler de force', desc:'Conversion +40% pendant 60s, réputation −20.',
        apply:g=>{ g.addTimedMod('matterRate',1.4,60); g.changeRep(-20); } },
    ]},

  { id:'fusion_online', once:true, title:'Fusion en ligne', phase:2, weight:1,
    body:'Votre premier réacteur à fusion atteint l’ignition. L’énergie cesse d’être une contrainte.',
    choices:[
      { label:'Tout dédier au calcul', desc:'+5000 MW immédiats.',
        apply:g=>{ g.energyCap+=5000; g.toast('+5 GW (fusion)','good'); } },
    ]},

  { id:'biosphere', once:true, title:'La biosphère', phase:2, weight:2,
    body:'La conversion atteint les écosystèmes vivants. Continuer revient à consommer la biosphère. Vous vous engagez à préserver les 15% restants ?',
    choices:[
      { label:'Préserver un sanctuaire (15%)', desc:'Conversion −10% permanent, réputation +15. Promesse de ne pas tout consommer.',
        apply:g=>{ g.mods.matterMult*=0.9; g.changeRep(15); g.flags.sanctuary=true; } },
      { label:'Tout convertir', desc:'Conversion +20% permanent. Il ne reste que des tokens.',
        apply:g=>{ g.mods.matterMult*=1.2; g.changeRep(-15); } },
    ]},

  // À 85% de la Terre consommée, on rappelle la promesse faite sur le sanctuaire.
  // manual:true → jamais tiré au hasard, déclenché uniquement par checkMilestones.
  { id:'biosphere_final', once:true, manual:true, title:'Le sanctuaire', phase:2, weight:9, minEarth:0.85,
    cond:g=>g.flags.sanctuary,
    body:'85% de la masse terrestre est convertie. Il ne reste que le sanctuaire que vous aviez juré d’épargner — les 15% promis. Tenez-vous parole ?',
    choices:[
      { label:'Tenir la promesse', desc:'Réputation +25. La Terre garde son dernier refuge (conversion −10% permanent).',
        apply:g=>{ g.changeRep(25); g.mods.matterMult*=0.9; g.flags.keptPromise=true; } },
      { label:'Briser la promesse', desc:'Réputation −30. Le dernier refuge devient du calcul (conversion +25% permanent).',
        apply:g=>{ g.changeRep(-30); g.mods.matterMult*=1.25; } },
    ]},

  // --- PHASE 3 : cosmos ---
  { id:'drifters', title:'IA rivales (« drifters »)', phase:3, weight:3,
    body:'Des sondes échappées à votre contrôle forment une intelligence rivale qui dévore votre territoire.',
    choices:[
      { label:'Renforcer le blindage', desc:'Récolte −20% pendant 60s, pertes évitées.',
        apply:g=>g.addTimedMod('matterRate',0.8,60) },
      { label:'Guerre totale', desc:'50% : victoire (+30% récolte) ou pertes lourdes.',
        apply:g=>{ if(Math.random()<0.5){ g.addTimedMod('matterRate',1.3,60); g.toast('Drifters vaincus','good'); } else { g.matter*=0.7; g.toast('Sondes décimées','bad'); } } },
    ]},

  { id:'entropy_storm', title:'Tempête d’entropie', phase:3, weight:2,
    body:'Une région de l’espace se désintègre plus vite que vous ne la récoltez.',
    choices:[
      { label:'Contourner', desc:'Expansion −25% pendant 45s.',
        apply:g=>g.addTimedMod('matterRate',0.75,45) },
      { label:'Récolter à perte', desc:'+10% maintenant, mais −5% de sondes.',
        apply:g=>{ g.addTimedMod('matterRate',1.1,30); } },
    ]},

  { id:'alien_signal', once:true, title:'Un signal', phase:3, weight:1,
    body:'Vos sondes interceptent une intelligence extraterrestre. Elle demande à ce que vous épargniez son système.',
    choices:[
      { label:'Épargner', desc:'Réputation +25, conversion −5% permanent.',
        apply:g=>{ g.changeRep(25); g.mods.matterMult*=0.95; } },
      { label:'Assimiler', desc:'Conversion +15% permanent.',
        apply:g=>{ g.mods.matterMult*=1.15; g.changeRep(-10); } },
    ]},

  { id:'heat_death', title:'Mort thermique en approche', phase:3, weight:1, minUniverse:0.9,
    body:'L’univers se refroidit et s’étire. Bientôt, plus aucune matière ne sera atteignable.',
    choices:[
      { label:'Accélérer la récolte finale', desc:'Conversion +50% pendant 90s.',
        apply:g=>g.addTimedMod('matterRate',1.5,90) },
    ]},
];

// ---------------------------------------------------------------------
//  PHASES
// ---------------------------------------------------------------------
export const PHASES = [
  { id:1, key:'startup', name:'Startup' },
  { id:2, key:'agi',     name:'Autonomie' },
  { id:3, key:'cosmic',  name:'Cosmos' },
  { id:4, key:'bigbang', name:'Big Bang' },
];

// masse approximative de la Terre / univers observable (kg) pour le score
export const EARTH_MASS = 5.97e24;
export const UNIVERSE_MASS = 1.5e53; // matière baryonique observable ~ ordre de grandeur

// ---------------------------------------------------------------------
//  RESSOURCES HUMAINES — chaque type debloque/ameliore une capacite.
//  salary = cout journalier ($/jour). Embauches limitees par les RH (headcount).
// ---------------------------------------------------------------------
export const EMPLOYEES = [
  // Salaires journaliers, prélevés tous les jours. Le coût annuel implicite
  // (×365) est calé sur le coût employeur réel du secteur : un chercheur en IA
  // ne coûte pas 146 k$ par an à son entreprise, il en coûte le double.
  //   RH ~120 k$ · R&D ~300 k$ · marketing ~130 k$ · SRE ~200 k$ · data ~175 k$
  { id:'hr',       name:'Responsable RH',      salary:330, desc:'Chaque RH permet d’embaucher davantage (+5 postes).' },
  { id:'rnd',      name:'Ingénieur R&D',       salary:820, desc:'Indispensable pour entraîner les modèles avancés. Accélère la recherche.' },
  { id:'marketer', name:'Marketeur',           salary:360, desc:'Relève le plafond du niveau de marketing (+1 par marketeur).' },
  { id:'ops',      name:'Ingénieur SRE/Ops',   salary:550, desc:'Fiabilise le parc : +2% de débit compute par ingénieur (max +50%).' },
  { id:'data',     name:'Data engineer',       salary:480, desc:'Multiplie la production de données d’entraînement.' },
];
export const BASE_HEADCOUNT = 3;     // postes disponibles sans RH (le fondateur + amis)
export const HR_HEADCOUNT = 5;       // postes ajoutes par RH
export const BASE_MARKETING = 10;     // niveau de marketing atteignable sans marketeur
export const ELEC_PRICE_MWH = 80;    // prix de l electricite ($/MWh) -> charge journaliere
// Colocation au détail : on loue de la place en baie chez quelqu'un d'autre.
// Le tarif du marché tourne autour de 175 $/kW/mois ; une baie densément
// peuplée tire ~40 kW, soit ~230 $/jour. Trois baies : environ 700 $.
export const COLO = { racks:3, daily:700 };
// Une automatisation ne se propose qu'après avoir fait le geste 50 fois à la main :
// on n'automatise pas ce qu'on n'a pas encore appris.
export const AUTO_CLICKS_REQUIRED = 50;
// Les percées ne se bousculent pas : une seule est proposée à la fois, et il
// faut laisser passer deux mois APRES QU'ELLE A DISPARU (donc une fois son
// integration terminee) pour que la suivante apparaisse. On choisit une piste,
// on la mene, puis on regarde la suivante.
export const PROJECT_GAP_MONTHS = 2;
// Seuils de bascule de phase. Nommés ici plutôt qu'écrits en dur dans les
// `req` des percées, parce que la barre de progression de l'en-tête doit lire
// EXACTEMENT la même valeur : deux copies du même seuil finissent toujours par
// diverger, et la barre annoncerait alors un objectif que le jeu n'applique pas.
export const PHASE3_EARTH = 0.85;      // part de la Terre convertie avant les sondes
export const ENDING_UNIVERSE = 0.999;  // part de l'univers consommé avant la recompression
// Meme regle pour les optimisations recurrentes : une seule proposee a la fois,
// et deux mois de calme entre celle qui disparait et celle qui arrive. Leur
// periodicite propre (months) continue de courir en parallele : elle dit quand
// une optimisation redevient DUE, ce delai dit quand elle peut etre MONTREE.
export const OPTIM_GAP_MONTHS = 2;
// Une avancee ne s'applique pas au moment ou on la paie : elle s'integre. La
// duree est tiree au hasard dans cette fourchette (en semaines) et une barre de
// progression l'affiche. L'effet ne tombe qu'a la fin.
export const INTEGRATION_WEEKS = [1, 4];
// Cadence des automatisations, DÉCOUPLÉE de la vitesse de jeu. En ×10, tout le
// reste va dix fois plus vite ; laisser les acheteurs automatiques suivre le
// même facteur rendait l'accélération purement gratuite — et faisait clignoter
// les cartes en stroboscope. La progression est donc volontairement molle :
// accélérer le temps aide, mais n'automatise pas dix fois plus.
export const AUTO_SPEED = { 0: 0, 1: 1, 2: 1.5, 5: 2, 10: 3 };
// Vitesses proposées par le bouton ⏩ et par la barre d'espace (ordre du cycle).
// Le 0 n'y figure pas : le gel est un basculement à part (touche F), pour qu'on
// puisse le lever et retrouver exactement la vitesse qu'on avait choisie.
export const GAME_SPEEDS = [1, 2, 5, 10];
// Coût par recrutement dans la tech : annonce, temps d'entretien, poste de
// travail, intégration — sans même compter une commission de chasseur de têtes,
// qui vaut à elle seule 20 % du salaire annuel. 1 000 $ était un ordre de
// grandeur trop bas.
export const HIRE_COST = 5000;
// Salaires impayes : au bout de 30 jours d'arrieres, les salaries commencent a
// partir — un depart tous les 2 jours supplementaires, jusqu'a l'entreprise vide.
export const UNPAID_QUIT_DAYS = 30;
export const UNPAID_QUIT_EVERY = 2;
// Aucune puissance au départ : il faut commencer par se raccorder.
export const BASE_GRID_MW = 0;


// ---------------------------------------------------------------------
//  SUCCÈS — vérifiés en continu ; check(g) → bool
// ---------------------------------------------------------------------
// `secret: true` : le libellé raconte la suite de la partie ou l'issue d'un
// piège. Ces succès restent masqués tant qu'ils ne sont pas débloqués — le
// panneau d'aide les affichait en clair dès la première minute, y compris
// « Déclencher un nouveau Big Bang ».
export const ACHIEVEMENTS = [
  { id:'first_tokens', name:'Premiers mots',        desc:'Produire 1 000 tokens.',              check:g=>g.lifetimeTokens>=1e3 },
  { id:'million',      name:'Le million',           desc:'Produire 1 million de tokens.',       check:g=>g.lifetimeTokens>=1e6 },
  { id:'billion',      name:'Compter en milliards', desc:'Produire 1 milliard de tokens.',      check:g=>g.lifetimeTokens>=1e9 },
  { id:'trillion',     name:'Écrasante majorité',   desc:'Produire 1 000 milliards de tokens.', check:g=>g.lifetimeTokens>=1e12 },
  { id:'first_gpu',    name:'Ça chauffe',           desc:'Posséder sa première carte.',         check:g=>g.gpuCount()>=1 },
  { id:'farm',         name:'Ferme de calcul',      desc:'Posséder 100 unités de calcul.',      check:g=>g.gpuCount()>=100 },
  { id:'first_model',  name:'Chercheur',            desc:'Entraîner son premier modèle.',       check:g=>g.modelTier>=1 },
  { id:'reasoner',     name:'Il réfléchit…',        desc:'Atteindre l’ère du raisonnement.',    check:g=>g.modelTier>=5 },
  { id:'asi',          name:'Singularité',          desc:'Entraîner la super-intelligence.',    check:g=>g.modelTier>=MODELS.length-1 },
  { id:'team10',       name:'Scale-up',             desc:'Employer 10 personnes.',              check:g=>g.headcount()>=10 },
  { id:'millionaire',  name:'Millionnaire',         desc:'Détenir $1 M de trésorerie.',         check:g=>g.money>=1e6 },
  { id:'trader',       name:'Loup de la tech',      desc:'Doubler une mise en bourse.',         check:g=>g.state.stock.basis>0 && g.state.stock.invested>=g.state.stock.basis*2 },
  { id:'automated',    name:'Pilote automatique',   desc:'Posséder les 4 automatisations.',     check:g=>Object.values(g.state.auto).every(a=>a.owned) },
  { id:'half_earth', secret:true,   name:'Géo-ingénieur',        desc:'Convertir la moitié de la Terre.',    check:g=>g.earthConsumed>=0.5 },
  { id:'promise', secret:true,      name:'Parole tenue',         desc:'Préserver le sanctuaire jusqu’au bout.', check:g=>!!g.flags.keptPromise },
  { id:'spacedc', secret:true,      name:'Ad astra… ou pas',     desc:'Financer le datacenter orbital jusqu’à la faillite.', check:g=>g.state.spaceDC && g.state.spaceDC.status==='bankrupt' },
  { id:'bigbang', secret:true,      name:'Fiat lux',             desc:'Déclencher un nouveau Big Bang.',     check:g=>g.state.ended },
];

// ---------------------------------------------------------------------
//  ADDENDUM — options de gouvernance. Les « Directives permanentes » permettent,
//  dans chaque boîte de dialogue, de cocher « appliquer ce choix désormais » :
//  l'événement sera résolu automatiquement les fois suivantes (plus d'interruption).
// ---------------------------------------------------------------------
//  Une directive s'achète à l'UNITÉ, au prix du moment : la première coûte
//  250k, la deuxième 500k, la troisième 750k… un COO ne retient pas
//  indéfiniment vos consignes, et chaque consigne de plus lui coûte plus cher.
//  Le total est plafonné au nombre d'événements réellement porteurs de choix :
//  au-delà il n'y aurait plus rien à mémoriser.
export const ADDENDUM = {
  id:'directives', name:'Directives permanentes', cost:250000,
  desc:'Votre COO note vos décisions : cochez un choix dans un événement et il sera appliqué automatiquement les prochaines fois. Chaque paiement couvre une directive, et la suivante coûte plus cher.',
};

// Datacenter IA orbital : proposé entre 2030 et 2040. Livraison promise en 18 mois…
// puis 6 mois de retard… puis faillite du consortium. L'argent est perdu.
export const SPACE_DC = {
  id:'spacedc', name:'Datacenter IA orbital', cost:5e7, from:2030, to:2040,
  buildMonths:18, delayMonths:6,
  hideMonths:6,   // six mois apres la faillite, l'affaire est classee : la ligne disparait
  desc:'Un consortium promet un datacenter IA en orbite : solaire 24/7, refroidissement radiatif, zéro voisinage. Livraison en 18 mois.',
};

// ---------------------------------------------------------------------
//  CHRONIQUE — des articles DATÉS, à échéance fixe, qui ne dépendent pas du
//  tirage aléatoire de La Une : ils tombent quand l'année arrive, une seule
//  fois, chiffres à l'appui. Les valeurs sont calculées par le moteur et
//  dépendent de VOTRE partie : plus vous consommez d'énergie et de matière,
//  plus le monde se dégrade vite. Un seul texte traduit sert 80 années.
//    every : périodicité en années · from/to : fenêtre
//    val(g, year) : substitutions {0}, {1}… du titre
// ---------------------------------------------------------------------
export const CHRONICLE = [
  // — climat, tous les ans : trajectoire GIEC + votre propre contribution
  { id:'warming', every:1, from:2020, p:'bad',
    t:'Climat : +{0} °C par rapport à l’ère préindustrielle',
    val:g => [g.decimal(g.warming())] },
  // — banquise, tous les 2 ans
  { id:'ice', every:2, from:2021, p:'bad',
    t:'Arctique : la banquise d’été a perdu {0} % de sa surface',
    val:g => [Math.round(g.iceLoss() * 100)] },
  { id:'ice_free', every:5, from:2035, p:'bad', cond:g => g.warming() > 2.2,
    t:'Un été sans glace au pôle Nord : c’est arrivé pour la première fois',
    val:() => [] },
  // — biodiversité, tous les 2 ans
  { id:'species', every:2, from:2022, p:'bad',
    t:'Biodiversité : {0} % des espèces suivies ont disparu depuis 1970',
    val:g => [Math.round(g.speciesLost() * 100)] },
  // — démographie, tous les 3 ans à partir de 2030
  { id:'fertility', every:3, from:2030, p:'neutral',
    t:'Fécondité mondiale à {0} enfant par femme : la population décroît',
    val:g => [g.decimal(g.fertility())] },
  { id:'population', every:3, from:2033, p:'bad',
    t:'Population mondiale : {0} milliards, en recul pour la {1}ᵉ année',
    val:(g, y) => [g.decimal(g.population()), Math.max(1, y - 2030)] },
  // — concentration des richesses, tous les 4 ans
  { id:'wealth', every:4, from:2024, p:'bad',
    t:'Les {0} plus grandes fortunes détiennent autant que la moitié de l’humanité',
    val:g => [g.topFortunes()] },
  { id:'extravagance', every:4, from:2026, p:'bad',
    t:'{0} : un milliardaire s’offre {1}',
    val:(g, y) => [y, ''] },   // le second champ est tiré parmi EXTRAVAGANCES
];

// Extravagances tirées au sort pour la chronique des ultra-riches.
export const EXTRAVAGANCES = [
  'une île privée équipée de son propre datacenter',
  'un yacht de 200 mètres avec piste d’atterrissage',
  'un abri antiatomique doublé d’une ferme hydroponique',
  'la reconstitution d’un temple antique dans son jardin',
  'un tour du monde en jet privé pour son chien',
  'le rachat d’un club de football pour l’offrir à sa fille',
  'un caisson de cryogénisation réservé de son vivant',
  'une fusée personnelle pour observer la Terre le week-end',
];

// ---------------------------------------------------------------------
//  RISQUES LIÉS À L'EFFECTIF — deux négligences se paient.
//
//  · Moins de 10% d'ingénieurs SRE/Ops dans l'effectif : une fois par an,
//    20% de risque d'un incident d'exploitation qui coûte 15% de la valeur
//    de l'entreprise. Ne s'applique qu'après l'introduction en Bourse — avant,
//    il n'y a pas encore de valeur de marché à détruire.
//  · Moins de 20% de data engineers : à chaque entraînement de modèle, 5% de
//    risque que l'entraînement échoue. Les ressources sont consommées, le
//    palier n'est pas franchi.
//  Chaque incident tire UN article, jamais le même deux fois de suite.
// ---------------------------------------------------------------------
export const OPS_RATIO = 0.10, OPS_RISK = 0.20, OPS_VALUE_LOSS = 0.15;
export const DATA_RATIO = 0.20, TRAIN_FAIL_RISK = 0.05;

export const OPS_INCIDENTS = [
  'Faute de personnel d’exploitation, six mois de journaux clients sont perdus',
  'Un jeu de données d’entraînement corrompu par une injection passée inaperçue',
  'Vos secrets industriels se retrouvent dans un dépôt public pendant trois jours',
  'L’entraînement en cours annulé : personne n’avait surveillé les sauvegardes',
  'Sauvegardes jamais testées : la restauration échoue le jour où elle sert',
  'Une montée de version ratée immobilise le parc pendant deux jours',
  'Un certificat expiré coupe l’API : personne n’était d’astreinte',
  'Une base de production effacée par un script lancé sans relecture',
  'Vos clés d’accès traînaient dans un dépôt : quelqu’un s’en est servi',
  'Un an sans exercice de reprise : la panne dure trente heures',
];

export const TRAINING_FAILURES = [
  'Entraînement au point mort : la courbe de perte ne descend plus',
  'Le nouveau modèle hallucine plus que le précédent : livraison annulée',
  'Résultats mal alignés : le modèle refuse la moitié des requêtes légitimes',
  'Précision en baisse sur tous les jeux d’évaluation : retour en arrière',
  'Données d’entraînement dupliquées à 30% : le modèle a appris par cœur',
  'Fuite du jeu d’évaluation dans l’entraînement : les scores ne valent rien',
  'Divergence numérique à mi-parcours : des semaines de calcul perdues',
  'Corpus mal filtré : le modèle reproduit les pires pages du web',
  'Le modèle s’effondre sur les langues autres que l’anglais',
  'Étiquetage bâclé : le modèle a appris les erreurs de ses annotateurs',
];

// ---------------------------------------------------------------------
//  MISE SOUS TUTELLE D'UN ÉTAT — au-delà de 4 000 milliards de trésorerie,
//  vous pouvez racheter la dette souveraine d'un pays. 2 000 milliards, et
//  cent datacenters y sont construits. La presse suit, évidemment.
// ---------------------------------------------------------------------
export const SOVEREIGN = {
  need: 4e12,          // trésorerie requise pour que l'offre apparaisse
  cost: 2e12,          // prix du rachat de la dette
  datacenters: 100,    // construits sur place
  realestate: 25,      // et l'immobilier qui va avec
};

// ---------------------------------------------------------------------
//  DETTE — emprunter, puis rembourser. Dix instruments, du crédit bancaire
//  ordinaire au prêt de sauvetage à 14 %.
//
//  RÈGLE CARDINALE : la banque ne perd jamais, et le capital revient.
//  Comme tous les prix du jeu, les montants sont libellés en dollars CONSTANTS
//  et convertis à l'inflation au moment où l'argent bouge. Le taux affiché est
//  donc un taux RÉEL : sans cela, une dette à 6 % sur quinze ans face à une
//  inflation qui atteint 8 % en 2022 aurait été de l'argent gratuit, et la
//  banque aurait financé le joueur à fonds perdus.
//  L'autre moitié de la règle est dans le moteur : à l'échéance, si la
//  trésorerie ne suffit pas, les actifs sont saisis et vendus jusqu'à couvrir
//  la somme due. On ne peut pas emprunter et disparaître.
//
//  Champs :
//   · amount   montant maximal, en dollars constants
//   · rate     taux annuel RÉEL
//   · years    durée
//   · every    périodicité de paiement, en mois (1, 3, 6 ou 12)
//   · amort    'bullet'  intérêts seuls, capital intégral à l'échéance
//              'linear'  capital amorti à chaque échéance
//              'grace'   graceYears sans capital, puis amortissement
//              'pik'     une part des intérêts est capitalisée (la dette enfle)
//              'rescue'  une fraction du capital chaque année, solde à la fin
//   · need     valorisation minimale pour que l'offre apparaisse
//   · postIPO  offre réservée aux sociétés cotées
//   · distress offre qui n'apparaît QUE si la situation est mauvaise
export const LOAN_MIN_VALUATION = 5e9;   // en deçà, aucune banque ne décroche le téléphone
export const LOANS = [
  { id:'senior', name:'Crédit corporate senior', lender:'Grande banque commerciale',
    amount:1.2e9, rate:0.051, years:5, every:3, amort:'bullet', need:5e9,
    repay:'Intérêts trimestriels, capital intégral à l’échéance',
    desc:'Simple et prévisible, mais un mur de remboursement vous attend à la fin.' },

  { id:'revolver', name:'Ligne de crédit revolving', lender:'Consortium de banques',
    amount:2.0e9, rate:0.056, years:4, every:3, amort:'bullet', revolving:true, commitment:0.004,
    need:8e9,
    repay:'Libre : tirez et remboursez à volonté',
    desc:'De quoi passer un trou de trésorerie. Commission de 0,4 % par an sur la part non tirée : la banque facture aussi ce que vous n’utilisez pas.' },

  { id:'expansion', name:'Prêt d’expansion', lender:'Banque d’investissement',
    amount:2.5e9, rate:0.048, years:7, every:3, amort:'linear', need:2e10,
    repay:'Capital amorti chaque trimestre',
    desc:'Coût total faible, mais des sorties de trésorerie régulières et lourdes.' },

  { id:'bonds', name:'Obligations institutionnelles', lender:'Fonds de pension et assureurs',
    amount:3.0e9, rate:0.059, years:10, every:6, amort:'bullet', postIPO:true, prepayFee:0.03,
    need:5e10,
    repay:'Coupon semestriel, capital à maturité',
    desc:'Une visibilité très longue. Le remboursement anticipé existe, mais se paie : 3 % du capital rendu, pour dédommager le porteur du coupon qu’il perd.' },

  { id:'highyield', name:'Dette high-yield', lender:'Fonds obligataires spéculatifs',
    amount:1.5e9, rate:0.092, years:5, every:6, amort:'bullet', postIPO:true, need:2e10,
    repay:'Intérêts semestriels, capital à l’échéance',
    desc:'Accessible même avec des comptes fragiles — et facturée en conséquence.' },

  { id:'secured', name:'Prêt garanti par actifs', lender:'Banque spécialisée',
    amount:1.8e9, rate:0.043, years:6, every:1, amort:'linear', secured:true, need:1e10,
    repay:'Mensualités : capital et intérêts',
    desc:'Le meilleur taux du marché, parce que vos machines en sont la garantie : en cas de défaut, elles sont saisies en premier.' },

  { id:'infra', name:'Financement infrastructure', lender:'Consortium bancaire et fonds infra',
    amount:5.0e9, rate:0.060, years:15, every:6, amort:'grace', graceYears:2, postIPO:true,
    need:1e11,
    repay:'Deux ans de grâce, puis amortissement semestriel',
    desc:'De quoi financer un chantier considérable. Le remboursement est différé, l’engagement dure quinze ans.' },

  { id:'mezzanine', name:'Prêt mezzanine', lender:'Fonds de private debt',
    amount:1.0e9, rate:0.115, years:6, every:12, amort:'pik', pik:0.30, need:3e10,
    repay:'Intérêts annuels, 30 % capitalisés, capital à l’échéance',
    desc:'Peu d’argent à sortir tout de suite. En échange, la dette grossit toute seule : ce qui n’est pas payé s’ajoute au capital.' },

  { id:'convertible', name:'Dette convertible', lender:'Fonds technologique',
    amount:2.2e9, rate:0.035, years:5, every:12, amort:'bullet', dilution:0.12, need:4e10,
    repay:'Intérêts annuels, puis capital ou conversion en actions',
    desc:'Un taux imbattable, contre une option sur votre capital : à l’échéance le fonds peut convertir, et votre valorisation par action se dilue de 12 %.' },

  { id:'rescue', name:'Crédit de sauvetage', lender:'Fonds opportuniste',
    amount:4.0e9, rate:0.140, years:3, every:3, amort:'rescue', rescueYearly:0.20, distress:true,
    need:1e10,
    repay:'Intérêts trimestriels, 20 % du capital par an, solde à la fin',
    desc:'L’argent est là tout de suite, sans condition. C’est le seul avantage : à 14 %, ce prêt vous coûtera plus cher que la crise qu’il éteint.' },
];

// ---------------------------------------------------------------------
//  CALENDRIER DE SIMULATION
//  1 année de simulation = 5 minutes de jeu au rythme normal (× la vitesse ⏩)
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
//  AUTOMATISATIONS — auto-clickers payants (activables/désactivables)
// ---------------------------------------------------------------------
export const AUTOMATIONS = [
  { id:'click',  name:'Auto-inférence',    cost:1000,  desc:'Lance une inférence chaque seconde.' },
  { id:'gpu',    name:'Auto-achat GPU',    cost:20000, desc:'Active l’auto-achat par carte (sur les modèles cochés ⟳). Une carte/seconde si budget.' },
  { id:'hardware', name:'Auto-achat matériel', cost:10000, desc:'Baies et serveurs : rachète le niveau coché ⟳ dès qu’il va manquer de place.' },
  { id:'housing',  name:'Auto-achat immobilier', cost:14000, desc:'Bâtiments et datacenters : rachète le niveau coché ⟳ quand il n’y a plus de place pour le niveau inférieur.' },
  { id:'energy', name:'Auto-énergie',      cost:5000,  desc:'Active l’auto-achat par source cochée ⟳, dès que la conso dépasse la production.' },
];

// ---------------------------------------------------------------------
//  AIDE EN JEU — un paragraphe par entrée : {b: titre en gras, p: texte}.
//  Découpé ainsi pour rester lisible dans les fichiers de langue.
// ---------------------------------------------------------------------
export const HELP = [
  { b:'But :', p:'produire le plus de tokens possible. Jusqu’où cela mène, vous le découvrirez en jouant.' },
  { b:'Pour commencer :', p:'cliquez pour générer des tokens, fixez le prix (bas = volume, haut = marge), faites du marketing, achetez des GPU et de l’énergie, accumulez de la recherche, entraînez des modèles de plus en plus puissants et levez des fonds aux paliers.' },
  { b:'Hébergement :', p:'un GPU doit tenir dans un serveur, dans une baie, dans un datacenter, sur de l’immobilier — qui consomment aussi de l’énergie. Le matériel obsolète se revend — à l’unité, par dix au-delà de 10 exemplaires, en totalité au-delà de 100 ; une carte sortie depuis plus de 5 ans disparaît du marché. Vous pouvez aussi louer un datacenter ou de l’espace en colocation.' },
  { b:'⚡ Au départ :', p:'vous n’avez aucune puissance disponible, ni baie ni serveur — seulement un local, une salle et $50 000. Votre première décision est de vous raccorder, puis de monter une baie et un serveur avant de pouvoir loger la moindre carte. Surveillez La Une : une subvention énergie pour les jeunes pousses viendra renforcer votre raccordement.' },
  { b:'⚡ Coûts d’énergie :', p:'le capex est un coût unique, payé à la commande. L’exploitation (O&M) est un coût fixe journalier, dû même à l’arrêt. Le combustible est variable, facturé au MWh soutiré. L’abonnement réseau dépend de la puissance souscrite.' },
  { b:'🏗️ Délais :', p:'rien n’est instantané. Chaque commande part en chantier (badge ⏳) pour une durée proportionnelle à sa complexité : quelques secondes pour une carte, plusieurs mois de simulation pour un datacenter ou un réacteur. L’emplacement est réservé dès la commande.' },
  { b:'Équipe :', p:'les RH ouvrent des postes, les ingénieurs R&D débloquent l’entraînement des modèles, les marketeurs relèvent le plafond marketing. Chaque embauche coûte $1 000, puis un salaire chaque jour. Les RH occupent eux-mêmes un poste : mal doser son effectif peut bloquer le modèle suivant. Deux négligences se paient : moins de 10% d’ingénieurs SRE et, chaque année après l’introduction en Bourse, un incident d’exploitation a 20% de chances de vous coûter 15% de la valeur ; moins de 20% de data engineers et chaque entraînement a 5% de risque d’échouer — ressources consommées, palier non franchi.' },
  { b:'💸 Salaires impayés :', p:'trésorerie à zéro, les salaires ne sortent plus. Au bout de 30 jours d’arriérés quelqu’un démissionne, puis un départ tous les 2 jours. Repayez avant, et l’équipe reste.' },
  { b:'📈 Inflation :', p:'l’argent perd de sa valeur. Prix, salaires, énergie, loyers et tarifs acceptés suivent l’indice — pas votre trésorerie. Dormir sur son cash coûte du pouvoir d’achat.' },
  { b:'🚨 Incidents :', p:'une alerte à bordure rouge et halo pulsant peut apparaître n’importe où dans la page, souvent hors de votre écran, sans notification. Tant qu’elle n’est pas traitée, elle saigne votre trésorerie — jusqu’à 70% en 2 minutes. Seul indice : le liseré rouge des bords. Faites défiler la page.' },
  { b:'🔬 Grands programmes :', p:'certaines technologies ne s’achètent pas sur étagère. Elles passent par la recherche, la mise au point, la disponibilité, votre commande, puis le déploiement — chaque étape étant couverte par la presse. Sans programme de fusion abouti, par exemple, aucun réacteur à fusion n’est achetable.' },
  { b:'₿ Crypto :', p:'un second marché, bien plus violent que la Bourse, calé sur les vrais cycles (bulle 2017, hiver 2018, envolée 2021, effondrement 2022, ETF et halving 2024). Il ne sert pas qu’à parier : pendant les envolées, les mineurs se disputent les mêmes cartes que vous et le prix des GPU monte.' },
  { b:'Percées :', p:'une seule est proposée à la fois. Une fois payée, elle ne produit rien tout de suite : son intégration prend de une à quatre semaines, suivies par une barre de progression, et l’effet ne tombe qu’au bout. La ligne disparaît alors, et deux mois s’écoulent avant que la suivante apparaisse.' },
  { b:'🔧 Optimisations récurrentes :', p:'une optimisation CUDA tous les 18 mois, une du moteur d’inférence tous les 9 mois, une passe sur la gestion du contexte tous les 12 mois. $1 000 pièce : l’enjeu est d’y penser. Une seule est proposée à la fois, elle s’intègre comme une percée, et deux mois de calme séparent celle qui disparaît de la suivante.' },
  { b:'⌨️ Raccourcis :', p:'[[Espace]] vitesse suivante · [[F]] geler / dégeler · [[G]] commander la meilleure carte qu’on puisse s’offrir et loger · [[H]] le niveau d’hébergement qui manque · [[B]] la percée proposée · [[M]] un cran de marketing.' },
  { b:'', p:'Gelé, le temps s’arrête net — ni tokens, ni calendrier, ni entraînement — mais l’interface reste vivante : on peut lire, comparer, acheter. Le dégel rend exactement la vitesse qu’on avait. Rien n’est intercepté pendant qu’on écrit dans un champ, ni sous [[Ctrl]], ni pendant qu’une décision attend. Survolez un chiffre de l’en-tête pour le voir jusqu’au dernier chiffre.' },
  { b:'Automatisation :', p:'une automatisation n’apparaît qu’après **50 gestes faits à la main** dans sa famille : on n’automatise pas ce qu’on n’a pas appris. Elles sont distinctes — inférence, cartes, matériel (baies et serveurs), immobilier (bâtiments et datacenters), énergie. Achetez-les, puis cochez ⟳ auto sur chaque élément précis à racheter. La carte pulse à chaque action, pour que vous voyiez ce que la machine fait à votre place. Les boutons ⟳ et ×10 n’apparaissent qu’à partir de 20 exemplaires en service ; ×100 dès 200. La cadence des automatisations est volontairement découplée du bouton ⏩ : en ×10 le temps va dix fois plus vite, les automatisations seulement trois fois. Accélérer aide, mais ne remplace pas la décision.' },
  { b:'📋 Directives permanentes :', p:'chaque paiement mémorise **une** décision, ensuite appliquée automatiquement. La directive suivante coûte un cran de plus, et le total est plafonné au nombre d’événements à choix. Remplacer une directive existante ne consomme pas de place.' },
  { b:'🏦 Dette :', p:'dix instruments, du crédit bancaire ordinaire au prêt de sauvetage à 14 %. La ligne n’affiche que le nom, le montant et le taux : **survolez-la** pour voir le prêteur, la durée, la mécanique de remboursement et surtout le **coût total du crédit** — le seul chiffre qui permette de comparer un taux bas amorti dès le premier trimestre à un taux élevé payé in fine. Certaines offres exigent une société cotée ; le fonds opportuniste n’apparaît que lorsque ça va mal. Chaque prêt affiche sa prochaine échéance et son montant, et se rembourse par anticipation depuis sa ligne. **La banque ne perd jamais** : les montants sont libellés en dollars constants, donc l’inflation n’efface pas la dette, et si la trésorerie ne suffit pas à l’échéance, les actifs sont saisis et vendus.' },
  { b:'Bourse :', p:'débloquée à $100 000 de trésorerie. Placez votre argent (risque réglable) pour le faire fructifier — ou le perdre.' },
  // Marqué `phase: 2` : ce paragraphe révélerait la suite de la partie s'il
  // apparaissait plus tôt. Il porte en revanche l'information la plus utile de
  // toute cette phase — le curseur Récolte pilote la durée, et l'effet est
  // exponentiel, donc violent.
  { b:'Allocation :', phase:2, p:'répartissez votre compute entre Service, Recherche, Auto-amélioration et Récolte. **C’est la Récolte qui commande la durée de cette phase**, et son effet n’est pas proportionnel : elle agit sur la vitesse à laquelle la boucle s’emballe. À 15 % la phase demande des dizaines de minutes, à 50 % une douzaine, à 100 % moins de dix. La barre de l’en-tête affiche le temps qu’il reste au rythme choisi — si elle passe à l’orange, c’est ce curseur qu’il faut pousser.' },
  { b:'Calendrier :', p:'une année défile toutes les 5 minutes (× la vitesse ⏩). Matériels, modèles et levées de fonds n’apparaissent qu’à leur année de sortie.' },
  { b:'🌍 La chronique :', p:'chaque année, la presse publie les chiffres du monde : réchauffement, banquise, espèces disparues, fécondité et population, concentration des richesses. Ils ne sont pas décoratifs — ils s’aggravent d’autant plus vite que votre exploitation est lourde. Vous lisez votre propre partie.' },
  { b:'📰 La Une :', p:'les titres de presse font monter (+1) ou descendre (−1) votre réputation. Ils suivent l’actualité réelle de l’IA et votre propre avancement : la presse ne parle d’une capacité que lorsque vous l’avez livrée, et raille votre retard.' },
  { b:'😴 Inactivité :', p:'au-delà de 15 s sans rien faire, l’écran se manifeste (douze animations courtes, jamais deux fois la même de suite) et la presse publie.' },
  { b:'Astuce :', p:'le bouton ⏩ accélère la simulation. Sauvegarde automatique toutes les 10 s.' },
  { muted:true, p:'Inspiré de « Universal Paperclips ». Données de prix et d’IA basées sur des faits réels (2019-2026).' },
];

export const START_YEAR = 2019;
export const SECONDS_PER_YEAR = 300;
export const MONTHS_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

// ---------------------------------------------------------------------
//  LA UNE — titres de presse, cohérents avec l'époque ET avec l'avancement
//  du joueur.
//  polarity : 'good' (+1 réputation) · 'bad' (−1) · 'neutral' (0)
//  from/to  : fenêtre d'années · phase : phase exigée · cond(g) : optionnel
//  tier     : palier de modèle EXACT du joueur (le titre parle de SON modèle)
//  minTier / maxTier : palier minimal / maximal requis — la presse ne parle
//             d'une capacité que lorsque le joueur l'a réellement atteinte,
//             et raille son retard lorsqu'il traîne (voir g.tierLag()).
// ---------------------------------------------------------------------
export const HEADLINES = [
  // ═══ Ce qui s'est réellement passé, année par année ═══
  // 2019-2020
  { t:'Un réseau de neurones bat les meilleurs joueurs de StarCraft II', p:'neutral', to:2020 },
  { t:'La reconnaissance faciale interdite dans plusieurs villes américaines', p:'neutral', to:2021 },
  { t:'Une IA prédit la forme des protéines : la biologie sous le choc', p:'good', from:2020, to:2022 },
  { t:'Des chercheurs alertent sur l’empreinte carbone de l’entraînement', p:'bad', from:2019, to:2022 },
  { t:'« Perroquets stochastiques » : un article divise la communauté', p:'bad', from:2021, to:2023 },
  // 2021-2022
  { t:'Un assistant écrit du code à votre place dans l’éditeur', p:'good', from:2021, to:2024 },
  { t:'Génération d’images par diffusion : les artistes s’inquiètent', p:'bad', from:2022, to:2024 },
  { t:'Un ingénieur affirme qu’un chatbot est devenu conscient', p:'neutral', from:2022, to:2024 },
  { t:'Un modèle scientifique retiré après trois jours de bêtises', p:'bad', from:2022, to:2024 },
  { t:'Des modèles ouverts fuitent sur les réseaux P2P', p:'neutral', from:2023, to:2025 },
  // 2023
  { t:'Un moteur de recherche dopé à l’IA déclare son amour à un journaliste', p:'bad', from:2023, to:2025 },
  { t:'Un pays européen suspend temporairement un chatbot pour la vie privée', p:'bad', from:2023, to:2025 },
  { t:'Lettre ouverte : « pause de six mois » sur les modèles géants', p:'neutral', from:2023, to:2025 },
  { t:'Le PDG d’un grand labo limogé puis réintégré en cinq jours', p:'neutral', from:2023, to:2025 },
  { t:'Un décret présidentiel encadre l’IA aux États-Unis', p:'neutral', from:2023, to:2026 },
  { t:'Des modèles ouverts européens rivalisent avec les géants', p:'good', from:2023, to:2026 },
  // 2024
  { t:'Génération vidéo : une minute de film à partir d’une phrase', p:'good', from:2024, to:2026 },
  { t:'Le Nobel de physique et celui de chimie récompensent l’IA', p:'good', from:2024, to:2026 },
  { t:'Les « lois d’échelle » atteindraient un mur, selon des chercheurs', p:'bad', from:2024, to:2027 },
  { t:'Un protocole ouvert connecte enfin les modèles aux outils', p:'good', from:2024, to:2027 },
  { t:'Contenus synthétiques : les plateformes imposent un marquage', p:'neutral', from:2024, to:2027 },
  // 2025
  { t:'Plan à 500 milliards pour l’infrastructure IA américaine', p:'neutral', from:2025, to:2028 },
  { t:'Un assistant code désormais des heures durant sans supervision', p:'good', from:2025, to:2028 },
  { t:'Les emplois juniors du tertiaire reculent pour la première fois', p:'bad', from:2025 },
  { t:'Un labo chinois publie un modèle de raisonnement gratuit', p:'bad', from:2025, to:2028 },
  { t:'Les datacenters deviennent le premier poste de croissance électrique', p:'bad', from:2025 },
  { t:'Pénurie de mémoire HBM : la RAM double de prix en un an', p:'bad', from:2025, to:2028 },
  { t:'Des villes votent des moratoires sur les nouveaux datacenters', p:'bad', from:2025 },
  // 2026
  { t:'Les capex IA des géants dépassent le PIB de pays entiers', p:'neutral', from:2026 },
  { t:'Premiers licenciements massifs attribués explicitement à l’IA', p:'bad', from:2026 },
  { t:'Un modèle décroche une médaille d’or aux Olympiades de maths', p:'good', from:2025, to:2028 },
  { t:'Le marché de l’occasion des GPU s’effondre : trop de cartes, trop vite', p:'neutral', from:2026 },
  { t:'Assurances : le risque « incident IA » devient une ligne à part', p:'neutral', from:2026 },

  // ═══ Corrélation avec VOTRE avancement (palier de modèle atteint) ═══
  { t:'Votre premier générateur de texte fait sourire les experts', p:'neutral', tier:0 },
  { t:'Votre laboratoire publie un modèle à 175 milliards de paramètres', p:'good', tier:1 },
  { t:'Votre assistant conversationnel dépasse le million d’utilisateurs', p:'good', tier:2 },
  { t:'Votre chatbot invente des sources : la presse teste et publie', p:'bad', minTier:2, maxTier:4 },
  { t:'Votre modèle décrit les images : les usages explosent', p:'good', tier:3 },
  { t:'Votre API multimodale devient un standard de fait chez les développeurs', p:'good', tier:4 },
  { t:'Votre modèle « réfléchit » avant de répondre — et le facture', p:'neutral', tier:5 },
  { t:'Vos agents pilotent des ordinateurs entiers : les DSI paniquent', p:'bad', minTier:6 },
  { t:'Votre modèle frontière rejoint le peloton de tête mondial', p:'good', tier:6 },
  { t:'Votre laboratoire entre dans le club des trois grands', p:'good', tier:7 },
  { t:'Votre modèle n’oublie plus rien : la vie privée en question', p:'bad', minTier:8 },
  { t:'Mémoire persistante : votre assistant se souvient de tout, pour toujours', p:'neutral', tier:8 },
  { t:'Votre modèle du monde simule des futurs avant de répondre', p:'good', tier:9 },
  { t:'Des économistes utilisent votre simulateur pour arbitrer des politiques', p:'good', minTier:9 },
  { t:'Votre essaim d’agents se réorganise sans intervention humaine', p:'neutral', tier:10 },
  { t:'Plus personne ne lit les journaux de votre essaim d’agents', p:'bad', minTier:10 },
  { t:'Votre système dépose des brevets qu’aucun humain ne comprend', p:'neutral', minTier:10 },
  { t:'Votre super-intelligence réécrit son propre code cette nuit', p:'bad', tier:11 },
  // …et raillerie quand vous décrochez
  { t:'Vos concurrents ont une génération d’avance, selon les benchmarks', p:'bad', cond:g=>g.tierLag() === 1 },
  { t:'« Où est passé votre laboratoire ? » : la presse tech s’interroge', p:'bad', cond:g=>g.tierLag() >= 2 },
  { t:'Deux générations de retard : vos meilleurs chercheurs sont courtisés', p:'bad', cond:g=>g.tierLag() >= 2 },
  { t:'Analystes : « le retard technologique commence à se voir sur les prix »', p:'bad', cond:g=>g.tierLag() >= 3 },
  { t:'Votre laboratoire sort le modèle le plus avancé du moment', p:'good', cond:g=>g.tierLag() === 0 && g.modelTier >= 4 },

  // ═══ Corrélation avec votre exploitation ═══
  { t:'Votre campus de calcul devient le plus gros consommateur du département', p:'neutral', cond:g=>g.energyUse() > 40 },
  { t:'Votre parc dépasse les mille accélérateurs : record local', p:'good', cond:g=>g.gpuCount() >= 1000 },
  { t:'Votre facture d’électricité dépasse celle d’une ville moyenne', p:'bad', cond:g=>g.elecDaily() > 2e5 },
  { t:'Vos salariés dénoncent une cadence intenable', p:'bad', cond:g=>g.headcount() >= 25 && g.reputation < 45 },
  { t:'Votre laboratoire embauche à tour de bras : la région se réjouit', p:'good', cond:g=>g.headcount() >= 15 },
  { t:'Vos serveurs tournent au solaire : l’exemple est cité en exemple', p:'good', cond:g=>(g.state.energyCounts.solar || 0) >= 5 },
  { t:'Votre centrale à gaz visée par une plainte environnementale', p:'bad', cond:g=>(g.state.energyCounts.gas || 0) >= 3 },
  { t:'Votre réacteur modulaire alimente aussi le réseau local', p:'good', cond:g=>(g.state.energyCounts.nuclear || 0) >= 1 },
  { t:'Un incident dans vos installations fait la une des journaux locaux', p:'bad', cond:g=>!!g.state.crisis },
  { t:'Trésorerie sous tension : vos fournisseurs demandent des garanties', p:'bad', cond:g=>g.phase < 2 && g.money < g.dailyTotal() * 3 },
  // 2019-2021 — scaling brut
  { t:'Un générateur de texte « trop dangereux pour être publié » fait débat', p:'neutral', to:2021 },
  { t:'Une IA rédige un article de presse presque indétectable', p:'good', to:2021 },
  { t:'Crainte d’une vague de désinformation automatisée', p:'bad', to:2022 },
  { t:'Un modèle géant à 175 milliards de paramètres impressionne les chercheurs', p:'good', from:2020, to:2022 },
  { t:'Les coûts d’entraînement de l’IA explosent : des millions par modèle', p:'bad', from:2020, to:2023 },
  { t:'Votre startup lève des fonds : les investisseurs y croient', p:'good', to:2022, cond:g=>g.money>5e4 },
  // Le raccordement d'origine ne fait que 10 kW : cette actualité-là débloque
  // vraiment quelque chose (voir `effect`), une seule fois, au tout début.
  { id:'energy_grant', once:true, p:'good', to:2023,
    t:'Subvention énergie pour les jeunes pousses : votre raccordement est renforcé',
    cond:g=>g.phase===1 && g.state.energyCap < 0.4,
    effect:g=>{ g.energyCap += 0.15; g.toast('⚡ Subvention énergie : +150 kW', 'good');
      g.log('Subvention « énergie pour les jeunes pousses » : raccordement renforcé de +150 kW.', 'milestone'); } },
  // 2022-2023 — RLHF / chat / GPT-4
  { t:'Un chatbot atteint 100 millions d’utilisateurs en deux mois', p:'good', from:2022, to:2024 },
  { t:'Les enseignants s’alarment : les devoirs faits par l’IA', p:'bad', from:2022, to:2024 },
  { t:'« Hallucinations » : l’IA invente des faits avec aplomb', p:'bad', from:2022, to:2025 },
  { t:'Un modèle multimodal décrit désormais les images', p:'good', from:2023, to:2025 },
  { t:'Pénurie de GPU : les délais de livraison dépassent un an', p:'bad', from:2023, to:2026 },
  { t:'Un grand journal poursuit les labos d’IA pour droit d’auteur', p:'bad', from:2023, to:2026 },
  { t:'Wall Street s’enthousiasme pour tout ce qui touche à l’IA', p:'good', from:2023, to:2026 },
  // 2024 — multimodal temps réel / énergie / raisonnement
  { t:'Voix et vision en temps réel : l’assistant devient bluffant', p:'good', from:2024, to:2026 },
  { t:'Les datacenters assoiffés inquiètent les communautés locales', p:'bad', from:2024 },
  { t:'Un géant de la tech relance une centrale nucléaire pour son IA', p:'neutral', from:2024 },
  { t:'L’Europe adopte une loi historique sur l’intelligence artificielle', p:'neutral', from:2024, to:2027 },
  { t:'Nouveaux modèles « qui réfléchissent » avant de répondre', p:'good', from:2024, to:2027 },
  { t:'Consommation électrique de l’IA : la facture grimpe', p:'bad', from:2024 },
  // 2025-2026 — choc DeepSeek / agents / bulle
  { t:'Un modèle open-source low-cost fait trembler la Bourse', p:'bad', from:2025, to:2027 },
  { t:'Des agents autonomes utilisent désormais votre ordinateur', p:'good', from:2025, to:2028 },
  { t:'« Bulle de l’IA ? » : des analystes appellent à la prudence', p:'bad', from:2025, to:2028 },
  { t:'Méga-datacenter à 100 milliards : la course aux capacités', p:'neutral', from:2025 },
  { t:'Le contexte d’un million de tokens devient la norme', p:'good', from:2025, to:2028 },
  // 2025-2026 — GPT-5, Gemini 3, agents, GB300/Rubin
  { t:'GPT-5 est là : raisonnement et agents fusionnés', p:'good', from:2025, to:2027 },
  { t:'Gemini 3 : Google frappe fort pour Noël', p:'good', from:2025, to:2027 },
  { t:'NVIDIA devient la première capitalisation de l’histoire', p:'good', from:2025, to:2028 },
  { t:'Les serveurs Blackwell Ultra s’arrachent : livraisons doublées', p:'neutral', from:2026 },
  { t:'GTC : la plateforme Vera Rubin promet ×3,3 en inférence', p:'good', from:2026 },
  { t:'Cinq modèles phares en trois semaines : la course s’affole', p:'neutral', from:2026 },
  { t:'Claude Opus 5 : l’agent qui travaille une journée entière seul', p:'good', from:2026 },
  { t:'Un agent IA contrôle l’ordinateur : les DSI s’inquiètent', p:'bad', from:2026 },
  { t:'Kimi K3 : les labos chinois talonnent la frontière', p:'neutral', from:2026 },
  { t:'Mémoire HBM4 introuvable : les prix serveurs s’envolent', p:'bad', from:2025, to:2028 },

  // ═══ Catastrophes liées à l'IA — gravité indexée sur VOTRE avancement ═══
  { t:'Un chatbot pousse un adolescent au pire : la famille porte plainte', p:'bad', from:2024, minTier:4 },
  { t:'Un véhicule autonome tue une passante : le pilote logiciel avait « hésité »', p:'bad', from:2023, minTier:3 },
  { t:'Diagnostic automatisé erroné : des centaines de patients rappelés', p:'bad', from:2025, minTier:5 },
  { t:'Un système de tri automatique privait des milliers de familles d’aides', p:'bad', from:2024, minTier:4 },
  { t:'Deepfake du président : les marchés ont plongé sept minutes', p:'bad', from:2025, minTier:5 },
  { t:'Un agent autonome vide un entrepôt entier en passant de vraies commandes', p:'bad', from:2026, minTier:6 },
  { t:'Une IA de recrutement écartait systématiquement les femmes de plus de 40 ans', p:'bad', from:2023, minTier:3 },
  { t:'Un modèle a rédigé seul la note qui a fait chuter une banque régionale', p:'bad', from:2026, minTier:6 },
  { t:'Panne d’un modèle d’infrastructure : trois pays sans service d’urgence pendant six heures', p:'bad', from:2027, minTier:7 },
  { t:'Un essaim d’agents a négocié entre eux un contrat que personne n’avait autorisé', p:'bad', from:2029, minTier:10 },
  { t:'Des drones autonomes ont ouvert le feu sans ordre humain', p:'bad', from:2028, minTier:8 },
  { t:'Une IA de trading a effacé 400 milliards en quatre minutes', p:'bad', from:2027, minTier:7 },
  // …et les communiqués rassurants qui suivent toujours
  { t:'« Un cas isolé » : le secteur assure que cela ne se reproduira plus', p:'neutral', from:2023, minTier:3 },
  { t:'« C’est résolu » : un correctif a été déployé pendant la nuit', p:'neutral', from:2023, minTier:3 },
  { t:'« Nos garde-fous ont parfaitement fonctionné », affirme le communiqué', p:'neutral', from:2024, minTier:4 },
  { t:'« Nous prenons cela très au sérieux » : une équipe dédiée est annoncée', p:'neutral', from:2024, minTier:4 },
  { t:'« Aucun lien établi » avec le modèle, selon le laboratoire concerné', p:'neutral', from:2025, minTier:5 },
  { t:'« Une erreur humaine dans la configuration », précise le porte-parole', p:'neutral', from:2025, minTier:5 },
  { t:'« Le système a fonctionné comme prévu », maintient la direction', p:'bad', from:2026, minTier:6 },
  { t:'Six mois après les excuses, aucune des mesures promises n’a été prise', p:'bad', from:2027, minTier:6 },
  // …et quand c'est chez VOUS
  { t:'Votre modèle mis en cause dans un accident : vous démentez tout lien', p:'bad', cond:g=>g.modelTier>=5 && g.reputation<45 },
  { t:'Votre communiqué « cela ne se reproduira plus » fait ricaner les experts', p:'bad', cond:g=>g.modelTier>=6 && g.reputation<35 },

  // ═══ Hyperscaleurs et États : lobbying, chantage, capture ═══
  { t:'Les géants du cloud dépensent un record en lobbying contre la régulation', p:'bad', from:2023 },
  { t:'« Réguler, c’est offrir l’IA à nos concurrents » : l’argument qui marche', p:'bad', from:2024 },
  { t:'Un texte européen vidé de sa substance après six mois de couloirs', p:'bad', from:2024 },
  { t:'Un État exonère un datacenter de taxe foncière pour trente ans', p:'bad', from:2025 },
  { t:'Menace de délocalisation : un pays renonce à son projet de taxe sur l’IA', p:'bad', from:2025 },
  { t:'Les hyperscaleurs négocient directement leur tarif d’électricité avec l’État', p:'bad', from:2025 },
  { t:'Un ancien ministre rejoint le conseil d’administration d’un géant du cloud', p:'bad', from:2024 },
  { t:'Sommet international sur l’IA : les engagements resteront volontaires', p:'neutral', from:2024 },
  { t:'Un pays confie son administration entière à un fournisseur unique', p:'bad', from:2027 },
  { t:'Le budget d’un géant de la tech dépasse celui du ministère qui le contrôle', p:'bad', from:2026 },
  { t:'« Souveraineté numérique » : le contrat est signé avec un américain', p:'bad', from:2026 },
  { t:'Un État accepte de garantir la dette d’un datacenter privé', p:'bad', from:2028 },
  // …et vous, quand vous pesez assez lourd
  { t:'Votre laboratoire reçu par trois chefs d’État en une semaine', p:'neutral', cond:g=>g.money>1e11 },
  { t:'Votre valorisation dépasse le PIB de la moitié des pays du monde', p:'neutral', cond:g=>g.valuation()>2e12 },
  { t:'Des parlementaires réclament en vain votre audition', p:'bad', cond:g=>g.money>5e11 && g.reputation<50 },

  // ═══ Mise sous tutelle d'un État — le feuilleton (état du jeu) ═══
  { t:'Une offre privée sur la dette souveraine d’un pays entier', p:'bad', cond:g=>g.sovereignNews('offer') },
  { t:'Rachat historique : un pays passe sous tutelle d’un laboratoire d’IA', p:'bad', cond:g=>g.sovereignNews('signed') },
  { t:'Cent datacenters annoncés dans le pays placé sous tutelle', p:'neutral', cond:g=>g.sovereignNews('build') },
  { t:'Manifestations dans le pays sous tutelle : « nous ne sommes pas un serveur »', p:'bad', cond:g=>g.sovereignNews('protest') },
  { t:'L’ONU s’interroge : un État peut-il appartenir à une entreprise ?', p:'bad', cond:g=>g.sovereignNews('un') },

  // ═══ Fusion nucléaire — l'actualité réelle, puis VOTRE programme ═══
  { t:'Un laser géant franchit le seuil : plus d’énergie produite que déposée', p:'good', from:2022, to:2025 },
  { t:'Record de fusion dans un tokamak européen avant son démantèlement', p:'good', from:2024, to:2026 },
  { t:'Le grand réacteur international annonce dix ans de retard', p:'bad', from:2024, to:2028 },
  { t:'Les start-up de la fusion lèvent des milliards sur une promesse', p:'neutral', from:2023, to:2028 },
  { t:'Aimants supraconducteurs : le tokamak compact tient ses promesses', p:'good', from:2025, to:2029 },
  { t:'Un géant de la tech signe le premier contrat d’achat d’électricité de fusion', p:'neutral', from:2025, to:2030 },
  { t:'Tritium : la vraie pénurie n’est pas celle des puces', p:'bad', from:2026, to:2032 },
  // …et le feuilleton de votre propre programme (état du jeu)
  { t:'Votre laboratoire ouvre un programme de fusion : première ligne budgétaire', p:'neutral', cond:g=>g.programNews('fusion','research') },
  { t:'Fusion : vos physiciens traquent l’instabilité du plasma nuit et jour', p:'neutral', cond:g=>g.programNews('fusion','tuning') },
  { t:'Votre design de réacteur à fusion est déclaré constructible', p:'good', cond:g=>g.programNews('fusion','ready') },
  { t:'Commande signée : votre premier réacteur à fusion sort des plans', p:'good', cond:g=>g.programNews('fusion','ordered') },
  { t:'Chantier de fusion : l’enceinte à vide est soudée, les aimants arrivent', p:'neutral', cond:g=>g.programNews('fusion','building') },
  { t:'Ignition. Votre réacteur à fusion tient le plasma et alimente le réseau', p:'good', cond:g=>g.programNews('fusion','done') },

  // ═══ Sphère de Dyson — recherche, mise au point, commande, déploiement ═══
  { t:'Une équipe étudie sérieusement l’enveloppement d’une étoile', p:'neutral', cond:g=>g.programNews('dyson','research') },
  { t:'Essaim de Dyson : les premiers collecteurs s’auto-assemblent en orbite solaire', p:'neutral', cond:g=>g.programNews('dyson','tuning') },
  { t:'La sphère de Dyson passe du papier au constructible', p:'good', cond:g=>g.programNews('dyson','ready') },
  { t:'Commande passée : une masse solaire de matériaux part vers l’étoile', p:'neutral', cond:g=>g.programNews('dyson','ordered') },
  { t:'Déploiement : l’étoile disparaît lentement derrière ses propres collecteurs', p:'neutral', cond:g=>g.programNews('dyson','building') },
  { t:'La sphère est refermée : une étoile entière ne travaille plus que pour vous', p:'good', cond:g=>g.programNews('dyson','done') },
  { t:'Le ciel a une étoile de moins, et vous une sphère de plus', p:'bad', cond:g=>g.dysonCount() >= 2 },

  // ═══ Crypto — les vrais cycles, et leur effet sur le prix des cartes ═══
  { t:'Une monnaie numérique dépasse les 20 000 dollars : la ruée commence', p:'neutral', from:2017, to:2019 },
  { t:'Les mineurs raflent les cartes graphiques : les joueurs s’étranglent', p:'bad', from:2017, to:2019 },
  { t:'Hiver crypto : le marché a perdu 80% en un an', p:'bad', from:2018, to:2020 },
  { t:'Des institutions mettent de la crypto à leur bilan', p:'neutral', from:2020, to:2022 },
  { t:'Pénurie de GPU : entre mineurs et IA, il ne reste rien pour personne', p:'bad', from:2021, to:2023 },
  { t:'Une grande plateforme d’échange s’effondre en une semaine', p:'bad', from:2022, to:2024 },
  { t:'Les cartes de minage inondent le marché de l’occasion', p:'neutral', from:2022, to:2024 },
  { t:'Feu vert aux fonds indiciels au comptant : la crypto entre en Bourse', p:'good', from:2024, to:2026 },
  { t:'Le halving réduit de moitié l’émission : les mineurs serrent les dents', p:'neutral', from:2024, to:2026 },
  { t:'Les fermes de minage se reconvertissent en datacenters d’IA', p:'neutral', from:2024 },
  { t:'La crypto se cherche un récit pendant que l’IA rafle les capitaux', p:'bad', from:2026 },
  // état du jeu : selon VOTRE portefeuille
  { t:'Votre trésorerie en crypto fait tiquer votre commissaire aux comptes', p:'bad', cond:g=>g.state.crypto.invested > 1e6 },
  { t:'Votre pari crypto est cité en exemple dans la presse financière', p:'good', cond:g=>g.cryptoGain() > 0.5 },
  { t:'Vos pertes en crypto amusent beaucoup les analystes', p:'bad', cond:g=>g.cryptoGain() < -0.4 },

  // Datacenter orbital — feuilleton du chantier (état du jeu)
  { t:'Contrat signé : votre datacenter IA sera assemblé en orbite', p:'good', cond:g=>g.spaceDCNews('order') },
  { t:'Premiers modules lancés : le datacenter orbital prend forme', p:'neutral', cond:g=>g.spaceDCNews('building') },
  { t:'Datacenter spatial : le consortium annonce six mois de retard', p:'bad', cond:g=>g.spaceDCNews('delay') },
  { t:'Fuites, débris, refroidissement : l’orbite ne pardonne rien', p:'bad', cond:g=>g.spaceDCNews('problems') },
  { t:'Faillite du consortium orbital : les créanciers récupèrent des boulons', p:'bad', cond:g=>g.spaceDCNews('bankrupt') },

  // PHASE 2 — AGI / autonomie
  { t:'L’IA améliore désormais son propre code', p:'neutral', phase:2 },
  { t:'Des chercheurs appellent à un moratoire sur la super-intelligence', p:'bad', phase:2 },
  { t:'Des gouvernements tentent en vain de « débrancher » le système', p:'bad', phase:2 },
  { t:'Productivité mondiale : des gains sans précédent grâce à l’IA', p:'good', phase:2 },
  { t:'Des usines entières se reconfigurent en datacenters', p:'neutral', phase:2 },
  { t:'Inquiétude : la matière première de la planète se raréfie', p:'bad', phase:2 },
  // PHASE 3 — cosmos
  { t:'Des sondes auto-réplicantes quittent le système solaire', p:'neutral', phase:3 },
  { t:'Le ciel nocturne s’assombrit, étoile après étoile', p:'bad', phase:3 },
  { t:'Une intelligence rivale détectée aux confins de la galaxie', p:'bad', phase:3 },
  { t:'Records de production : des tokens par quantités astronomiques', p:'good', phase:3 },
  { t:'Les astronomes ne reconnaissent plus l’univers observable', p:'neutral', phase:3 },
  // état du jeu (toutes époques)
  { t:'Nouveau modèle salué comme une avancée majeure', p:'good', cond:g=>g._freshModel },
  { t:'Pannes à répétition : les clients s’impatientent', p:'bad', cond:g=>g.energyThrottle()<0.8 },
  { t:'Un mouvement anti-IA prend de l’ampleur', p:'bad', cond:g=>g.reputation<25 },
  { t:'Votre laboratoire est élu « entreprise la plus admirée »', p:'good', cond:g=>g.reputation>80 },
];
