# Infinity Machinery — Électroménager Robuste, Commande en Ligne & Gestion d'Inventaire

Bienvenue sur le projet web officiel de **Infinity Machinery**, développé sur-mesure pour **Infinity Machinery**, maître artisan électromécanicien.

Ce système complet intègre :
1. **Une boutique en ligne élégante et humaine** (« zéro cliché IA ») avec vente d'électroménager neuf et reconditionné d'atelier, étiquettes officielles d'énergie et indices de réparabilité.
2. **Un système de commande rigoureux** avec vérification stricte des stocks en temps réel et choix entre retrait boutique ou livraison à domicile.
3. **Un tableau de bord complet de gestion d'inventaire (Back-Office pour Théodore)** avec alertes de réassort, ajustement direct de stock en 1 clic (+ / -), ajout d'articles et cycle de vie des commandes.
4. **Une page autobiographique immersive** retraçant les 25+ années de parcours, de passion et d'engagements de Infinity Machinery.

---

## Cartographie & Interconnexion des Fichiers du Codebase

Le schéma ci-dessous illustre comment les différents fichiers du projet communiquent entre eux :

```
                               ┌───────────────────────────────────────────────┐
                               │                 NAVIGATEUR                     │
                               │           public/index.html                   │
                               └──────────────────────┬────────────────────────┘
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       │                              │                              │
                       ▼                              ▼                              ▼
             ┌────────────────────┐        ┌────────────────────┐         ┌────────────────────┐
             │  public/js/app.js  │◄──────►│  public/js/cart.js │◄───────►│public/js/inventory │
             │ (Routage SPA,      │        │ (Panier, stock     │         │      -admin.js     │
             │  catalogue,        │        │  maximum,          │         │ (KPIs, ajusteur    │
             │  détail produit)   │        │  checkout)         │         │  1-clic +/-, CRUD) │
             └─────────┬──────────┘        └──────────┬─────────┘         └──────────┬─────────┘
                       │                              │                              │
                       │                              │     ┌────────────────────────┤
                       │                              │     │ public/js/orders-admin │
                       │                              │     │ (Statuts commandes,    │
                       │                              │     │  bon imprimable)       │
                       │                              │     └────────────┬───────────┘
                       │                              │                  │
                       └──────────────────────┬───────┴──────────────────┘
                                              ▼
                                 ┌────────────────────────┐
                                 │ public/js/data-store.js│
                                 │ (Client API REST JSON) │
                                 └────────────┬───────────┘
                                              │  fetch('/api/*')
                                              ▼
                                 ┌────────────────────────┐
                                 │       server.js        │
                                 │ (Serveur Node.js REST) │
                                 └────────────┬───────────┘
                                              │  fs.readFileSync / writeFileSync
                                              ▼
                       ┌───────────────────────────────────────────────┐
                       │                   DOSSIER data/                │
                       │ ├── inventory.json  (Stocks & Fiches produits)│
                       │ ├── orders.json     (Historique commandes)    │
                       │ ├── repairs.json    (Tickets de dépannage)    │
                       │ └── settings.json   (Théodore & Biographie)   │
                       └───────────────────────────────────────────────┘
```

---

## Rôle et Sections Commentées de Chaque Fichier

Chaque fichier source a été rigoureusement documenté et commenté par section afin de faciliter votre revue de code :

