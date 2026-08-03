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
export const MODELS = [
  { id:'gpt2', minRnd:0,   name:'GPT-2',        year:2019, era:'Scaling brut',
    meta:'1,5 G params · ctx 1K',
    throughput:5e4,    quality:25,     // novelté : on peut facturer cher le peu qu'on produit
    cost:{ money:0, compute:0, data:0, research:0 },
    flavor:'« Trop dangereux pour être publié. » Vous générez vos premiers tokens à la main.' },

  { id:'gpt3', minRnd:0,   name:'GPT-3',        year:2020, era:'Scaling brut',
    meta:'175 G params · ctx 4K',
    throughput:1.5e5,  quality:60,
    cost:{ money:300, compute:5, data:50, research:20 },
    flavor:'Few-shot learning. Naissance de l’économie du token : $60/Mtok.' },

  { id:'gpt35', minRnd:1,  name:'GPT-3.5 / ChatGPT', year:2022, era:'RLHF / Chat',
    meta:'~175 G · RLHF · ctx 4K',
    throughput:5e5,    quality:2,      // LLMflation : effondrement du prix unitaire, volume ↑↑
    cost:{ money:6e3, compute:35, data:500, research:150 },
    flavor:'RLHF + interface chat. 100M d’utilisateurs en deux mois. Le prix s’effondre à $2/Mtok mais le volume explose.' },

  { id:'gpt4', minRnd:3,   name:'GPT-4',        year:2023, era:'Multimodal',
    meta:'~1,8 T (MoE) · ctx 128K',
    throughput:1.5e6,  quality:30,
    cost:{ money:2e5, compute:300, data:5e3, research:1200 },
    flavor:'Vision + raisonnement. La frontière repousse, $30/Mtok pour le haut de gamme.' },

  { id:'gpt4o', minRnd:6,  name:'GPT-4o',       year:2024, era:'Multimodal',
    meta:'multimodal natif · ctx 128K',
    throughput:5e6,    quality:5,
    cost:{ money:8e6, compute:2500, data:4e4, research:1e4 },
    flavor:'Voix + vision temps réel. $5/Mtok. La famille « mini » casse encore les prix.' },

  { id:'o1', minRnd:10,     name:'o1 — raisonnement', year:2024, era:'Raisonnement',
    meta:'test-time compute · ctx 128K',
    throughput:1.5e7,  quality:15,
    cost:{ money:2e8, compute:2e4, data:3e5, research:8e4 },
    flavor:'« Reasoning tokens » : le modèle réfléchit avant de répondre. Plus de tokens par requête.' },

  { id:'frontier', minRnd:20, name:'Modèle frontière (GPT-5 / Claude 4 / Gemini 3)', year:2025, era:'Agents',
    meta:'agents autonomes · ctx 1M',
    throughput:6e7,    quality:8, /*frontier*/
    cost:{ money:3e9, compute:2e4, data:2e6, research:6e5 },
    flavor:'Usage d’outils autonome, « computer use ». Les agents consomment des tokens par milliards.' },

  { id:'frontier2', minRnd:28, name:'Frontière 2026 (GPT-5.6 / Claude Opus 5 / Gemini 3.6)', year:2026, era:'Agents',
    meta:'agents généralistes · contrôle d’ordinateur',
    throughput:1.2e8,  quality:10,
    cost:{ money:8e9, compute:6e4, data:6e6, research:2e6 },
    flavor:'Cinq modèles phares en trois semaines (juillet 2026). Les agents pilotent des ordinateurs entiers ; la course s’emballe.' },

  { id:'asi', minRnd:40,    name:'Super-intelligence (ASI)', year:2027, era:'Singularité',
    meta:'auto-amélioration récursive',
    throughput:3e8,    quality:12,
    cost:{ money:2.5e10, compute:2e5, data:1.5e7, research:1e7 },
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
  { id:'consumer', name:'GPU grand public (GTX)', year:2016, perf:1,    energy:0.0003, cost:300,
    desc:'Carte gamer détournée (~GTX 1060). ~$300 en 2016.' },
  { id:'v100',     name:'NVIDIA V100',            year:2017, perf:6,    energy:0.0003, cost:9000,
    desc:'~$9 000 à sa sortie. Le cheval de bataille de 2017.' },
  { id:'rtx3090',  name:'NVIDIA RTX 3090',        year:2020, perf:3,    energy:0.00035,cost:1500,
    desc:'MSRP $1499, 350W. La carte-pont du confinement.' },
  { id:'a100',     name:'NVIDIA A100 80GB',       year:2020, perf:25,   energy:0.0004, cost:12000,
    desc:'~$10-15k. La carte de l’ère GPT-3/4.' },
  { id:'rtx4090',  name:'NVIDIA RTX 4090',        year:2022, perf:6,    energy:0.00045,cost:1600,
    desc:'MSRP $1599, 450W. Le meilleur rapport perf/prix grand public.' },
  { id:'h100',     name:'NVIDIA H100',            year:2023, perf:120,  energy:0.0007, cost:30000, scarce:true,
    desc:'~$25-40k, en pénurie (~1 an de délai).' },
  { id:'l40',      name:'NVIDIA L40S',            year:2023, perf:40,   energy:0.00035,cost:7500,
    desc:'~$7 500, 350W. L’inférence sans se ruiner pendant la pénurie de H100.' },
  { id:'rtx5090',  name:'NVIDIA RTX 5090',        year:2025, perf:10,   energy:0.00065,cost:2000,
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
  { id:'realestate', name:'Immobilier', unit:'bâtiment', child:'datacenter', capacity:4, cost:30000, energy:0.005,
    desc:'Du garage au campus : il faut poser les machines quelque part.' },
  { id:'datacenter', name:'Datacenter', unit:'datacenter', needs:'realestate', child:'rack', capacity:8, cost:20000, energy:0.02, rentDaily:800,
    desc:'Salle climatisée (le cooling consomme). Achat, ou location à la journée.' },
  { id:'rack',       name:'Baie (rack)', unit:'baie', needs:'datacenter', child:'server', capacity:12, cost:1500, energy:0.0002,
    desc:'Armoire 42U (PDU, switch). Occupe une place en datacenter.' },
  { id:'server',     name:'Serveur', unit:'serveur', needs:'rack', child:'gpu', capacity:8, cost:8000, energy:0.0004,
    eraPrice:[[0,8000],[2025,22000],[2027,15000]],
    desc:'Châssis multi-GPU. Prix tiré vers le haut par la flambée mémoire (2025-2026).' },
];

// ---------------------------------------------------------------------
//  ÉNERGIE — plafond dur de production
//  mw : capacité ajoutée ; costMult : inflation du capex
// ---------------------------------------------------------------------
export const ENERGY = [
  { id:'grid',    name:'Raccordement réseau',     year:2016, mw:0.5,  costBase:40,   costMult:1.10, rep:0, costMWh:120,
    desc:'On tire sur le réseau local. Bon marché, mais limité.' },
  { id:'solar',   name:'Ferme solaire + batteries',year:2018, mw:3,   costBase:1.5e3,costMult:1.11, rep:+1, costMWh:5,
    desc:'Vert et bien vu. Intermittent mais propre.' },
  { id:'gas',     name:'Centrale gaz dédiée',      year:2016, mw:25,  costBase:6e4,  costMult:1.10, rep:-2, costMWh:70,
    desc:'Rapide à déployer, mauvaise presse climatique.' },
  { id:'nuclear', name:'SMR nucléaire',            year:2024, mw:300, costBase:5e6,  costMult:1.12, rep:+1, costMWh:20,
    desc:'Petit réacteur modulaire (façon Google-Kairos / Three Mile Island).' },
  { id:'fusion',  name:'Réacteur à fusion',        year:2028, mw:5000,costBase:1e9,  costMult:1.10, rep:+3, phase:2, costMWh:2,
    desc:'Énergie quasi illimitée. Le rêve enfin réalisé.' },
  { id:'dyson',   name:'Collecteur Dyson',         year:2030, mw:5e8, costBase:1e13, costMult:1.10, rep:0, phase:3, costMWh:0,
    desc:'On capte une fraction de l’étoile elle-même.' },
];

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
    req:g=>g.phase>=2 && g.earthConsumed>=0.85 },

  { id:'recompression', name:'Singularité de recompression', cat:'Singularité',
    cost:{ matter:9e52, tokens:1e60 }, effect:'unlock:ending',
    desc:'Concentrer toute la matière-énergie de l’univers en un point. Provoquer le prochain Big Bang.',
    req:g=>g.phase>=3 && g.universeConsumed>=0.999 },
];

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
  { id:'hr',       name:'Responsable RH',      salary:250, desc:'Chaque RH permet d’embaucher davantage (+5 postes).' },
  { id:'rnd',      name:'Ingénieur R&D',       salary:400, desc:'Indispensable pour entraîner les modèles avancés. Accélère la recherche.' },
  { id:'marketer', name:'Marketeur',           salary:250, desc:'Relève le plafond du niveau de marketing (+1 par marketeur).' },
  { id:'ops',      name:'Ingénieur SRE/Ops',   salary:350, desc:'Fiabilise le parc : +2% de débit compute par ingénieur (max +50%).' },
  { id:'data',     name:'Data engineer',       salary:300, desc:'Multiplie la production de données d’entraînement.' },
];
export const BASE_HEADCOUNT = 3;     // postes disponibles sans RH (le fondateur + amis)
export const HR_HEADCOUNT = 5;       // postes ajoutes par RH
export const BASE_MARKETING = 10;     // niveau de marketing atteignable sans marketeur
export const ELEC_PRICE_MWH = 80;    // prix de l electricite ($/MWh) -> charge journaliere
export const COLO = { racks:3, daily:250 }; // espace loue en datacenter (colocation)


