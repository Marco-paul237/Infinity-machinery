/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — BOUTIQUE ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : public/js/data-store.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Couche API client (Service Data Layer).
 * Centralise l'ensemble des requêtes HTTP asynchrones (fetch) vers le serveur `server.js` :
 * - Lecture et filtrage de l'inventaire
 * - Ajout, mise à jour, suppression et ajustement direct de stock (+ / -)
 * - Création et suivi des commandes clients
 * - Récupération des statistiques KPIs pour le tableau de bord de Théodore
 * - Exportation directe des données d'inventaire au format CSV (tableur Excel / Numbers)
 * 
 * COMMENT CE FICHIER EST INTERCONNECTÉ AVEC LE RESTE DU PROJET :
 * ----------------------------------------------------------------------------------------
 * - Appelé par `public/js/app.js` :
 *   * DataStore.getInventory() pour afficher le catalogue public et la sélection vedette.
 *   * DataStore.createRepair() pour transmettre les demandes de diagnostic en atelier.
 * - Appelé par `public/js/cart.js` :
 *   * DataStore.createOrder() lors de la validation du panier (décrémente le stock en direct).
 * - Appelé par `public/js/inventory-admin.js` :
 *   * DataStore.getStats() pour afficher les 5 KPI cards.
 *   * DataStore.adjustStock(id, delta) lors d'un clic sur + ou -.
 *   * DataStore.addProduct() et DataStore.updateProduct() dans la modale d'édition.
 *   * DataStore.deleteProduct() pour retirer un appareil du stock.
 *   * DataStore.exportToCsv() pour télécharger l'inventaire en fichier CSV.
 * - Appelé par `public/js/orders-admin.js` :
 *   * DataStore.getOrders() et DataStore.updateOrderStatus() pour piloter le cycle de commande.
 * ========================================================================================
 */

