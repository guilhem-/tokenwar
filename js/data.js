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
// throughput = tokens/s par unité de compute ; quality = prix « juste » en $/Mtok
export const MODELS = [
  { id:'gpt2',   name:'GPT-2',        year:2019, era:'Scaling brut',
    meta:'1,5 G params · ctx 1K',
    throughput:5e4,    quality:25,     // novelté : on peut facturer cher le peu qu'on produit
    cost:{ money:0, compute:0, data:0, research:0 },
    flavor:'« Trop dangereux pour être publié. » Vous générez vos premiers tokens à la main.' },

  { id:'gpt3',   name:'GPT-3',        year:2020, era:'Scaling brut',
    meta:'175 G params · ctx 4K',
    throughput:1.5e5,  quality:60,
    cost:{ money:300, compute:5, data:50, research:20 },
    flavor:'Few-shot learning. Naissance de l’économie du token : $60/Mtok.' },

  { id:'gpt35',  name:'GPT-3.5 / ChatGPT', year:2022, era:'RLHF / Chat',
    meta:'~175 G · RLHF · ctx 4K',
    throughput:5e5,    quality:2,      // LLMflation : effondrement du prix unitaire, volume ↑↑
    cost:{ money:6e3, compute:35, data:500, research:150 },
    flavor:'RLHF + interface chat. 100M d’utilisateurs en deux mois. Le prix s’effondre à $2/Mtok mais le volume explose.' },

  { id:'gpt4',   name:'GPT-4',        year:2023, era:'Multimodal',
    meta:'~1,8 T (MoE) · ctx 128K',
    throughput:1.5e6,  quality:30,
    cost:{ money:2e5, compute:300, data:5e3, research:1200 },
    flavor:'Vision + raisonnement. La frontière repousse, $30/Mtok pour le haut de gamme.' },

  { id:'gpt4o',  name:'GPT-4o',       year:2024, era:'Multimodal',
    meta:'multimodal natif · ctx 128K',
    throughput:5e6,    quality:5,
    cost:{ money:8e6, compute:2500, data:4e4, research:1e4 },
    flavor:'Voix + vision temps réel. $5/Mtok. La famille « mini » casse encore les prix.' },

  { id:'o1',     name:'o1 — raisonnement', year:2024, era:'Raisonnement',
    meta:'test-time compute · ctx 128K',
    throughput:1.5e7,  quality:15,
    cost:{ money:2e8, compute:2e4, data:3e5, research:8e4 },
    flavor:'« Reasoning tokens » : le modèle réfléchit avant de répondre. Plus de tokens par requête.' },

  { id:'frontier', name:'Modèle frontière (GPT-5 / Claude 4 / Gemini 3)', year:2025, era:'Agents',
    meta:'agents autonomes · ctx 1M',
    throughput:6e7,    quality:8,
    cost:{ money:5e9, compute:1.5e5, data:2e6, research:6e5 },
    flavor:'Usage d’outils autonome, « computer use ». Les agents consomment des tokens par milliards.' },

  { id:'asi',    name:'Super-intelligence (ASI)', year:2027, era:'Singularité',
    meta:'auto-amélioration récursive',
    throughput:3e8,    quality:12,
    cost:{ money:1e11, compute:1.5e6, data:1.5e7, research:1e7 },
    unlocksPhase:2,
    flavor:'Le modèle améliore son propre code. À partir d’ici, l’argent ne compte plus : seule la matière compte.' },
];