// ---------------------------------------------------------------------
//  SUCCÈS — vérifiés en continu ; check(g) → bool
// ---------------------------------------------------------------------
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
  { id:'half_earth',   name:'Géo-ingénieur',        desc:'Convertir la moitié de la Terre.',    check:g=>g.earthConsumed>=0.5 },
  { id:'promise',      name:'Parole tenue',         desc:'Préserver le sanctuaire jusqu’au bout.', check:g=>!!g.flags.keptPromise },
  { id:'spacedc',      name:'Ad astra… ou pas',     desc:'Financer le datacenter orbital jusqu’à la faillite.', check:g=>g.state.spaceDC && g.state.spaceDC.status==='bankrupt' },
  { id:'bigbang',      name:'Fiat lux',             desc:'Déclencher un nouveau Big Bang.',     check:g=>g.state.ended },
];

// ---------------------------------------------------------------------
//  ADDENDUM — options de gouvernance. Les « Directives permanentes » permettent,
//  dans chaque boîte de dialogue, de cocher « appliquer ce choix désormais » :
//  l'événement sera résolu automatiquement les fois suivantes (plus d'interruption).
// ---------------------------------------------------------------------
export const ADDENDUM = {
  id:'directives', name:'Directives permanentes', cost:250000,
  desc:'Votre COO note vos décisions : cochez un choix dans un événement et il sera appliqué automatiquement les prochaines fois.',
};

