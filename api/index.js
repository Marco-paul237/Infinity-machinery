/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : api/index.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Point d'entrée pour le déploiement Serverless sur Vercel (@vercel/node).
 * Gère l'ensemble des routes API REST (/api/*) avec gestion robuste de la persistance :
 * - Lecture initiale depuis les fichiers seed (/data/*.json).
 * - En environnement Serverless Vercel (où le système de fichiers racine est en lecture seule),
 *   les écritures sont automatiquement redirigées vers la mémoire et le stockage temporaire
 *   (/tmp), évitant toute erreur 'EROFS: read-only file system'.
 * ========================================================================================
 */

const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const TMP_DIR = '/tmp';

/**
 * ========================================================================================
 * SECTION : CHEMINS DE RECHERCHE DU RÉPERTOIRE DATA
 * ----------------------------------------------------------------------------------------
 * Sur Vercel, __dirname pointe vers le répertoire du bundle serverless.
 * Le répertoire data/ peut se trouver à différents endroits selon le bundler.
 * On tente plusieurs chemins possibles pour maximiser la compatibilité.
 * ========================================================================================
 */
const DATA_PATH_CANDIDATES = [
  path.join(__dirname, '..', 'data'),           // Structure standard (dev local)
  path.join(__dirname, 'data'),                  // Si bundlé à côté
  path.join(process.cwd(), 'data'),              // Depuis la racine du projet
  path.resolve(__dirname, '..', '..', 'data'),   // Profondeur supplémentaire
];

/**
 * ========================================================================================
 * SECTION : DONNÉES SEED EMBARQUÉES (FALLBACK GARANTI)
 * ----------------------------------------------------------------------------------------
 * Ces données sont les articles de démonstration qui apparaîtront toujours,
 * même si les fichiers JSON ne sont pas accessibles sur le système de fichiers.
 * C'est la garantie que le site fonctionne dès le premier déploiement sur Vercel.
 * ========================================================================================
 */
const SEED_INVENTORY = [
  {
    "id": "prod-001",
    "sku": "LL-MIE-W1-8K",
    "title": "Lave-Linge Frontal Miele W1 Series 8kg",
    "brand": "Miele",
    "category": "gros-electro",
    "subCategory": "Lave-linge",
    "condition": "Neuf",
    "conditionLabel": "Neuf d'usine (Garanti 2 ans)",
    "price": 899,
    "costPrice": 660,
    "stock": 4,
    "minStockAlert": 2,
    "energyClass": "A",
    "repairabilityIndex": 8.9,
    "warrantyYears": 2,
    "image": "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80",
    "shortDescription": "Moteur ProfiEco silencieux et inusable, tambour Hydrogliss protégeant le linge, système de dosage précis TwinDos.",
    "description": "Le classique indémodable de l'électroménager durable. Conçu pour durer 20 ans d'utilisation intensive. Tambour alvéolé breveté évitant l'usure prématurée des fibres. Bac à produits autonettoyant AutoClean.",
    "uncleNote": "Chez Miele, la cuve est en inox véritable et les paliers sont montés sur roulements remplaçables. C'est l'un des rares lave-linge qu'on pourra encore réparer dans 15 ans avec les yeux fermés. — Théodore Deugueu Hemedak",
    "specs": {
      "Capacité": "8 kg",
      "Vitesse d'essorage": "1400 tr/min",
      "Niveau sonore (essorage)": "68 dB (ultra-silencieux)",
      "Dimensions (H x L x P)": "85 x 59.6 x 64.3 cm",
      "Poids": "90 kg (châssis en fonte lestée)",
      "Disponibilité pièces": "15 ans garantis par le fabricant"
    },
    "featured": true
  },
  {
    "id": "prod-002",
    "sku": "REF-LIEB-PURE-348",
    "title": "Réfrigérateur Combiné Liebherr Pure 348L",
    "brand": "Liebherr",
    "category": "gros-electro",
    "subCategory": "Réfrigérateurs",
    "condition": "Neuf",
    "conditionLabel": "Neuf d'usine (Garanti 2 ans)",
    "price": 799,
    "costPrice": 580,
    "stock": 2,
    "minStockAlert": 2,
    "energyClass": "C",
    "repairabilityIndex": 8.4,
    "warrantyYears": 2,
    "image": "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80",
    "shortDescription": "Froid ventilé NoFrost intégral, tiroir fraîcheur EasyFresh étanche, compresseur Inverter à vitesse variable.",
    "description": "Le froid de précision allemand. Fini le dégivrage manuel grâce à la technologie NoFrost. Les tiroirs montés sur rails télescopiques permettent une manipulation souple même lourdement chargés.",
    "uncleNote": "Compresseur Embraco haute fiabilité. Le circuit froid est accessible à l'arrière avec des raccords standard, ce qui permet un entretien direct sans dégrader l'appareil. — Théodore Deugueu Hemedak",
    "specs": {
      "Volume total": "348 Litres (245L frigo + 103L congélateur)",
      "Type de froid": "NoFrost ventilé (aucun givre)",
      "Niveau sonore": "35 dB (inaudible)",
      "Dimensions (H x L x P)": "185.5 x 59.7 x 67.5 cm",
      "Porte réversible": "Oui (inversion offerte à l'installation)",
      "Disponibilité pièces": "12 ans garantis"
    },
    "featured": true
  },
  {
    "id": "prod-003",
    "sku": "LV-BOS-REC-SIL",
    "title": "Lave-Vaisselle Bosch SilencePlus 13 Couverts (Reconditionné)",
    "brand": "Bosch",
    "category": "reconditionne",
    "subCategory": "Lave-vaisselle",
    "condition": "Reconditionné Atelier",
    "conditionLabel": "Reconditionné Certifié Atelier — Grade A+",
    "price": 389,
    "costPrice": 140,
    "stock": 1,
    "minStockAlert": 2,
    "energyClass": "B",
    "repairabilityIndex": 9.2,
    "warrantyYears": 2,
    "image": "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?auto=format&fit=crop&w=800&q=80",
    "shortDescription": "Révisé sur 28 points en atelier : pompe de vidange et joint de porte neufs, détartrage complet, cuve inox Polinox.",
    "description": "Cet appareil a été entièrement désassemblé, nettoyé aux ultrasons et testé sur 5 cycles complets haute température. Moteur EcoSilence Drive sans balais. Paniers VarioFlex avec picots rabattables.",
    "uncleNote": "Une excellente affaire. L'ancien propriétaire s'en séparait pour une simple électrovanne entartrée. Nous avons remplacé l'électrovanne, la durite d'évacuation et la pompe. Garanti 2 ans pièces et main d'œuvre comme un neuf ! — Théodore",
    "specs": {
      "Nombre de couverts": "13 couverts",
      "Consommation d'eau": "9.5 Litres par cycle Eco",
      "Niveau sonore": "44 dB",
      "Dimensions (H x L x P)": "84.5 x 60 x 60 cm (top amovible)",
      "Intervention atelier": "Pompe de vidange neuve, pressostat neuf, joint de bas de porte neuf",
      "Garantie atelier": "2 ans intégrale"
    },
    "featured": true
  },
  {
    "id": "prod-004",
    "sku": "CAFE-DEL-MAG-S",
    "title": "Machine Espresso à Grain De'Longhi Magnifica S (Reconditionnée)",
    "brand": "De'Longhi",
    "category": "reconditionne",
    "subCategory": "Petit-déjeuner",
    "condition": "Reconditionné Atelier",
    "conditionLabel": "Reconditionné Certifié Atelier — Grade A",
    "price": 249,
    "costPrice": 95,
    "stock": 3,
    "minStockAlert": 2,
    "energyClass": "A",
    "repairabilityIndex": 9.5,
    "warrantyYears": 1,
    "image": "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=800&q=80",
    "shortDescription": "Infuseur amovible révisé, meules acier recalibrées, joints toriques de chaudière neufs, buse vapeur Cappuccino.",
    "description": "La référence du café en grain sans capsule polluante. Pression 15 bars, réglage personnalisé de la finesse de mouture et de la longueur en tasse. Groupe café extractible à la main en 2 secondes pour un rinçage à l'eau tiède.",
    "uncleNote": "La reine des machines réparables ! On trouve chaque joint, clapet et durite au centime près. Nous avons changé le kit complet de joints de la chambre de percolation et graissé les rails à la graisse alimentaire FDA. — Théodore",
    "specs": {
      "Pression": "15 Bars réels",
      "Bac à grains": "250 g avec couvercle hermétique",
      "Réservoir d'eau": "1.8 Litre amovible en façade",
      "Dimensions (H x L x P)": "35.1 x 23.8 x 43.0 cm",
      "Intervention atelier": "Changement kit joints groupe, détartrage acide citrique, étalonnage meules",
      "Garantie atelier": "1 an pièces et main d'œuvre"
    },
    "featured": true
  },
  {
    "id": "prod-005",
    "sku": "FOUR-BOS-PYRO-6",
    "title": "Four Encastrable Pyrolyse Bosch Serie 6 Inox",
    "brand": "Bosch",
    "category": "gros-electro",
    "subCategory": "Fours encastrables",
    "condition": "Neuf",
    "conditionLabel": "Neuf d'usine (Garanti 2 ans)",
    "price": 649,
    "costPrice": 470,
    "stock": 3,
    "minStockAlert": 1,
    "energyClass": "A+",
    "repairabilityIndex": 8.7,
    "warrantyYears": 2,
    "image": "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?auto=format&fit=crop&w=800&q=80",
    "shortDescription": "Chaleur tournante 3D pulsée, nettoyage par pyrolyse haute température 500°C, porte froide 4 vitres amovibles.",
    "description": "Four encastrable robuste à volume généreux de 71 litres. Écran LCD tactile à commande intuitive. Système de rails télescopiques à 1 niveau permettant de sortir les plats lourds sans risque de basculement.",
    "uncleNote": "Les résistances de sole et de voûte sont vissées et non serties : si dans 8 ans une résistance fatigue, ça prend 15 minutes chrono à remplacer à l'atelier sans jeter le four. — Théodore Deugueu Hemedak",
    "specs": {
      "Volume de cuisson": "71 Litres",
      "Modes de cuisson": "10 programmes (Air pulsé 3D, Convection, Gril grand format, Pizza)",
      "Nettoyage": "Pyrolyse 3 niveaux + hydrolyse EcoClean",
      "Dimensions d'encastrement": "58.5 - 59.5 x 56.0 - 56.8 x 55.0 cm",
      "Sécurité": "Porte froide 4 vitres, verrouillage enfant",
      "Disponibilité pièces": "15 ans garantis"
    },
    "featured": false
  },
  {
    "id": "prod-006",
    "sku": "ROBOT-KIT-ART-48",
    "title": "Robot Pâtissier KitchenAid Artisan 4.8L Rouge Empire",
    "brand": "KitchenAid",
    "category": "petit-electro",
    "subCategory": "Robots culinaires",
    "condition": "Neuf",
    "conditionLabel": "Neuf d'usine (Garanti 5 ans constructeur)",
    "price": 549,
    "costPrice": 410,
    "stock": 2,
    "minStockAlert": 1,
    "energyClass": "A",
    "repairabilityIndex": 9.8,
    "warrantyYears": 5,
    "image": "https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?auto=format&fit=crop&w=800&q=80",
    "shortDescription": "Corps en zinc moulé sous pression, moteur à transmission directe 300W sans perte de puissance, engrenages tout métal.",
    "description": "Le roi de la cuisine depuis 1919. Mouvement planétaire assurant un mélange homogène jusqu'au bord du bol. Livré avec bol inox 4.8L avec poignée ergonomique, fouet à 6 fils, batteur plat et crochet pétrisseur.",
    "uncleNote": "C'est l'exemple type de ce que devrait être l'électroménager : un moteur à entraînement direct sans courroie qui lâche. Si le pignon fusible s'use après 15 ans de pâte à pain, la pièce coûte 8 euros et se change facilement. — Théodore",
    "specs": {
      "Puissance": "300 W (moteur à transmission directe équivalent à 1200W courroie)",
      "Capacité du bol": "4.8 Litres (jusqu'à 1 kg de farine ou 12 blancs d'œufs)",
      "Vitesses": "10 paliers progressifs",
      "Poids": "10.4 kg (stabilité parfaite sur le plan de travail)",
      "Garantie": "5 ans pièces et main d'œuvre constructeur",
      "Accessoires inclus": "Fouet inox, batteur, crochet, couvercle verseur anti-éclaboussures"
    },
    "featured": true
  },
  {
    "id": "prod-007",
    "sku": "ASP-MIE-COMP-C3",
    "title": "Aspirateur avec Sac Miele Complete C3 Silence (Reconditionné)",
    "brand": "Miele",
    "category": "reconditionne",
    "subCategory": "Entretien des sols",
    "condition": "Reconditionné Atelier",
    "conditionLabel": "Reconditionné Certifié Atelier — Grade A",
    "price": 189,
    "costPrice": 65,
    "stock": 0,
    "minStockAlert": 1,
    "energyClass": "A",
    "repairabilityIndex": 9.1,
    "warrantyYears": 1,
    "image": "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=800&q=80",
    "shortDescription": "Moteur PowerLine révisé, filtre HEPA AirClean neuf, enrouleur automatique de cordon recalibré, brosse universelle neuve.",
    "description": "Rayon d'action exceptionnel de 12 mètres. Tube télescopique en acier inoxydable. Compartiment intérieur avec 3 accessoires intégrés (suceur long, brosse à meuble, suceur à coussin).",
    "uncleNote": "Filtration à 99.95% des particules. L'enrouleur de cordon a été retendu en atelier et les charbons moteurs sont inspectés avec usure à moins de 5%. Vendu avec 4 sacs d'origine neufs. — Théodore",
    "specs": {
      "Puissance": "890 W",
      "Filtration": "Filtre HEPA AirClean 50 neuf installé",
      "Rayon d'action": "12 mètres (cordon extra-long)",
      "Capacité sac": "4.5 Litres (sacs HyClean 3D GN)",
      "Garantie atelier": "1 an intégrale"
    },
    "featured": false
  },
  {
    "id": "prod-008",
    "sku": "PLA-SAU-IND-3F",
    "title": "Table de Cuisson Induction Sauter 3 Foyers 60cm",
    "brand": "Sauter",
    "category": "gros-electro",
    "subCategory": "Tables de cuisson",
    "condition": "Neuf",
    "conditionLabel": "Neuf d'usine (Garanti 2 ans)",
    "price": 429,
    "costPrice": 310,
    "stock": 5,
    "minStockAlert": 2,
    "energyClass": "A",
    "repairabilityIndex": 8.6,
    "warrantyYears": 2,
    "image": "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
    "shortDescription": "Grand foyer de 28cm de 3600W avec booster, commandes sensitives Slider indépendantes, 10 sécurités intégrées.",
    "description": "Fabriquée en France (label Origine France Garantie). Surface en verre vitrocéramique haute résistance aux chocs thermiques. Fonction mijotage doux et maintien au chaud.",
    "uncleNote": "Carte de puissance électronique séparée pour le grand foyer et les petits foyers : si une surtension survient sur une phase, on ne change que la carte concernée pour une fraction du prix d'une plaque entière. — Théodore Deugueu Hemedak",
    "specs": {
      "Largeur": "60 cm (standard encastrement)",
      "Foyers": "3 foyers dont 1 zone géante de 28 cm",
      "Puissance totale": "7200 W",
      "Sécurités": "Anti-débordement, anti-surchauffe, détection récipients, verrouillage enfant",
      "Fabrication": "France (Vendée)",
      "Disponibilité pièces": "14 ans"
    },
    "featured": false
  }
];

const SEED_ORDERS = [
  {
    "id": "CMD-2024-001",
    "createdAt": "2024-10-14T09:30:00.000Z",
    "customer": {
      "firstName": "Hélène",
      "lastName": "Moreau",
      "email": "helene.moreau@orange.fr",
      "phone": "06 42 19 88 05",
      "address": "14 Rue des Lilas, 75020 Paris",
      "instructions": "Bâtiment B, 2ème étage avec ascenseur, code porte 45A12"
    },
    "deliveryMethod": "delivery",
    "deliveryLabel": "Livraison & Installation par Théodore",
    "paymentMethod": "on_delivery",
    "paymentLabel": "Paiement à la livraison (CB / Chèque)",
    "items": [
      {
        "id": "prod-003",
        "sku": "LV-BOS-REC-SIL",
        "title": "Lave-Vaisselle Bosch SilencePlus 13 Couverts (Reconditionné)",
        "price": 389,
        "quantity": 1
      }
    ],
    "subtotal": 389,
    "deliveryFee": 29,
    "total": 418,
    "status": "delivered",
    "statusLabel": "Livré & Installé",
    "notes": "Ancien lave-vaisselle repris pour recyclage pièces en atelier."
  },
  {
    "id": "CMD-2024-002",
    "createdAt": "2024-11-02T14:15:00.000Z",
    "customer": {
      "firstName": "Antoine",
      "lastName": "Garnier",
      "email": "a.garnier@gmail.com",
      "phone": "06 78 54 12 90",
      "address": "Boutique Atelier Infinity Machinery",
      "instructions": "Passage en fin d'après-midi vers 17h30"
    },
    "deliveryMethod": "pickup",
    "deliveryLabel": "Retrait gratuit à la boutique",
    "paymentMethod": "store_pickup",
    "paymentLabel": "Paiement au comptoir",
    "items": [
      {
        "id": "prod-004",
        "sku": "CAFE-DEL-MAG-S",
        "title": "Machine Espresso à Grain De'Longhi Magnifica S (Reconditionnée)",
        "price": 249,
        "quantity": 1
      }
    ],
    "subtotal": 249,
    "deliveryFee": 0,
    "total": 249,
    "status": "ready",
    "statusLabel": "Prête en magasin pour retrait",
    "notes": "Client averti par SMS."
  }
];

const SEED_REPAIRS = [
  {
    "id": "REP-2024-001",
    "createdAt": "2024-11-05T10:00:00.000Z",
    "customer": {
      "name": "Jean-Pierre Vasseur",
      "phone": "06 12 34 56 78",
      "email": "jp.vasseur@wanadoo.fr"
    },
    "appliance": {
      "type": "Lave-linge",
      "brand": "Electrolux",
      "model": "PerfectCare 600",
      "approxAge": "6 ans"
    },
    "issue": "Bruit métallique très sourd lors de l'essorage. Tambour qui semble avoir du jeu.",
    "status": "in_progress",
    "statusLabel": "En cours d'intervention en atelier",
    "quote": 85,
    "diagnosis": "Roulements de palier usés suite à fuite du joint spi. Pièces reçues, remontage prévu vendredi."
  },
  {
    "id": "REP-2024-002",
    "createdAt": "2024-11-08T15:20:00.000Z",
    "customer": {
      "name": "Sophie Leroux",
      "phone": "06 99 88 77 66",
      "email": "sophie.leroux@outlook.com"
    },
    "appliance": {
      "type": "Machine expresso à grain",
      "brand": "Jura",
      "model": "ENA Micro 9",
      "approxAge": "4 ans"
    },
    "issue": "Le café coule au goutte-à-goutte et message d'erreur 'Système vide' répété.",
    "status": "completed",
    "statusLabel": "Réparé — Prêt à être récupéré",
    "quote": 60,
    "diagnosis": "Débitmètre entartré + électrovanne 2 voies bloquée. Démontage, bain ultrasons et joints remplacés."
  }
];

const SEED_SETTINGS = {
  "shop": {
    "name": "Infinity Machinery",
    "legalName": "Infinity Machinery — Maison Deugueu Hemedak Théodore",
    "subtitle": "Électroménager Durable, Sélection Rigoureuse & Atelier d'Entretien",
    "tagline": "L'alliance de la robustesse industrielle et du savoir-faire d'artisan depuis plus de 25 ans",
    "ownerName": "Deugueu Hemedak Théodore",
    "ownerTitle": "Fondateur & Maître Électromécanicien",
    "ownerPhoto": "/images/theodore_deugueu.jpg",
    "address": "42 Rue du Commerce & des Artisans, Paris",
    "phone": "01 43 55 28 90",
    "mobile": "06 18 92 41 33",
    "email": "contact@infinity-machinery.fr",
    "hours": {
      "weekdays": "Mardi au Vendredi : 9h00 - 12h30 & 14h00 - 19h00",
      "saturday": "Samedi : 9h30 - 18h30 en continu",
      "closed": "Dimanche & Lundi : Fermé (dédié aux interventions et reconditionnement)"
    },
    "deliveryZone": "Livraison locale et installation complète à domicile",
    "adminPin": "1994"
  },
  "autobiography": {
    "quote": "« Chez Infinity Machinery, chaque machine est choisie ou reconditionnée pour durer. Vous n'achetez pas un simple carton anonyme : vous achetez un équipement vérifié de mes propres mains, avec un conseil sincère forgé par des décennies de métier et un engagement d'artisan à vous accompagner. »",
    "author": "Deugueu Hemedak Théodore",
    "photo": "/images/theodore_deugueu.jpg",
    "chapters": [
      {
        "id": "chap-1",
        "period": "1988 — 1993 : L'Apprentissage",
        "title": "Chapitre I : L'école de la rigueur et la passion des circuits",
        "content": "J'ai toujours été fasciné par la façon dont les machines fonctionnent. Très jeune, je ne me contentais pas d'utiliser un appareil : je voulais comprendre ce qui faisait tourner le moteur, comment le courant était distribué, pourquoi un relais s'enclenchait et comment une simple panne mécanique pouvait être résolue avec de la patience et du bon sens.\n\nCet apprentissage exigeant m'a forgé : le respect scrupuleux des normes de sécurité, la maîtrise des mesures électriques et l'écoute attentive de chaque vibration ou bruit anormal d'un tambour ou d'un compresseur. On m'a transmis une règle d'or que je n'ai jamais oubliée : un appareil de qualité est un investissement pour une famille, et notre devoir est de le faire durer."
      },
      {
        "id": "chap-2",
        "period": "1994 — 2005 : L'Enseigne & La Proximité",
        "title": "Chapitre II : L'ouverture du magasin et le lien humain",
        "content": "Quand j'ai ouvert ma propre boutique d'électroménager, j'avais une conviction profonde : le commerce doit être fondé sur la parole donnée et la relation humaine directe. Dans les grandes surfaces impersonnelles, personne ne connaît votre nom et personne ne sera là si votre machine a un problème deux mois après l'achat.\n\nDans ma boutique, chaque client qui passe la porte est reçu avec considération. Qu'il s'agisse de choisir un réfrigérateur familial, un four robuste ou une machine expresso, je prends le temps de comprendre les besoins réels, l'espace disponible et l'usage quotidien. C'est cette proximité qui a bâti la réputation de notre maison au fil des années."
      },
      {
        "id": "chap-3",
        "period": "2006 — 2018 : La Résistance au Jetable",
        "title": "Chapitre III : Le refus du tout-jetable et le choix de la durabilité",
        "content": "Au fil des décennies, j'ai vu l'industrie changer : prolifération des plastiques fragiles, pièces scellées impossibles à réparer, obsolescence délibérément accélérée... J'ai toujours refusé d'embarquer mes clients dans cette spirale du gaspillage.\n\nC'est pourquoi je sélectionne méticuleusement chaque référence présente dans mon magasin : uniquement des marques qui assurent la disponibilité de leurs pièces détachées pendant au moins 10 à 15 ans, avec des cuves métalliques, des moteurs à induction fiables et des circuits accessibles. Et pour les appareils reconditionnés à l'atelier, nous effectuons un contrôle exhaustif sur 28 points de vérification avant de les certifier et de les garantir."
      },
      {
        "id": "chap-4",
        "period": "Aujourd'hui : Infinity Machinery",
        "title": "Chapitre IV : L'ère de la modernisation et de la transmission",
        "content": "Aujourd'hui, avec la marque Infinity Machinery, nous franchissons une nouvelle étape en associant la solidité de nos machines à une plateforme moderne. Mon neveu m'a aidé à concevoir ce site et ce système de gestion d'inventaire complet pour que nos clients puissent réserver, commander et suivre la disponibilité de nos équipements en temps réel.\n\nVous y trouverez mes vrais retours d'expérience, les fiches techniques exactes sans discours marketing creux, et la garantie d'un service d'atelier toujours présent. Bienvenue chez Infinity Machinery !"
      }
    ],
    "principles": [
      {
        "icon": "shield-check",
        "title": "Engagement & Parole d'Honneur",
        "description": "Chaque modèle vendu est garanti directement par notre maison, avec un suivi personnalisé et un interlocuteur unique : Théodore."
      },
      {
        "icon": "wrench",
        "title": "Réparabilité Maximale",
        "description": "Nous privilégions les appareils démontables avec disponibilité des composants garantie pendant 10 à 15 ans par les constructeurs."
      },
      {
        "icon": "truck",
        "title": "Livraison & Installation Complète",
        "description": "Nous ne déposons pas un carton sur le trottoir : installation à domicile, mise à niveau au millimètre, raccordement et reprise."
      },
      {
        "icon": "recycle",
        "title": "Contrôle Atelier 28 Points",
        "description": "Nos appareils reconditionnés sont révisés de fond en comble, détartrés, équipés de joints neufs et testés en conditions réelles."
      }
    ]
  }
};

/**
 * ========================================================================================
 * SECTION : MAPPING DES DONNÉES SEED PAR NOM DE FICHIER
 * ----------------------------------------------------------------------------------------
 * Permet à readJson() de retrouver le fallback correspondant à chaque fichier.
 * ========================================================================================
 */
const SEED_DEFAULTS = {
  'inventory.json': SEED_INVENTORY,
  'inventory.backup.json': SEED_INVENTORY,
  'orders.json': SEED_ORDERS,
  'repairs.json': SEED_REPAIRS,
  'settings.json': SEED_SETTINGS
};

// Cache en mémoire pour garantir la réactivité et la compatibilité serverless
const memoryStore = {};

/**
 * ========================================================================================
 * SECTION : HELPER DE LECTURE RÉSISTANT À L'ENVIRONNEMENT SERVERLESS VERCEL
 * ----------------------------------------------------------------------------------------
 * Stratégie de lecture en 4 niveaux :
 *   1. Cache mémoire (le plus rapide, persiste pendant la vie de l'instance Lambda)
 *   2. Fichier dans /tmp (écrit par un appel writeJson précédent dans la même instance)
 *   3. Fichier dans le répertoire data/ (essaie plusieurs chemins possibles)
 *   4. Données seed embarquées (fallback garanti — ne peut jamais échouer)
 * ========================================================================================
 */
function readJson(filename, defaultValue = []) {
  const tmpPath = path.join(TMP_DIR, filename);

  // 1. Si déjà présent dans le cache mémoire
  if (memoryStore[filename]) {
    return memoryStore[filename];
  }

  // 2. Si déjà écrit dans /tmp (par un writeJson précédent sur cette instance)
  try {
    if (fs.existsSync(tmpPath)) {
      const content = fs.readFileSync(tmpPath, 'utf-8');
      memoryStore[filename] = JSON.parse(content);
      return memoryStore[filename];
    }
  } catch (e) {
    // Ignorer et passer à l'étape suivante
  }

  // 3. Lire depuis data/ en essayant plusieurs chemins candidats
  for (const candidateDir of DATA_PATH_CANDIDATES) {
    try {
      const dataPath = path.join(candidateDir, filename);
      if (fs.existsSync(dataPath)) {
        const content = fs.readFileSync(dataPath, 'utf-8');
        memoryStore[filename] = JSON.parse(content);
        console.log(`[readJson] Chargé ${filename} depuis ${dataPath}`);
        return memoryStore[filename];
      }
    } catch (e) {
      // Ignorer et essayer le chemin suivant
    }
  }

  // 4. Fallback : données seed embarquées directement dans le code
  if (SEED_DEFAULTS[filename]) {
    console.log(`[readJson] Fallback seed embarqué pour ${filename}`);
    // Deep-clone pour éviter de modifier la constante
    memoryStore[filename] = JSON.parse(JSON.stringify(SEED_DEFAULTS[filename]));
    return memoryStore[filename];
  }

  memoryStore[filename] = defaultValue;
  return defaultValue;
}

/**
 * ========================================================================================
 * SECTION : HELPER D'ÉCRITURE RÉSISTANT À L'ENVIRONNEMENT SERVERLESS VERCEL
 * ----------------------------------------------------------------------------------------
 * Stratégie d'écriture :
 *   1. Met toujours à jour le cache mémoire (source de vérité pour l'instance Lambda)
 *   2. Tente d'écrire dans le répertoire data/ (succès en dev local)
 *   3. Si échec (Vercel lecture seule), écrit dans /tmp comme secours
 * ========================================================================================
 */
function writeJson(filename, data) {
  memoryStore[filename] = data;

  // Tentative d'écriture dans data/ (pour dev local — essaie le premier chemin existant)
  let written = false;
  for (const candidateDir of DATA_PATH_CANDIDATES) {
    try {
      const dataPath = path.join(candidateDir, filename);
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
      written = true;
      break;
    } catch (e) {
      // Chemin non inscriptible, essayer le suivant
    }
  }

  // Si aucun chemin data/ n'a fonctionné (Vercel Serverless), écrire dans /tmp
  if (!written) {
    try {
      const tmpPath = path.join(TMP_DIR, filename);
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (tmpErr) {
      console.warn(`Avertissement persistance /tmp pour ${filename}:`, tmpErr.message);
    }
  }
  return true;
}

/**
 * Parse le body JSON d'une requête.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    // Si Vercel a déjà parsé le body (req.body existe)
    if (req.body && typeof req.body === 'object') {
      return resolve(req.body);
    }
    if (req.body && typeof req.body === 'string') {
      try {
        return resolve(JSON.parse(req.body));
      } catch (err) {
        return resolve({});
      }
    }

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) reject(new Error('Payload trop volumineux'));
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

/**
 * Envoie une réponse JSON avec en-têtes CORS.
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  res.end(JSON.stringify(data));
}

/**
 * Gestionnaire principal de requêtes API Vercel Serverless.
 */
module.exports = async function handler(req, res) {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '';
  const query = parsedUrl.query || {};
  const method = req.method;

  // Harmonisation du préfixe /api si appelé via rewrite
  if (!pathname.startsWith('/api') && pathname.startsWith('/')) {
    pathname = '/api' + pathname;
  }

  // CORS pre-flight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // 1. GET /api/stats (KPIs)
  if (method === 'GET' && pathname === '/api/stats') {
    const inventory = readJson('inventory.json', []);
    const orders = readJson('orders.json', []);
    const repairs = readJson('repairs.json', []);

    const totalReferences = inventory.length;
    const totalStock = inventory.reduce((acc, item) => acc + (Number(item.stock) || 0), 0);
    const totalInventoryValue = inventory.reduce((acc, item) => acc + ((Number(item.price) || 0) * (Number(item.stock) || 0)), 0);
    const lowStockItems = inventory.filter(item => (Number(item.stock) || 0) <= (Number(item.minStockAlert) || 2));
    const outOfStockItems = inventory.filter(item => (Number(item.stock) || 0) <= 0);
    const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'delivered');
    const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + (Number(o.total) || 0), 0);

    return sendJson(res, 200, {
      totalReferences,
      totalStock,
      totalInventoryValue,
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
      ordersCount: orders.length,
      activeOrdersCount: activeOrders.length,
      totalRevenue,
      repairsCount: repairs.length,
      activeRepairsCount: repairs.filter(r => r.status !== 'completed').length
    });
  }

  // 2. GET /api/inventory (Catalogue)
  if (method === 'GET' && pathname === '/api/inventory') {
    let inventory = readJson('inventory.json', []);

    if (query.category && query.category !== 'all') {
      inventory = inventory.filter(item => item.category === query.category);
    }
    if (query.condition && query.condition !== 'all') {
      inventory = inventory.filter(item => item.condition === query.condition);
    }
    if (query.inStock === 'true') {
      inventory = inventory.filter(item => item.stock > 0);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      inventory = inventory.filter(item => 
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.shortDescription && item.shortDescription.toLowerCase().includes(q))
      );
    }

    return sendJson(res, 200, inventory);
  }

  // 3. POST /api/inventory (Ajout de produit)
  if (method === 'POST' && pathname === '/api/inventory') {
    try {
      const payload = await parseBody(req);
      const inventory = readJson('inventory.json', []);

      if (!payload.title || payload.price === undefined) {
        return sendJson(res, 400, { error: 'Le titre et le prix sont obligatoires.' });
      }

      const newId = `prod-${Date.now().toString().slice(-6)}`;
      const newSku = payload.sku || `ART-${Math.floor(1000 + Math.random() * 9000)}`;

      const newItem = {
        id: newId,
        sku: newSku.toUpperCase(),
        title: payload.title.trim(),
        brand: (payload.brand || 'Infinity Machinery').trim(),
        category: payload.category || 'gros-electro',
        subCategory: payload.subCategory || 'Divers',
        condition: payload.condition || 'Neuf',
        conditionLabel: payload.conditionLabel || (payload.condition === 'Reconditionné Atelier' ? 'Reconditionné Certifié Atelier — Grade A' : 'Neuf d\'usine (Garanti 2 ans)'),
        price: Number(payload.price) || 0,
        costPrice: Number(payload.costPrice) || Math.round((Number(payload.price) || 0) * 0.65),
        stock: Math.max(0, parseInt(payload.stock, 10) || 0),
        minStockAlert: Math.max(1, parseInt(payload.minStockAlert, 10) || 2),
        energyClass: payload.energyClass || 'A',
        repairabilityIndex: parseFloat(payload.repairabilityIndex) || 8.5,
        warrantyYears: parseInt(payload.warrantyYears, 10) || 2,
        image: payload.image || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
        shortDescription: payload.shortDescription || 'Appareil inspecté et certifié par Théodore.',
        description: payload.description || payload.shortDescription || 'Appareil robuste garanti pièces et main d\'œuvre.',
        uncleNote: payload.uncleNote || 'Testé sur banc d\'essai par Théodore Deugueu Hemedak.',
        specs: payload.specs || {
          "Dimensions": "Standard",
          "Garantie atelier": `${payload.warrantyYears || 2} ans intégrale`
        },
        featured: Boolean(payload.featured)
      };

      inventory.unshift(newItem);
      writeJson('inventory.json', inventory);

      return sendJson(res, 201, newItem);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 4. PUT /api/inventory/:id (Mise à jour produit)
  if (method === 'PUT' && pathname.startsWith('/api/inventory/')) {
    const id = pathname.replace('/api/inventory/', '');
    try {
      const payload = await parseBody(req);
      const inventory = readJson('inventory.json', []);
      const index = inventory.findIndex(item => item.id === id);

      if (index === -1) {
        return sendJson(res, 404, { error: 'Article introuvable' });
      }

      inventory[index] = {
        ...inventory[index],
        ...payload,
        id: inventory[index].id,
        price: payload.price !== undefined ? Number(payload.price) : inventory[index].price,
        costPrice: payload.costPrice !== undefined ? Number(payload.costPrice) : inventory[index].costPrice,
        stock: payload.stock !== undefined ? Math.max(0, parseInt(payload.stock, 10)) : inventory[index].stock,
        minStockAlert: payload.minStockAlert !== undefined ? parseInt(payload.minStockAlert, 10) : inventory[index].minStockAlert,
        repairabilityIndex: payload.repairabilityIndex !== undefined ? parseFloat(payload.repairabilityIndex) : inventory[index].repairabilityIndex,
        warrantyYears: payload.warrantyYears !== undefined ? parseInt(payload.warrantyYears, 10) : inventory[index].warrantyYears
      };

      writeJson('inventory.json', inventory);
      return sendJson(res, 200, inventory[index]);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 5. PATCH /api/inventory/:id/stock (Ajusteur rapide 1-clic)
  if (method === 'PATCH' && pathname.match(/^\/api\/inventory\/[^/]+\/stock$/)) {
    const parts = pathname.split('/');
    const id = parts[3];
    try {
      const payload = await parseBody(req);
      const inventory = readJson('inventory.json', []);
      const item = inventory.find(i => i.id === id);

      if (!item) {
        return sendJson(res, 404, { error: 'Article introuvable' });
      }

      let newStock = item.stock;
      if (payload.delta !== undefined) {
        newStock += Number(payload.delta);
      } else if (payload.set !== undefined) {
        newStock = Number(payload.set);
      }
      item.stock = Math.max(0, Math.round(newStock));

      writeJson('inventory.json', inventory);
      return sendJson(res, 200, { id: item.id, stock: item.stock, minStockAlert: item.minStockAlert });
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 6. DELETE /api/inventory/:id (Suppression)
  if (method === 'DELETE' && pathname.startsWith('/api/inventory/')) {
    const id = pathname.replace('/api/inventory/', '');
    const inventory = readJson('inventory.json', []);
    const filtered = inventory.filter(item => item.id !== id);

    if (filtered.length === inventory.length) {
      return sendJson(res, 404, { error: 'Article introuvable' });
    }

    writeJson('inventory.json', filtered);
    return sendJson(res, 200, { message: 'Article supprimé avec succès' });
  }

  // 7. POST /api/inventory/reset (Reset démo — recharge les données seed d'origine)
  if (method === 'POST' && pathname === '/api/inventory/reset') {
    // Utilise readJson qui essaiera les fichiers puis le seed embarqué en fallback
    // On vide d'abord le cache pour forcer un rechargement frais
    delete memoryStore['inventory.backup.json'];
    const backupData = readJson('inventory.backup.json', null);
    if (backupData && Array.isArray(backupData) && backupData.length > 0) {
      // Deep-clone pour éviter de lier les deux caches
      const freshCopy = JSON.parse(JSON.stringify(backupData));
      writeJson('inventory.json', freshCopy);
      return sendJson(res, 200, { message: 'Inventaire restauré', count: freshCopy.length });
    }
    return sendJson(res, 400, { error: 'Sauvegarde initiale introuvable' });
  }

  // 8. GET /api/orders (Liste commandes)
  if (method === 'GET' && pathname === '/api/orders') {
    const orders = readJson('orders.json', []);
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sendJson(res, 200, orders);
  }

  // 9. POST /api/orders (Création commande + Décrémentation automatique du stock)
  if (method === 'POST' && pathname === '/api/orders') {
    try {
      const payload = await parseBody(req);
      const inventory = readJson('inventory.json', []);
      const orders = readJson('orders.json', []);

      if (!payload.customer || !payload.items || !payload.items.length) {
        return sendJson(res, 400, { error: 'Données de commande incomplètes.' });
      }

      for (const orderItem of payload.items) {
        const product = inventory.find(p => p.id === orderItem.id);
        if (!product) {
          return sendJson(res, 400, { error: `L'article "${orderItem.title || orderItem.id}" n'existe plus.` });
        }
        if (product.stock < orderItem.quantity) {
          return sendJson(res, 400, { 
            error: `Stock insuffisant pour "${product.title}". Stock disponible : ${product.stock}, demandé : ${orderItem.quantity}.` 
          });
        }
      }

      // Décrémenter le stock
      for (const orderItem of payload.items) {
        const product = inventory.find(p => p.id === orderItem.id);
        product.stock -= orderItem.quantity;
      }
      writeJson('inventory.json', inventory);

      const orderNumber = `CMD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newOrder = {
        id: orderNumber,
        createdAt: new Date().toISOString(),
        customer: {
          firstName: payload.customer.firstName || '',
          lastName: payload.customer.lastName || '',
          email: payload.customer.email || '',
          phone: payload.customer.phone || '',
          address: payload.customer.address || '',
          instructions: payload.customer.instructions || ''
        },
        deliveryMethod: payload.deliveryMethod || 'pickup',
        deliveryLabel: payload.deliveryMethod === 'delivery' 
          ? 'Livraison & Installation par Théodore' 
          : 'Retrait gratuit à la boutique',
        paymentMethod: payload.paymentMethod || 'store_pickup',
        paymentLabel: payload.paymentLabel || 'Paiement au comptoir',
        items: payload.items.map(item => ({
          id: item.id,
          sku: item.sku || '',
          title: item.title || '',
          price: Number(item.price) || 0,
          quantity: Number(item.quantity) || 1
        })),
        subtotal: Number(payload.subtotal) || 0,
        deliveryFee: Number(payload.deliveryFee) || 0,
        total: Number(payload.total) || 0,
        status: 'pending',
        statusLabel: 'En attente de préparation',
        notes: payload.notes || ''
      };

      orders.unshift(newOrder);
      writeJson('orders.json', orders);

      return sendJson(res, 201, newOrder);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 10. PATCH /api/orders/:id/status (Changement statut + Restauration automatique stock si annulation)
  if (method === 'PATCH' && pathname.match(/^\/api\/orders\/[^/]+\/status$/)) {
    const parts = pathname.split('/');
    const orderId = parts[3];
    try {
      const payload = await parseBody(req);
      const orders = readJson('orders.json', []);
      const order = orders.find(o => o.id === orderId);

      if (!order) {
        return sendJson(res, 404, { error: 'Commande introuvable' });
      }

      const prevStatus = order.status;
      const nextStatus = payload.status;

      const STATUS_LABELS = {
        'pending': 'En attente de préparation',
        'confirmed': 'Confirmée par Théodore',
        'processing': 'En cours de préparation à l\'atelier',
        'ready': 'Prête pour retrait / livraison',
        'delivered': 'Livrée & Terminée',
        'cancelled': 'Annulée'
      };

      order.status = nextStatus;
      order.statusLabel = STATUS_LABELS[nextStatus] || nextStatus;
      if (payload.notes) order.notes = payload.notes;

      // Restauration automatique du stock si annulation
      if (prevStatus !== 'cancelled' && nextStatus === 'cancelled') {
        const inventory = readJson('inventory.json', []);
        for (const item of order.items) {
          const product = inventory.find(p => p.id === item.id);
          if (product) {
            product.stock += item.quantity;
          }
        }
        writeJson('inventory.json', inventory);
      }

      writeJson('orders.json', orders);
      return sendJson(res, 200, order);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 11. GET & POST /api/repairs
  if (method === 'GET' && pathname === '/api/repairs') {
    const repairs = readJson('repairs.json', []);
    repairs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sendJson(res, 200, repairs);
  }

  if (method === 'POST' && pathname === '/api/repairs') {
    try {
      const payload = await parseBody(req);
      const repairs = readJson('repairs.json', []);

      if (!payload.customer || !payload.appliance) {
        return sendJson(res, 400, { error: 'Informations incomplètes.' });
      }

      const newRepair = {
        id: `REP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        createdAt: new Date().toISOString(),
        customer: {
          name: payload.customer.name || '',
          phone: payload.customer.phone || '',
          email: payload.customer.email || ''
        },
        appliance: {
          type: payload.appliance.type || '',
          brand: payload.appliance.brand || '',
          model: payload.appliance.model || 'Non précisé',
          approxAge: payload.appliance.approxAge || 'Inconnu'
        },
        issue: payload.issue || '',
        status: 'pending',
        statusLabel: 'Demande reçue — En attente de dépôt en atelier',
        quote: 0,
        diagnosis: 'Rendez-vous de diagnostic à convenir avec Théodore.'
      };

      repairs.unshift(newRepair);
      writeJson('repairs.json', repairs);

      return sendJson(res, 201, newRepair);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }
  }

  // 12. GET & PUT /api/settings
  if (pathname === '/api/settings') {
    if (method === 'GET') {
      const settings = readJson('settings.json', {});
      return sendJson(res, 200, settings);
    }
    if (method === 'PUT') {
      try {
        const payload = await parseBody(req);
        const current = readJson('settings.json', {});
        const updated = { ...current, ...payload };
        writeJson('settings.json', updated);
        return sendJson(res, 200, updated);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
  }

  // 404 pour les routes inconnues
  return sendJson(res, 404, { error: `Route API introuvable : ${pathname}` });
};