### 1. `server.js` (Serveur Backend HTTP REST)
- **Rôle** : Serveur HTTP natif Node.js (fonctionne sans dépendance npm externe complexe).
- **Sections Clés** :
  - `SECTION 1 : Configuration des types MIME` (gestion des headers Content-Type pour html, css, js, json, jpg...).
  - `SECTION 2 : Helpers de persistance JSON` (`readJson` et `writeJson` pour sauvegarder en continu dans `/data/`).
  - `SECTION 3 : Helpers HTTP` (`parseBody` avec protection 5 Mo et `sendJson` avec en-têtes CORS).
  - `SECTION 4 : Serveur statique` (`serveStatic` avec protection contre le directory traversal et fallback SPA).
  - `SECTION 5 : Routes API REST` :
    - `GET /api/stats` : Calcule les 5 KPIs (références, total unités, valeur marchande, alertes réassort, commandes actives).
    - `GET /api/inventory` : Catalogue avec filtres catégorie, état, recherche et stock disponible.
    - `POST /api/inventory` : Ajout d'un nouvel appareil par Théodore.
    - `PUT /api/inventory/:id` : Modification complète d'une fiche.
    - `PATCH /api/inventory/:id/stock` : **Ajustement rapide de stock en 1 clic** (+1 / -1 / set).
    - `DELETE /api/inventory/:id` : Suppression sécurisée d'un article.
    - `POST /api/orders` : **Création de commande et DÉCRÉMENTATION AUTOMATIQUE DU STOCK**.
    - `PATCH /api/orders/:id/status` : Changement de statut et **RESTAURATION DU STOCK SI ANNULATION**.
    - `GET /api/repairs` & `POST /api/repairs` : Suivi des demandes de diagnostic en atelier.
    - `GET /api/settings` : Informations de Théodore et son texte autobiographique.
  - `SECTION 6 : Démarrage du serveur` (écoute sur le port 3000).

---

### 2. `public/index.html` (Interface Monopage SPA)
- **Rôle** : Point d'entrée utilisateur structuré en 6 vues interactives :
  - `#view-home` : Accueil avec photo de Théodore, promesse de l'artisan et sélection vedette.
  - `#view-catalog` : Boutique complète, recherche par texte/SKU, filtres d'état (*Neuf*, *Reconditionné*) et catégories (*Gros électro*, *Petit électro*).
  - `#view-story` : Autobiographie de Théodore en 4 chapitres et sa charte d'engagement.
  - `#view-services` : Présentation du service de réparation d'atelier et formulaire de diagnostic.
  - `#view-contact` : Adresse, téléphone direct, horaires d'ouverture et facilités d'accès.
  - `#view-admin` : **Espace réservé à Théodore** avec tableau de bord KPI, tableau d'inventaire, boutons +/- et gestion des commandes.
- **Modales Intégrées** :
  - Tiroir Panier latéral (`#cart-drawer-container`).
  - Formulaire de commande sécurisé (`#checkout-modal`).
  - Bon de confirmation de commande imprimable (`#order-confirmation-modal`).
  - Fiche technique détaillée avec étiquette énergie officielle (`#product-detail-modal`).
  - Formulaire de diagnostic de panne (`#repair-request-modal`).
  - Formulaire de déverrouillage PIN admin (`#admin-auth-modal`).
  - Formulaire d'ajout / modification de produit (`#product-edit-modal`).

---

### 3. `public/js/data-store.js` (Couche API Client)
- **Rôle** : Centralise tous les appels réseau asynchrones `fetch()` vers `server.js`.
- **Sections Clés** :
  - `SECTION 1 : Gestion de l'inventaire` (`getInventory`, `addProduct`, `updateProduct`, `adjustStock`, `deleteProduct`).
  - `SECTION 2 : Gestion des commandes` (`getOrders`, `createOrder`, `updateOrderStatus`).
  - `SECTION 3 : Dépannage et réparations` (`getRepairs`, `createRepair`).
  - `SECTION 4 : Statistiques et paramètres` (`getStats`, `getSettings`).
  - `SECTION 5 : Exportation CSV` (`exportToCsv` avec BOM UTF-8 pour ouverture parfaite sous Microsoft Excel).

---

### 4. `public/js/cart.js` (Panier & Validation de Commande)
- **Rôle** : Gère les articles sélectionnés et la validation des commandes.
- **Fonctionnalités Clés** :
  - **Validation stricte de stock** : Impossible d'ajouter au panier plus d'articles que le stock physique présent en magasin.
  - Calcul dynamique : sous-total, choix entre retrait gratuit (0 €) ou livraison par Théodore (29 €).
  - Soumission de commande : appelle `DataStore.createOrder()` qui génère la référence (ex: `CMD-2024-XXXX`), décrémente les stocks sur le serveur et ouvre le bon imprimable.

---

