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

const DATA_DIR = path.join(__dirname, '..', 'data');
const TMP_DIR = '/tmp';

// Cache en mémoire pour garantir la réactivité et la compatibilité serverless
const memoryStore = {};

/**
 * Helper de lecture résistant à l'environnement serverless Vercel.
 */
function readJson(filename, defaultValue = []) {
  const tmpPath = path.join(TMP_DIR, filename);
  const dataPath = path.join(DATA_DIR, filename);

  // 1. Si déjà présent dans le cache mémoire
  if (memoryStore[filename]) {
    return memoryStore[filename];
  }

  // 2. Si déjà écrit dans /tmp
  try {
    if (fs.existsSync(tmpPath)) {
      const content = fs.readFileSync(tmpPath, 'utf-8');
      memoryStore[filename] = JSON.parse(content);
      return memoryStore[filename];
    }
  } catch (e) {
    // Ignorer et passer au fichier par défaut
  }

  // 3. Lire depuis /data/
  try {
    if (fs.existsSync(dataPath)) {
      const content = fs.readFileSync(dataPath, 'utf-8');
      memoryStore[filename] = JSON.parse(content);
      return memoryStore[filename];
    }
  } catch (e) {
    console.error(`Erreur lecture ${filename}:`, e);
  }

  memoryStore[filename] = defaultValue;
  return defaultValue;
}

/**
 * Helper d'écriture résistant à l'environnement serverless Vercel.
 */
function writeJson(filename, data) {
  memoryStore[filename] = data;

  // Tentative d'écriture dans /data (pour dev local)
  try {
    const dataPath = path.join(DATA_DIR, filename);
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // Si en lecture seule (Vercel Serverless), écrire dans /tmp
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

  // 7. POST /api/inventory/reset (Reset démo)
  if (method === 'POST' && pathname === '/api/inventory/reset') {
    const backupPath = path.join(DATA_DIR, 'inventory.backup.json');
    if (fs.existsSync(backupPath)) {
      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
      writeJson('inventory.json', backupData);
      return sendJson(res, 200, { message: 'Inventaire restauré', count: backupData.length });
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
