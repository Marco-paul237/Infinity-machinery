/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : server.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Serveur backend HTTP natif Node.js (sans dépendance externe superflue).
 * Il remplit deux missions clés :
 * 1. API REST : Gère les opérations CRUD sur l'inventaire, les commandes, les statistiques,
 *    les tickets de réparation et les paramètres de la boutique.
 * 2. Serveur de fichiers statiques : Distribue index.html, styles.css, les scripts JS,
 *    et les images (dont la photo de Infinity Machinery).
 * 
 * COMMENT CE FICHIER EST INTERCONNECTÉ AVEC LE RESTE DU PROJET :
 * ----------------------------------------------------------------------------------------
 * - Données (/data/*.json) :
 *   * Lit et écrit dans `inventory.json` pour maintenir le catalogue et les stocks réels.
 *   * Lit et écrit dans `orders.json` pour stocker les commandes clients.
 *   * Lit et écrit dans `repairs.json` pour les demandes de diagnostic en atelier.
 *   * Lit et écrit dans `settings.json` pour les informations de Théodore et son autobiographie.
 * - Frontend (/public/*) :
 *   * Fournit les données consommées par `public/js/data-store.js` via fetch('/api/*').
 *   * Reçoit les commandes de `public/js/cart.js` et décrémente automatiquement les stocks.
 *   * Reçoit les ajustements manuels de stock de `public/js/inventory-admin.js`.
 *   * Reçoit les changements de statut de commande de `public/js/orders-admin.js`
 *     (et recrédite automatiquement le stock si une commande est annulée).
 * ========================================================================================
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

// Port d'écoute du serveur (3000 par défaut ou variable d'environnement)
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

/**
 * ========================================================================================
 * SECTION 1 : CONFIGURATION DES TYPES MIME POUR LE SERVEUR STATIQUE
 * ========================================================================================
 * Permet au navigateur de recevoir les fichiers avec le bon Content-Type HTTP.
 */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

/**
 * ========================================================================================
 * SECTION 2 : HELPERS DE PERSISTANCE DES DONNÉES (FICHIERS JSON)
 * ========================================================================================
 * Fonctions synchrones sécurisées pour lire et écrire dans le dossier /data sans base externe.
 */

/**
 * Lit un fichier JSON dans le dossier /data. Si le fichier n'existe pas, il est créé.
 * @param {string} filename - Nom du fichier (ex: 'inventory.json')
 * @param {any} defaultValue - Valeur par défaut en cas d'absence
 * @returns {any} Données parsées
 */
function readJson(filename, defaultValue = []) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`[ERREUR LECTURE] ${filename}:`, err);
    return defaultValue;
  }
}

/**
 * Écrit des données dans un fichier JSON avec indentation lisible.
 * @param {string} filename - Nom du fichier
 * @param {any} data - Objet ou tableau à sauvegarder
 * @returns {boolean} true en cas de succès
 */
function writeJson(filename, data) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`[ERREUR ÉCRITURE] ${filename}:`, err);
    return false;
  }
}

// Création d'une sauvegarde de sécurité du catalogue initial au démarrage
const originalInventoryPath = path.join(DATA_DIR, 'inventory.backup.json');
if (!fs.existsSync(originalInventoryPath) && fs.existsSync(path.join(DATA_DIR, 'inventory.json'))) {
  fs.copyFileSync(path.join(DATA_DIR, 'inventory.json'), originalInventoryPath);
}

/**
 * ========================================================================================
 * SECTION 3 : HELPERS HTTP POUR LE TRAITEMENT DES REQUÊTES ET RÉPONSES
 * ========================================================================================
 */

/**
 * Extrait et parse le corps JSON d'une requête HTTP entrante (POST, PUT, PATCH).
 * Limite la taille de payload à 5 Mo pour prévenir les surcharges.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 5 * 1024 * 1024) {
        reject(new Error('Payload trop volumineux (> 5Mo)'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Format JSON invalide dans le corps de la requête'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Répond au client au format JSON avec en-têtes CORS et désactivation du cache navigateur.
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
 * ========================================================================================
 * SECTION 4 : DISTRIBUTION DES FICHIERS STATIQUES DU FRONTEND
 * ========================================================================================
 * Distribue les fichiers situés dans /public (HTML, CSS, JS, images).
 * Protège contre les attaques de directory traversal (chemins remontants /../).
 */
