/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — BOUTIQUE ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : public/js/orders-admin.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Module de gestion des commandes clients et des demandes de réparation en atelier.
 * - Charge et liste les commandes passées sur le site avec coordonnées client complètes,
 *   adresse de livraison, étage, consignes particulières et détail des articles.
 * - Permet à Théodore de mettre à jour le statut d'une commande en direct :
 *   * En attente -> Confirmée -> En préparation -> Prête (retrait/livraison) -> Livrée
 *   * Si Théodore sélectionne 'Annulée', le serveur REST recrédite AUTOMATIQUEMENT
 *     les quantités en stock pour chaque article de la commande !
 * - Génère et ouvre un bon de préparation imprimable avec en-tête d'atelier et zone de signature.
 * - Présente les demandes de dépannage / réparation déposées par les clients du site.
 * 
 * COMMENT CE FICHIER EST INTERCONNECTÉ AVEC LE RESTE DU PROJET :
 * ----------------------------------------------------------------------------------------
 * - Dépend de `public/js/data-store.js` :
 *   * DataStore.getOrders() pour récupérer l'historique des commandes.
 *   * DataStore.updateOrderStatus(orderId, newStatus) pour changer le statut.
 *   * DataStore.getRepairs() pour afficher les tickets de dépannage.
 * - Dépend de `public/js/inventory-admin.js` :
 *   * Déclenche InventoryAdmin.loadInventory() en cas d'annulation de commande
 *     pour que l'inventaire et les statistiques réaffichent immédiatement les stocks restitués.
 * - Dépend de `public/js/app.js` :
 *   * App.showToast() pour les alertes de succès ou d'erreur.
 * - Manipule le DOM de `index.html` :
 *   * #admin-orders-list (liste des cartes commandes)
 *   * #admin-orders-badge (compteur d'onglets)
 *   * #admin-repairs-list (liste des diagnostics)
 * ========================================================================================
 */