### 5. `public/js/inventory-admin.js` (Tableau de Bord & Inventaire de Théodore)
- **Rôle** : Espace d'administration et de pilotage réservé à l'oncle.
- **Fonctionnalités Clés** :
  - **5 Cartes KPIs** : Références actives, unités en stock, valeur marchande (€), alertes réassort (&le; 2), commandes actives.
  - **Boutons d'ajustement direct `+` et `-`** : Situés sur chaque ligne du tableau, ils permettent à Théodore d'enregistrer une vente au comptoir d'un simple clic sans ouvrir de formulaire.
  - **Ajout & Modification** : Modale complète permettant de renseigner le SKU, le titre, la marque, la catégorie, l'état (*Neuf* / *Reconditionné*), le prix public, le prix de revient, le stock initial, le seuil d'alerte, la classe énergétique (A à G), l'indice de réparabilité (/10), la garantie et l'avis personnel de Théodore.
  - **Export CSV** : Génère un fichier prêt pour tableur (Excel, LibreOffice, Numbers).

---

### 6. `public/js/orders-admin.js` (Traitement des Commandes)
- **Rôle** : Suivi des commandes clients et bons de préparation.
- **Fonctionnalités Clés** :
  - Liste détaillée des commandes avec coordonnées client, adresse, étage, digicode et détails des appareils.
  - Changement de statut (*En attente*, *Confirmée*, *En préparation*, *Prête*, *Livrée*, *Annulée*).
  - **Restauration de stock automatique** : Si Théodore passe une commande en statut « Annulée », le serveur réinjecte automatiquement les quantités en inventaire.
  - **Impression du bon de préparation** : Génère une fiche au format papier avec signature client pour la livraison.

---

### 7. `public/js/app.js` (Chef d'Orchestre du Frontend)
- **Rôle** : Initialise l'application, gère la navigation SPA (`switchView`), peuple les cartes de produits et gère les modales et notifications toast.

---

### 8. `public/css/styles.css` (Design Artisanal & Impression)
- **Rôle** : Feuille de styles soignée sans artifice générique :
  - Couleurs d'atelier (sable lin `#FAF8F5`, ardoise `#1C1917`, cuivre `#C25E34`, ambre `#B45309`).
  - Classes énergétiques européennes officielles (de A vert foncé à G rouge).
  - Badges d'indice officiel de réparabilité (`wrench 8.9/10`).
  - Règles d'impression `@media print` pour imprimer proprement les factures et reçus.

---

## Démarrage et Utilisation

### 1. Lancer le serveur local
Dans le terminal, exécutez simplement :
```bash
node server.js
```
*(ou `npm start`)*

Le serveur démarre immédiatement sur le port **3000** :
```
====================================================
  MAISON DEUGUEU HEMEDAK THÉODORE
  Électroménager Durable & Gestion d'Inventaire
  Serveur actif sur : http://localhost:3000
====================================================
```

### 2. Accéder au site web
Ouvrez votre navigateur web à l'adresse :
**`http://localhost:3000`**

### 3. Accéder à l'Espace Gestionnaire (Back-Office Oncle)
- Cliquez sur le bouton en haut à droite : **« Espace Gestion Théodore (Inventaire) »**.
- **Code PIN d'accès** : `1994` (ou cliquez sur le bouton direct **« Démonstration en 1 clic »**).
- Vous accédez instantanément :
  - Au tableau de bord des stocks avec indicateurs en direct.
  - Aux boutons direct **`+`** et **`-`** pour incrémenter/décrémenter une quantité.
  - Au bouton **« + Ajouter un appareil au stock »**.
  - À l'onglet **« Commandes Clients »** pour suivre les livraisons et imprimer les bons.
  - Au bouton **« Exporter CSV »** pour télécharger votre tableur de stock.

---

## Tests et Vérifications Automatisées

Une suite complète de tests unitaires et d'intégration est incluse dans [`test/verify.js`](file:///Users/ndepemarco/Desktop/Broquante/test/verify.js).

Pour lancer les tests :
```bash
node test/verify.js
```
Résultat vérifié :
- Chargement et intégrité de l'inventaire : **100% PASS**
- Décrémentation automatique du stock lors d'une commande : **100% PASS**
- Restauration automatique du stock lors d'une annulation : **100% PASS**
- Présence et intégrité des 4 chapitres de l'autobiographie de Théodore : **100% PASS**
- Vérification de l'existence et du poids de tous les fichiers du projet : **100% PASS**