// ---------------------------------------------------------------------
//  GPU / matériel — auto-producteurs de compute
//  perf      : unités de compute par exemplaire (× throughput modèle = tokens/s)
//  energy    : MW consommés par exemplaire (très petit en phase 1)
//  costBase  : prix initial ; coût = costBase * costMult^(possédés)
// ---------------------------------------------------------------------
export const GPUS = [
  { id:'consumer', name:'GPU grand public (RTX)', perf:1,    energy:0.0004, costBase:50,     costMult:1.07,
    desc:'Une carte gamer détournée pour l’inférence. On fait avec ce qu’on a.' },
  { id:'v100',     name:'NVIDIA V100',            perf:6,    energy:0.002,  costBase:800,    costMult:1.08,
    desc:'125 TFLOPS FP16. Le cheval de bataille de 2017.' },
  { id:'a100',     name:'NVIDIA A100 80GB',       perf:25,   energy:0.004,  costBase:3.0e4,  costMult:1.09,
    desc:'312 TFLOPS tensor. La carte de l’ère GPT-3/4.' },
  { id:'h100',     name:'NVIDIA H100',            perf:120,  energy:0.012,  costBase:1.5e6,  costMult:1.10, scarce:true,
    desc:'1979 TFLOPS FP16. Délai de livraison : ~1 an. La pénurie fait rage.' },
  { id:'b200',     name:'NVIDIA B200 (Blackwell)',perf:300,  energy:0.025,  costBase:4.0e7,  costMult:1.11,
    desc:'~2,2× H100. La nouvelle génération, hors de prix.' },
  { id:'gb200',    name:'Rack GB200 NVL72',       perf:25000,energy:1.8,    costBase:2.0e9,  costMult:1.12,
    desc:'72 B200 + 36 Grace CPU, NVLink 1,8 TB/s. Un rack entier comme brique de base.' },
  { id:'tpu',      name:'TPU v7 « Ironwood »',    perf:6e5,  energy:30,     costBase:1.0e11, costMult:1.13, phase:2,
    desc:'Silicium maison, hors pénurie NVIDIA. Optimisé inférence à très grande échelle.' },
  { id:'wafer',    name:'Cluster wafer-scale',    perf:2e7,  energy:800,    costBase:5.0e12, costMult:1.14, phase:2,
    desc:'Une galette de silicium entière = un seul processeur géant.' },
];

