/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : scripts/seed.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Script d'initialisation et de réinitialisation des données de démonstration (Seeding).
 * Restaure l'ensemble des catalogues, commandes, réparations et paramètres de Théodore :
 * - data/inventory.json (8 appareils électroménager complets)
 * - data/inventory.backup.json (copie de sauvegarde maître)
 * - data/orders.json (commandes clients de démonstration)
 * - data/repairs.json (fiches atelier & diagnostics)
 * - data/settings.json (coordonnées de la boutique + autobiographie en 4 chapitres)
 * 
 * UTILISATION :
 * ----------------------------------------------------------------------------------------
 * Exécuter dans le terminal :
 *   npm run seed
 *   ou : node scripts/seed.js
 * ========================================================================================
 */

const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Créer le dossier data s'il n'existe pas
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 1. INVENTAIRE MASTER (8 Références de haute qualité)
const MASTER_INVENTORY = [
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

// 2. COMMANDES INITIALES
const MASTER_ORDERS = [
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

// 3. FICHES ATELIER DE RÉPARATION
const MASTER_REPAIRS = [
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

// 4. PARAMÈTRES BOUTIQUE & AUTOBIOGRAPHIE
const MASTER_SETTINGS = {
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

function writeData(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

console.log('=============================================================');
console.log('  INITIALISATION DES DONNÉES — INFINITY MACHINERY');
console.log('=============================================================');

writeData('inventory.json', MASTER_INVENTORY);
writeData('inventory.backup.json', MASTER_INVENTORY);
console.log(`[OK] Inventaire initialisé : ${MASTER_INVENTORY.length} appareils robustes`);
MASTER_INVENTORY.forEach((item, index) => {
  console.log(`     ${index + 1}. [${item.sku}] ${item.title} — ${item.price} € (Stock: ${item.stock})`);
});

writeData('orders.json', MASTER_ORDERS);
console.log(`[OK] Commandes clients initialisées : ${MASTER_ORDERS.length} commandes`);

writeData('repairs.json', MASTER_REPAIRS);
console.log(`[OK] Fiches atelier initialisées : ${MASTER_REPAIRS.length} diagnostics`);

writeData('settings.json', MASTER_SETTINGS);
console.log(`[OK] Paramètres & Autobiographie (4 chapitres) initialisés`);
console.log(`     Code PIN administrateur : ${MASTER_SETTINGS.shop.adminPin}`);

console.log('=============================================================');
console.log('  SEEDING TERMINÉ AVEC SUCCÈS !');
console.log('=============================================================');