const OrdersAdmin = {
  // Liste des commandes chargées depuis /api/orders
  orders: [],
  // Liste des tickets de réparation chargés depuis /api/repairs
  repairs: [],

  /**
   * ======================================================================================
   * SECTION 1 : INITIALISATION ET CHARGEMENT DES DONNÉES
   * ======================================================================================
   */
  async init() {
    await this.loadOrders();
    await this.loadRepairs();
  },

  /**
   * Charge la liste des commandes clients via DataStore.
   */
  async loadOrders() {
    try {
      this.orders = await DataStore.getOrders();
      this.renderOrders();
    } catch (e) {
      console.error('[ERREUR COMMANDES]:', e);
    }
  },

  /**
   * Charge les tickets de réparation d'atelier via DataStore.
   */
  async loadRepairs() {
    try {
      this.repairs = await DataStore.getRepairs();
      this.renderRepairs();
    } catch (e) {
      console.error('[ERREUR RÉPARATIONS]:', e);
    }
  },

  /**
   * ======================================================================================
   * SECTION 2 : RENDU VISUEL DES COMMANDES CLIENTS
   * ======================================================================================
   */
  renderOrders() {
    const listEl = document.getElementById('admin-orders-list');
    const badgeEl = document.getElementById('admin-orders-badge');
    if (!listEl) return;

    if (badgeEl) {
      badgeEl.textContent = `${this.orders.length} commande(s)`;
    }

    if (this.orders.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 text-center text-gray-500 bg-white rounded-xl border border-[#E5DEC9]">
          <p class="font-medium">Aucune commande enregistrée pour le moment.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.orders.map(order => {
      const dateFormatted = new Date(order.createdAt).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      // Couleurs distinctives selon l'avancement de la commande
      const STATUS_COLORS = {
        'pending': 'bg-amber-100 text-amber-800 border-amber-300',
        'confirmed': 'bg-blue-100 text-blue-800 border-blue-300',
        'processing': 'bg-indigo-100 text-indigo-800 border-indigo-300',
        'ready': 'bg-purple-100 text-purple-800 border-purple-300',
        'delivered': 'bg-emerald-100 text-emerald-800 border-emerald-300',
        'cancelled': 'bg-red-100 text-red-800 border-red-300'
      };

      const statusBadge = `<span class="inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-800'}">${order.statusLabel}</span>`;

      return `
        <div class="bg-white border border-[#E5DEC9] rounded-xl p-5 mb-4 shadow-sm hover:border-[#C25E34] transition">
          <div class="flex flex-wrap justify-between items-start gap-4 pb-4 border-b border-gray-100">
            <div>
              <div class="flex items-center gap-3">
                <span class="font-mono font-bold text-base text-gray-900">${order.id}</span>
                ${statusBadge}
              </div>
              <p class="text-xs text-gray-500 mt-1">Passée le ${dateFormatted} • Client : <strong class="text-gray-800">${order.customer.firstName} ${order.customer.lastName}</strong></p>
            </div>
            <div class="text-right">
              <span class="text-lg font-bold text-gray-900">${order.total.toLocaleString('fr-FR')} €</span>
              <p class="text-xs text-gray-500">${order.deliveryLabel}</p>
            </div>
          </div>

          <!-- Coordonnées client & Articles commandés -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 py-3 text-xs">
            <div>
              <h5 class="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1">Coordonnées client</h5>
              <p class="text-gray-800 font-medium">${order.customer.phone || 'Non précisé'} • ${order.customer.email}</p>
              <p class="text-gray-600 mt-1">${order.customer.address || 'Retrait direct en atelier'}</p>
              ${order.customer.instructions ? `<p class="text-amber-800 italic mt-1 bg-amber-50 p-2 rounded border border-amber-200">Note client : ${order.customer.instructions}</p>` : ''}
            </div>
            <div>
              <h5 class="font-bold text-gray-700 uppercase tracking-wide text-[10px] mb-1">Articles commandés</h5>
              <div class="space-y-1">
                ${order.items.map(item => `
                  <div class="flex justify-between text-gray-800">
                    <span>${item.quantity}x ${item.title} <span class="font-mono text-gray-400">(${item.sku})</span></span>
                    <span class="font-semibold">${(item.price * item.quantity).toLocaleString('fr-FR')} €</span>
                  </div>
                `).join('')}
              </div>
              <div class="mt-2 pt-2 border-t border-gray-100 flex justify-between text-gray-500">
                <span>Règlement : ${order.paymentLabel}</span>
                <span>Frais port : ${order.deliveryFee === 0 ? 'Gratuit' : `${order.deliveryFee} €`}</span>
              </div>
            </div>
          </div>

          <!-- Actions de commande : Changement de statut & Impression du bon -->
          <div class="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-gray-600">Statut :</span>
              <select onchange="OrdersAdmin.updateStatus('${order.id}', this.value)" class="text-xs font-semibold bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 text-gray-800 focus:ring-1 focus:ring-amber-500">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>En attente</option>
                <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmée</option>
                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>En préparation</option>
                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Prête pour retrait / livraison</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Livrée / Terminée</option>
                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Annulée (recrédite le stock)</option>
              </select>
            </div>
            <button onclick="OrdersAdmin.printReceipt('${order.id}')" class="btn btn-secondary btn-sm text-xs">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Imprimer Bon de Préparation
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * ======================================================================================
   * SECTION 3 : GESTION DES TICKETS DE RÉPARATION D'ATELIER
   * ======================================================================================
   */
  renderRepairs() {
    const listEl = document.getElementById('admin-repairs-list');
    if (!listEl) return;

    if (this.repairs.length === 0) {
      listEl.innerHTML = `<p class="p-6 text-center text-gray-500 bg-white rounded-xl border border-[#E5DEC9]">Aucun ticket de dépannage en cours.</p>`;
      return;
    }

    listEl.innerHTML = this.repairs.map(rep => `
      <div class="bg-white border border-[#E5DEC9] rounded-xl p-5 mb-4 shadow-sm">
        <div class="flex justify-between items-start">
          <div>
            <span class="font-mono font-bold text-sm text-gray-900">${rep.id}</span>
            <h4 class="font-bold text-gray-900 mt-1">${rep.appliance.type} ${rep.appliance.brand} — Modèle : ${rep.appliance.model}</h4>
            <p class="text-xs text-gray-500">Déposé par : ${rep.customer.name} (${rep.customer.phone} • ${rep.customer.email})</p>
          </div>
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full ${rep.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${rep.statusLabel}
          </span>
        </div>
        <div class="mt-3 bg-gray-50 p-3 rounded-lg text-xs">
          <p class="text-gray-800"><strong>Panne signalée :</strong> ${rep.issue}</p>
          <p class="text-amber-900 mt-1"><strong>Diagnostic d'atelier :</strong> ${rep.diagnosis}</p>
        </div>
      </div>
    `).join('');
  },

  /**
   * ======================================================================================
   * SECTION 4 : MODIFICATION DU STATUT DE COMMANDE
   * ======================================================================================
   */
  async updateStatus(orderId, newStatus) {
    try {
      const updated = await DataStore.updateOrderStatus(orderId, newStatus);
      App.showToast(`Statut de ${orderId} mis à jour : ${updated.statusLabel}`);
      await this.loadOrders();
      
      // Si la commande est annulée, le serveur a recrédité le stock des articles,
      // on recharge donc immédiatement le tableau d'inventaire et les statistiques !
      if (typeof InventoryAdmin !== 'undefined' && InventoryAdmin.loadInventory) {
        InventoryAdmin.loadInventory();
      }
    } catch (e) {
      App.showToast(e.message, 'error');
    }
  },

  /**
   * ======================================================================================
   * SECTION 5 : IMPRESSION DU BON DE PRÉPARATION & LIVRAISON
   * ======================================================================================
   */
  printReceipt(orderId) {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return;

    const printWin = window.open('', '', 'width=800,height=600');
    printWin.document.write(`
      <html>
        <head>
          <title>Bon de Commande ${order.id} — Infinity Machinery</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1c1917; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .header { border-bottom: 2px solid #1c1917; padding-bottom: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { padding: 10px; border-bottom: 1px solid #ddd; text-align: left; font-size: 14px; }
            th { background-color: #f7f7f7; font-weight: bold; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INFINITY MACHINERY — ÉLECTROMÉNAGER & ATELIER</h1>
            <p>Infinity Machinery • 42 Rue des Artisans • Tél : 01 43 55 28 90</p>
          </div>
          <h2>BON DE PRÉPARATION & LIVRAISON</h2>
          <p><strong>N° Commande :</strong> ${order.id}</p>
          <p><strong>Date :</strong> ${new Date(order.createdAt).toLocaleString('fr-FR')}</p>
          <p><strong>Client :</strong> ${order.customer.firstName} ${order.customer.lastName} (Tél : ${order.customer.phone})</p>
          <p><strong>Mode :</strong> ${order.deliveryLabel}</p>
          <p><strong>Adresse :</strong> ${order.customer.address || 'Retrait direct en magasin'}</p>
          ${order.customer.instructions ? `<p><strong>Instructions :</strong> ${order.customer.instructions}</p>` : ''}
          
          <table>
            <thead>
              <tr>
                <th>Réf (SKU)</th>
                <th>Désignation</th>
                <th>Quantité</th>
                <th>Prix Unitaire</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td>${item.sku}</td>
                  <td>${item.title}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price.toLocaleString('fr-FR')} €</td>
                  <td>${(item.price * item.quantity).toLocaleString('fr-FR')} €</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <p class="total">Total TTC : ${order.total.toLocaleString('fr-FR')} €</p>
          <p><em>Règlement : ${order.paymentLabel}</em></p>
          <hr style="margin-top: 40px; border: none; border-top: 1px dashed #aaa;">
          <p style="text-align: center; font-size: 12px; color: #666;">Signature Client / Tampon Infinity Machinery</p>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    printWin.print();
  }
};