// Datacenter IA orbital : proposé entre 2030 et 2040. Livraison promise en 18 mois…
// puis 6 mois de retard… puis faillite du consortium. L'argent est perdu.
export const SPACE_DC = {
  id:'spacedc', name:'Datacenter IA orbital', cost:5e7, from:2030, to:2040,
  buildMonths:18, delayMonths:6,
  desc:'Un consortium promet un datacenter IA en orbite : solaire 24/7, refroidissement radiatif, zéro voisinage. Livraison en 18 mois.',
};

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
  { id:'infra',  name:'Auto-hébergement',  cost:10000, desc:'Active l’auto-achat par niveau coché ⟳, quand ce niveau va devenir limitant.' },
  { id:'energy', name:'Auto-énergie',      cost:5000,  desc:'Active l’auto-achat par source cochée ⟳, dès que la conso dépasse la production.' },
];

export const START_YEAR = 2019;
export const SECONDS_PER_YEAR = 300;
export const MONTHS_FR = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];

// ---------------------------------------------------------------------
//  LA UNE — titres de presse, cohérents avec l'époque.
//  polarity : 'good' (+1 réputation) · 'bad' (−1) · 'neutral' (0)
//  from/to : fenêtre d'années · phase : phase exigée · cond(g) : optionnel
// ---------------------------------------------------------------------
export const HEADLINES = [
  // 2019-2021 — scaling brut
  { t:'Un générateur de texte « trop dangereux pour être publié » fait débat', p:'neutral', to:2021 },
  { t:'Une IA rédige un article de presse presque indétectable', p:'good', to:2021 },
  { t:'Crainte d’une vague de désinformation automatisée', p:'bad', to:2022 },
  { t:'Un modèle géant à 175 milliards de paramètres impressionne les chercheurs', p:'good', from:2020, to:2022 },
  { t:'Les coûts d’entraînement de l’IA explosent : des millions par modèle', p:'bad', from:2020, to:2023 },
  { t:'Votre startup lève des fonds : les investisseurs y croient', p:'good', to:2022, cond:g=>g.money>5e4 },
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