function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const resolvedPath = path.normalize(path.join(PUBLIC_DIR, safePath));

  // Vérification de sécurité : le chemin résolu doit impérativement débuter par PUBLIC_DIR
  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('403 Accès interdit');
  }

  fs.stat(resolvedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback SPA : si la route n'a pas d'extension de fichier, renvoyer index.html
      if (!path.extname(safePath)) {
        const fallbackPath = path.join(PUBLIC_DIR, 'index.html');
        return fs.readFile(fallbackPath, (readErr, content) => {
          if (readErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('404 Page introuvable');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Fichier non trouvé');
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(resolvedPath);
    stream.pipe(res);
  });
}

/**
 * ========================================================================================
 * SECTION 5 : ROUTAGE ET GESTION DES REQUÊTES API REST
 * ========================================================================================
 */
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  const method = req.method;

  // Gestion du pre-flight CORS pour les requêtes modernes
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // --------------------------------------------------------------------------------------
  // ROUTE 1 : GET /api/stats (Indicateurs clés KPI pour le tableau de bord de Théodore)
  // --------------------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------------------
  // ROUTE 2 : GET /api/inventory (Catalogue avec filtres catégorie, état, recherche)
  // --------------------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------------------
  // ROUTE 3 : POST /api/inventory (Ajout d'un nouvel appareil par Théodore)
  // --------------------------------------------------------------------------------------
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
        brand: (payload.brand || 'Atelier').trim(),
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
        uncleNote: payload.uncleNote || 'Testé sur banc d\'essai en atelier par Infinity Machinery.',
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

  // --------------------------------------------------------------------------------------
  // ROUTE 4 : PUT /api/inventory/:id (Modification complète d'un produit)
  // --------------------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------------------
  // ROUTE 5 : PATCH /api/inventory/:id/stock (Ajustement rapide de stock en 1 clic : +1 / -1)
  // --------------------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------------------
  // ROUTE 6 : DELETE /api/inventory/:id (Suppression d'un article)
  // --------------------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------------------
  // ROUTE 7 : POST /api/inventory/reset (Restauration du catalogue initial de démonstration)
  // --------------------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/inventory/reset') {
    if (fs.existsSync(originalInventoryPath)) {
      fs.copyFileSync(originalInventoryPath, path.join(DATA_DIR, 'inventory.json'));
      const restored = readJson('inventory.json', []);
      return sendJson(res, 200, { message: 'Inventaire restauré', count: restored.length });
    }
    return sendJson(res, 400, { error: 'Sauvegarde initiale introuvable' });
  }

  // --------------------------------------------------------------------------------------
  // ROUTE 8 : GET /api/orders (Liste chronologique des commandes clients)
  // --------------------------------------------------------------------------------------
  if (method === 'GET' && pathname === '/api/orders') {
    const orders = readJson('orders.json', []);
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sendJson(res, 200, orders);
  }

  // --------------------------------------------------------------------------------------
  // ROUTE 9 : POST /api/orders (Création de commande et DÉCRÉMENTATION AUTOMATIQUE DU STOCK)
  // --------------------------------------------------------------------------------------
  if (method === 'POST' && pathname === '/api/orders') {
    try {
      const payload = await parseBody(req);
      const inventory = readJson('inventory.json', []);
      const orders = readJson('orders.json', []);

      if (!payload.customer || !payload.items || !payload.items.length) {
        return sendJson(res, 400, { error: 'Données de commande incomplètes.' });
      }

      // Vérification stricte des stocks disponibles pour chaque article commandé
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

      // Décrémentation physique du stock dans l'inventaire
      for (const orderItem of payload.items) {
        const product = inventory.find(p => p.id === orderItem.id);
        product.stock -= orderItem.quantity;
      }
      writeJson('inventory.json', inventory);

      // Génération du numéro de commande unique
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

  // --------------------------------------------------------------------------------------
  // ROUTE 10 : PATCH /api/orders/:id/status (Changement de statut & RESTAURATION STOCK SI ANNULATION)
  // --------------------------------------------------------------------------------------
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

      // Si la commande est annulée, on recrédite automatiquement le stock des articles !
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

  // --------------------------------------------------------------------------------------
  // ROUTE 11 : GET & POST /api/repairs (Demandes de diagnostic de pannes d'atelier)
  // --------------------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------------------
  // ROUTE 12 : GET & PUT /api/settings (Paramètres boutique & autobiographie de Théodore)
  // --------------------------------------------------------------------------------------
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

  // --------------------------------------------------------------------------------------
  // ROUTE 13 : DISTRIBUTION DES FICHIERS STATIQUES FRONTEND
  // --------------------------------------------------------------------------------------
  if (method === 'GET') {
    return serveStatic(req, res, pathname);
  }

  // 404 pour toute autre route API inconnue
  return sendJson(res, 404, { error: 'Route introuvable' });
});

/**
 * ========================================================================================
 * SECTION 6 : DÉMARRAGE DU SERVEUR
 * ========================================================================================
 */
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  INFINITY MACHINERY`);
  console.log(`  Électroménager Durable & Gestion d'Inventaire`);
  console.log(`  Serveur actif sur : http://localhost:${PORT}`);
  console.log(`  Prêt pour la vitrine, les commandes et l'inventaire.`);
  console.log(`====================================================`);
});