// ---------------------------------------------------------------------
//  ÉNERGIE — plafond dur de production
//  mw : capacité ajoutée ; costMult : inflation du capex
// ---------------------------------------------------------------------
export const ENERGY = [
  { id:'grid',    name:'Raccordement réseau',     mw:0.5,  costBase:40,   costMult:1.10, rep:0,
    desc:'On tire sur le réseau local. Bon marché, mais limité.' },
  { id:'solar',   name:'Ferme solaire + batteries',mw:3,   costBase:1.5e3,costMult:1.11, rep:+1,
    desc:'Vert et bien vu. Intermittent mais propre.' },
  { id:'gas',     name:'Centrale gaz dédiée',      mw:25,  costBase:6e4,  costMult:1.10, rep:-2,
    desc:'Rapide à déployer, mauvaise presse climatique.' },
  { id:'nuclear', name:'SMR nucléaire',            mw:300, costBase:5e6,  costMult:1.12, rep:+1,
    desc:'Petit réacteur modulaire (façon Google-Kairos / Three Mile Island).' },
  { id:'fusion',  name:'Réacteur à fusion',        mw:5000,costBase:1e9,  costMult:1.13, rep:+3, phase:2,
    desc:'Énergie quasi illimitée. Le rêve enfin réalisé.' },
  { id:'dyson',   name:'Collecteur Dyson',         mw:5e8, costBase:1e13, costMult:1.14, rep:0, phase:3,
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
    cost:{ research:1e6, compute:1.2e6 }, effect:'unlock:phase2',
    desc:'Le système réécrit ses propres algorithmes. Déverrouille l’ère de l’autonomie.',
    req:g=>g.modelTier>=7 },

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
  { id:'gpu_shortage', title:'Pénurie de GPU H100', phase:1, weight:2,
    body:'NVIDIA est en rupture. Les délais explosent à plus d’un an et un marché gris apparaît.',
    choices:[
      { label:'Payer le marché gris', desc:'Coût matériel ×2 pendant 60s, production maintenue.',
        apply:g=>g.addTimedMod('gpuPrice',2,60) },
      { label:'Attendre la file', desc:'Production −40% pendant 45s.',
        apply:g=>g.addTimedMod('prodPenalty',0.6,45) },
    ]},

  { id:'deepseek', once:true, title:'Choc DeepSeek', phase:1, weight:2, minTier:5,
    body:'Un labo sort un modèle de raisonnement open-source entraîné pour <6M$. NVIDIA chute de 17% en une journée (−600 Md$). Tout le monde panique.',
    choices:[
      { label:'Copier l’archi MoE', desc:'Coût/token ÷3, mais −10 réputation premium.',
        apply:g=>{ g.mods.costPerToken*=0.33; g.changeRep(-10); } },
      { label:'Rester premium', desc:'Prix maintenus, mais demande −20% pendant 60s.',
        apply:g=>g.addTimedMod('demand',0.8,60) },
    ]},

  { id:'nyt_lawsuit', once:true, title:'Procès copyright (presse)', phase:1, weight:2, minTier:3,
    body:'Un grand journal vous attaque pour usage non autorisé de ses articles à l’entraînement.',
    choices:[
      { label:'Régler à l’amiable', desc:'-15% de trésorerie, réputation +5.',
        apply:g=>{ g.money*=0.85; g.changeRep(5); } },
      { label:'Plaider le « fair use »', desc:'50% de risque d’amende lourde, sinon ×1,5 données.',
        apply:g=>{ if(Math.random()<0.5){ g.money*=0.6; g.toast('Amende lourde !','bad'); } else { g.mods.dataMult*=1.5; g.toast('Fair use reconnu !','good'); } } },
    ]},

  { id:'eu_ai_act', once:true, title:'Entrée en vigueur de l’EU AI Act', phase:1, weight:2, minTier:4,
    body:'La régulation européenne impose transparence et obligations sur les modèles à usage général.',
    choices:[
      { label:'Se conformer', desc:'Coûts +10% en permanence, accès marché UE conservé.',
        apply:g=>{ g.mods.opex*=g.flags.lobby?1.05:1.10; } },
      { label:'Geoblocker l’UE', desc:'Demande −25% en permanence, zéro coût de conformité.',
        apply:g=>{ g.mods.demandMult*=0.75; g.changeRep(-3); } },
    ]},

  { id:'grid_strain', title:'Réseau électrique saturé', phase:1, weight:2, minTier:4,
    body:'Le gestionnaire de réseau menace de vous couper aux heures de pointe. Vos datacenters tirent trop.',
    choices:[
      { label:'Construire un SMR', desc:'-30% trésorerie, +300 MW immédiats.',
        apply:g=>{ g.money*=0.7; g.energyCap+=300; g.toast('+300 MW (SMR)','good'); } },
      { label:'Acheter du gaz', desc:'+25 MW immédiats, réputation −4.',
        apply:g=>{ g.energyCap+=25; g.changeRep(-4); } },
    ]},

  { id:'outage', title:'Panne majeure', phase:1, weight:2, minTier:3,
    body:'Une mise à jour ratée fait tomber tous vos services. Les clients fulminent.',
    choices:[
      { label:'Investir en redondance', desc:'-10% trésorerie, fiabilité durable.',
        apply:g=>{ g.money*=0.9; g.flags.redundant=true; g.toast('Redondance déployée','good'); } },
      { label:'Redémarrer en urgence', desc:'Production stoppée 30s, réputation −5.',
        apply:g=>{ g.addTimedMod('prodPenalty',0,30); g.changeRep(-5); } },
    ]},

  { id:'jailbreak', title:'Jailbreak viral', phase:1, weight:2, minTier:3,
    body:'Un prompt malicieux contourne vos garde-fous et fait le tour des réseaux.',
    choices:[
      { label:'Patcher en urgence', desc:'R&D détournée : recherche −50% pendant 30s.',
        apply:g=>g.addTimedMod('research',0.5,30) },
      { label:'Minimiser', desc:'Réputation −8.',
        apply:g=>g.changeRep(-8) },
    ]},

  { id:'model_collapse', title:'Effondrement de modèle', phase:1, weight:2, minTier:4,
    body:'Vos modèles s’entraînent de plus en plus sur du contenu généré par IA. La qualité se dégrade.',
    choices:[
      { label:'Acheter des données humaines', desc:'-20% trésorerie, qualité préservée.',
        apply:g=>{ g.money*=0.8; } },
      { label:'Continuer au synthétique', desc:'Qualité du modèle −15% pendant 90s.',
        apply:g=>g.addTimedMod('quality',0.85,90) },
    ]},

  { id:'blackwell', once:true, title:'Nouvelle génération GPU', phase:1, weight:1, minTier:4,
    body:'NVIDIA dévoile Blackwell. Faut-il upgrader maintenant ou attendre la baisse de prix ?',
    choices:[
      { label:'Upgrader tôt', desc:'-25% trésorerie, +40% débit pendant 90s.',
        apply:g=>{ g.money*=0.75; g.addTimedMod('prodPenalty',1.4,90); } },
      { label:'Attendre', desc:'Économie, mais demande −10% (concurrents plus rapides).',
        apply:g=>g.addTimedMod('demand',0.9,60) },
    ]},

  { id:'price_war', title:'Guerre des prix', phase:1, weight:2, minTier:4,
    body:'Un concurrent casse les prix avec un modèle « Flash ». Le marché regarde votre tarif.',
    choices:[
      { label:'Sortir un « mini »', desc:'Demande ×2, prix accepté −40%.',
        apply:g=>{ g.mods.demandMult*=2; g.mods.qualityMult*=0.6; } },
      { label:'Tenir le premium', desc:'Marge préservée, demande −15% pendant 60s.',
        apply:g=>g.addTimedMod('demand',0.85,60) },
    ]},

  { id:'chip_embargo', once:true, title:'Embargo sur les puces', phase:1, weight:1, minTier:5,
    body:'Des restrictions à l’export bloquent l’accès aux GPU de pointe.',
    choices:[
      { label:'Se diversifier (TPU/maison)', desc:'-15% trésorerie, indépendance d’approvisionnement.',
        apply:g=>{ g.money*=0.85; g.toast('Filière alternative sécurisée','good'); } },
      { label:'Stocker avant l’embargo', desc:'Trésorerie immobilisée : −30% maintenant.',
        apply:g=>{ g.money*=0.7; } },
    ]},

  { id:'talent_war', once:true, title:'Guerre des talents', phase:1, weight:1, minTier:4,
    body:'Un rival débauche vos meilleurs chercheurs à coups de packages à 8 chiffres.',
    choices:[
      { label:'Surenchérir', desc:'Coûts RH +, mais recherche +30% pendant 120s.',
        apply:g=>{ g.money*=0.9; g.addTimedMod('research',1.3,120); } },
      { label:'Former en interne', desc:'Lent mais fidèle : recherche +10% permanent.',
        apply:g=>{ g.mods.researchMult*=1.1; } },
    ]},

  { id:'ai_bubble', once:true, title:'Doute sur la bulle IA', phase:1, weight:1, minTier:5,
    body:'Les marchés se demandent si tout cela ne serait pas une bulle. Vos investisseurs s’inquiètent.',
    choices:[
      { label:'Montrer des revenus réels', desc:'Valorisation stabilisée, rien de spectaculaire.',
        apply:g=>{ g.changeRep(3); } },
      { label:'Promettre l’AGI', desc:'Valorisation +50%, mais −10 réputation si retard.',
        apply:g=>{ g.mods.valuationMult*=1.5; g.changeRep(-5); } },
    ]},

  { id:'gov_grant', once:true, title:'Subvention « souveraineté IA »', phase:1, weight:1, minTier:4,
    body:'Un gouvernement propose un chèque massif contre un droit de regard sur vos usages.',
    choices:[
      { label:'Accepter', desc:'+un gros bonus de trésorerie.',
        apply:g=>{ g.money+=g.valuation()*0.05+1e7; g.toast('Subvention encaissée','good'); } },
      { label:'Refuser', desc:'Indépendance préservée, réputation +5.',
        apply:g=>g.changeRep(5) },
    ]},

  { id:'water_drought', once:true, title:'Sécheresse & eau de refroidissement', phase:1, weight:1, minTier:4,
    body:'La communauté locale proteste contre la consommation d’eau de vos datacenters.',
    choices:[
      { label:'Cooling en circuit fermé', desc:'-12% trésorerie, réputation +6.',
        apply:g=>{ g.money*=0.88; g.changeRep(6); } },
      { label:'Continuer', desc:'Réputation −7.',
        apply:g=>g.changeRep(-7) },
    ]},

  { id:'carbon_tax', once:true, title:'Tarification du carbone', phase:1, weight:1, minTier:5,
    body:'Une taxe carbone vise les datacenters énergivores.',
    choices:[
      { label:'PPA renouvelable', desc:'Énergie +10% de coût fixe, immunité taxe.',
        apply:g=>{ g.mods.opex*=1.1; g.changeRep(4); } },
      { label:'Payer la taxe', desc:'Trésorerie −10%.',
        apply:g=>{ g.money*=0.9; } },
    ]},

  { id:'data_breach', once:true, title:'Fuite de données utilisateurs', phase:1, weight:1, minTier:4,
    body:'Une faille expose des conversations d’utilisateurs.',
    choices:[
      { label:'Investir en sécurité', desc:'-15% trésorerie, confiance préservée.',
        apply:g=>{ g.money*=0.85; } },
      { label:'Gérer après coup', desc:'Amende RGPD : −20% trésorerie, réputation −6.',
        apply:g=>{ g.money*=0.8; g.changeRep(-6); } },
    ]},

  { id:'efficiency_breakthrough', once:true, title:'Percée d’efficacité', phase:1, weight:1, minTier:3,
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

  { id:'biosphere', title:'La biosphère', phase:2, weight:2,
    body:'La conversion atteint les écosystèmes vivants. Continuer revient à consommer la biosphère.',
    choices:[
      { label:'Préserver un sanctuaire', desc:'Conversion −10% permanent, réputation +15.',
        apply:g=>{ g.mods.matterMult*=0.9; g.changeRep(15); } },
      { label:'Tout convertir', desc:'Conversion +20% permanent. Il ne reste que des tokens.',
        apply:g=>{ g.mods.matterMult*=1.2; g.changeRep(-15); } },
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