const DataStore = {
  
  /**
   * ======================================================================================
   * SECTION 1 : GESTION DE L'INVENTAIRE ET DU CATALOGUE (PRODUITS)
   * ======================================================================================
   */

  /**
   * Récupère la liste des produits avec filtres optionnels (catégorie, état, recherche, stock).
   * @param {Object} filters - Ex: { category: 'gros-electro', inStock: true, search: 'miele' }
   * @returns {Promise<Array>} Liste des articles d'électroménager
   */
  async getInventory(filters = {}) {
    const params = new URLSearchParams();
    if (filters.category && filters.category !== 'all') params.append('category', filters.category);
    if (filters.condition && filters.condition !== 'all') params.append('condition', filters.condition);
    if (filters.search) params.append('search', filters.search);
    if (filters.inStock) params.append('inStock', 'true');

    const res = await fetch(`/api/inventory?${params.toString()}`);
    if (!res.ok) throw new Error('Impossible de charger l\'inventaire depuis le serveur');
    return await res.json();
  },

  /**
   * Ajoute un nouvel appareil au catalogue et à l'inventaire de Théodore.
   * @param {Object} productData - Données complètes de l'appareil (SKU, titre, prix, stock...)
   */
  async addProduct(productData) {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'ajout du produit');
    return data;
  },

  /**
   * Met à jour les caractéristiques techniques ou les prix d'un produit existant.
   * @param {string} id - Identifiant unique de l'appareil (ex: 'prod-001')
   * @param {Object} productData - Champs modifiés
   */
  async updateProduct(id, productData) {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la mise à jour de l\'article');
    return data;
  },

  /**
   * Ajuste instantanément le stock physique (+1 unité, -1 unité, ou valeur absolue).
   * Utilisé lors des ventes directes au comptoir.
   * @param {string} id - Identifiant du produit
   * @param {number} delta - Variation (+1 ou -1)
   */
  async adjustStock(id, delta) {
    const res = await fetch(`/api/inventory/${id}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la modification du stock');
    return data;
  },

  /**
   * Supprime définitivement un produit de l'inventaire.
   * @param {string} id - Identifiant du produit à supprimer
   */
  async deleteProduct(id) {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression de l\'article');
    return data;
  },

  /**
   * Réinitialise le catalogue vers la sauvegarde de démonstration initiale.
   */
  async resetInventory() {
    const res = await fetch('/api/inventory/reset', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la réinitialisation');
    return data;
  },

  /**
   * ======================================================================================
   * SECTION 2 : GESTION DES COMMANDES CLIENTS (ORDERS)
   * ======================================================================================
   */

  /**
   * Récupère toutes les commandes clients passées sur le site.
   */
  async getOrders() {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error('Impossible de charger les commandes');
    return await res.json();
  },

  /**
   * Valide une nouvelle commande. Le serveur décrémente automatiquement les stocks !
   * @param {Object} orderData - Coordonnées du client, liste des articles, mode de livraison
   */
  async createOrder(orderData) {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la validation de commande');
    return data;
  },

  /**
   * Modifie le statut d'une commande (pending, confirmed, processing, ready, delivered, cancelled).
   * Note : si le statut passe à 'cancelled', le serveur recrédite automatiquement le stock !
   */
  async updateOrderStatus(id, status, notes = '') {
    const res = await fetch(`/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de statut');
    return data;
  },

  /**
   * ======================================================================================
   * SECTION 3 : DEMANDES DE RÉPARATION & DIAGNOSTIC D'ATELIER
   * ======================================================================================
   */

  /**
   * Récupère la liste des tickets de dépannage déposés par les clients.
   */
  async getRepairs() {
    const res = await fetch('/api/repairs');
    if (!res.ok) throw new Error('Impossible de charger les tickets de réparation');
    return await res.json();
  },

  /**
   * Enregistre une nouvelle demande de diagnostic depuis le formulaire en ligne.
   * @param {Object} repairData - Appareil, marque, description de la panne et coordonnées client
   */
  async createRepair(repairData) {
    const res = await fetch('/api/repairs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repairData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors du dépôt de la demande');
    return data;
  },

  /**
   * ======================================================================================
   * SECTION 4 : STATISTIQUES GLOBALES & PARAMÈTRES
   * ======================================================================================
   */

  /**
   * Charge les statistiques agrégées (KPIs) pour le tableau de bord de Théodore.
   */
  async getStats() {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Impossible de charger les statistiques du tableau de bord');
    return await res.json();
  },

  /**
   * Charge les informations générales du magasin et l'autobiographie de Théodore.
   */
  async getSettings() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Impossible de charger les paramètres');
    return await res.json();
  },

  /**
   * ======================================================================================
   * SECTION 5 : EXPORTATION DE L'INVENTAIRE AU FORMAT TABLEUR CSV
   * ======================================================================================
   * Génère un fichier CSV encodé en UTF-8 avec BOM (compatible Excel & Numbers sans accent cassé).
   * @param {Array} items - Liste des articles à exporter
   */
  exportToCsv(items) {
    if (!items || !items.length) return;
    const headers = [
      'SKU', 'Titre', 'Marque', 'Catégorie', 'État', 
      'Prix Vente (€)', 'Prix Coût Achat (€)', 'Stock Physique', 
      'Seuil Alerte Réassort', 'Classe Énergie', 'Indice Réparabilité'
    ];
    
    const rows = items.map(item => [
      `"${item.sku}"`,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${item.brand || ''}"`,
      `"${item.category || ''}"`,
      `"${item.condition || ''}"`,
      item.price,
      item.costPrice || '',
      item.stock,
      item.minStockAlert,
      `"${item.energyClass || ''}"`,
      item.repairabilityIndex || ''
    ]);

    // Inclusion du BOM UTF-8 (\uFEFF) pour assurer l'ouverture parfaite sous Microsoft Excel
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventaire-infinity-machinery-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
