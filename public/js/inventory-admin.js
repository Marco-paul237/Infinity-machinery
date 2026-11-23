/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — BOUTIQUE ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : public/js/inventory-admin.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Module de gestion d'inventaire et tableau de bord Back-Office réservé à Théodore.
 * - Calcule et affiche les 5 indicateurs clés (KPIs) : Total références, unités en stock,
 *   valeur marchande totale (€), alertes de réapprovisionnement, commandes actives.
 * - Présente le tableau interactif d'inventaire avec filtrage en temps réel
 *   (Tous, Alertes Réassort <= 2, Ruptures) et recherche textuelle (SKU, marque, titre).
 * - Offre un bouton d'ajustement direct en 1 clic (+ / -) pour incrémenter ou décrémenter
 *   le stock physique d'une référence lors d'une vente directe au comptoir.
 * - Gère l'ajout d'appareils neufs ou reconditionnés et la modification complète des fiches.
 * - Permet la suppression sécurisée d'un article et l'exportation CSV du stock pour tableur.
 * 
 * COMMENT CE FICHIER EST INTERCONNECTÉ AVEC LE RESTE DU PROJET :
 * ----------------------------------------------------------------------------------------
 * - Dépend de `public/js/data-store.js` :
 *   * DataStore.getStats() pour mettre à jour les cartes KPI.
 *   * DataStore.getInventory() pour charger la liste des appareils.
 *   * DataStore.adjustStock(id, delta) lors d'un clic sur + ou -.
 *   * DataStore.addProduct() et DataStore.updateProduct() pour enregistrer les fiches.
 *   * DataStore.deleteProduct() pour retirer un appareil du catalogue.
 *   * DataStore.exportToCsv() pour déclencher le téléchargement du fichier CSV.
 * - Dépend de `public/js/app.js` :
 *   * App.showToast() pour les alertes de succès ou d'erreur.
 *   * App.loadCatalog() pour rafraîchir la boutique publique après chaque modification.
 * - Manipule le DOM de `index.html` :
 *   * #stat-total-refs, #stat-total-stock, #stat-total-val, #stat-low-stock, #stat-active-orders
 *   * #inventory-table-body (lignes du tableau)
 *   * #product-edit-modal (formulaire d'ajout/édition)
 * ========================================================================================
 */

const InventoryAdmin = {
  // Liste complète des articles chargés depuis le serveur
  items: [],
  // Liste filtrée selon les critères de recherche et d'état du stock
  filteredItems: [],
  // Filtre de stock actif ('all' = tous, 'low' = alertes réassort, 'out' = ruptures)
  currentFilter: 'all',
  // Requête de recherche textuelle saisie par Théodore
  searchQuery: '',

  /**
   * ======================================================================================
   * SECTION 1 : INITIALISATION ET CHARGEMENT DU TABLEAU DE BORD
   * ======================================================================================
   */
  async init() {
    await this.loadStats();
    await this.loadInventory();
    this.bindEvents();
  },

  /**
   * Charge les statistiques agrégées via /api/stats et met à jour les 5 cartes de KPI.
   */
  async loadStats() {
    try {
      const stats = await DataStore.getStats();
      document.getElementById('stat-total-refs').textContent = stats.totalReferences;
      document.getElementById('stat-total-stock').textContent = `${stats.totalStock} unités`;
      document.getElementById('stat-total-val').textContent = `${stats.totalInventoryValue.toLocaleString('fr-FR')} €`;
      
      const lowStockEl = document.getElementById('stat-low-stock');
      lowStockEl.textContent = stats.lowStockCount;
      if (stats.lowStockCount > 0) {
        lowStockEl.classList.add('text-amber-600');
      } else {
        lowStockEl.classList.remove('text-amber-600');
      }

      document.getElementById('stat-active-orders').textContent = stats.activeOrdersCount;
    } catch (e) {
      console.error('[ERREUR STATS]:', e);
    }
  },

  /**
   * Charge l'inventaire depuis le serveur, applique les filtres et actualise les statistiques.
   */
  async loadInventory() {
    try {
      this.items = await DataStore.getInventory();
      this.applyFilters();
      await this.loadStats();
    } catch (e) {
      App.showToast('Erreur de chargement de l\'inventaire', 'error');
    }
  },

  /**
   * ======================================================================================
   * SECTION 2 : FILTRAGE ET RECHERCHE EN TEMPS RÉEL
   * ======================================================================================
   */
  applyFilters() {
    let list = [...this.items];

    // Filtrage selon le niveau de stock physique
    if (this.currentFilter === 'low') {
      list = list.filter(i => i.stock <= i.minStockAlert && i.stock > 0);
    } else if (this.currentFilter === 'out') {
      list = list.filter(i => i.stock === 0);
    }

    // Filtrage par texte (SKU, titre, marque ou catégorie)
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(i => 
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.sku && i.sku.toLowerCase().includes(q)) ||
        (i.brand && i.brand.toLowerCase().includes(q)) ||
        (i.category && i.category.toLowerCase().includes(q))
      );
    }

    this.filteredItems = list;
    this.renderTable();
  },

  /**
   * ======================================================================================
   * SECTION 3 : RENDU DU TABLEAU D'INVENTAIRE AVEC AJUSTEUR DIRECT (+ / -)
   * ======================================================================================
   */
  renderTable() {
    const tbody = document.getElementById('inventory-table-body');
    const emptyState = document.getElementById('inventory-empty-state');
    const countBadge = document.getElementById('inventory-count-badge');

    if (!tbody) return;

    if (countBadge) {
      countBadge.textContent = `${this.filteredItems.length} article(s) trouvé(s)`;
    }

    if (this.filteredItems.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = this.filteredItems.map(item => {
      // Badge de statut de stock coloré
      let stockBadge = '';
      if (item.stock === 0) {
        stockBadge = '<span class="badge badge-stock-out">Rupture (0)</span>';
      } else if (item.stock <= item.minStockAlert) {
        stockBadge = `<span class="badge badge-stock-low">Alerte Réassort (${item.stock})</span>`;
      } else {
        stockBadge = `<span class="badge badge-stock-in">En stock (${item.stock})</span>`;
      }

      // Classe énergétique européenne officielle
      const energyClass = item.energyClass || 'A';
      const energyBadgeClass = energyClass.includes('+') ? 'energy-tag-A-plus' : `energy-tag-${energyClass}`;

      return `
        <tr class="transition-colors hover:bg-amber-50/40">
          <td class="font-mono text-xs font-bold text-gray-800">
            ${item.sku}
          </td>
          <td>
            <div class="flex items-center gap-3">
              <img src="${item.image}" alt="" class="w-10 h-10 object-cover rounded-md border border-gray-200 bg-gray-100 flex-shrink-0">
              <div class="min-w-0">
                <div class="font-semibold text-gray-900 text-sm truncate max-w-xs" title="${item.title}">${item.title}</div>
                <div class="text-xs text-gray-500">${item.brand} • <span class="text-amber-800 font-medium">${item.condition}</span></div>
              </div>
            </div>
          </td>
          <td>
            <span class="text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">${item.subCategory || item.category}</span>
          </td>
          <td>
            <div class="flex items-center gap-2">
              <span class="energy-tag ${energyBadgeClass}">${energyClass}</span>
              ${item.repairabilityIndex ? `
                <span class="text-xs font-mono font-semibold bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded border border-gray-200" title="Indice de réparabilité">
                  ${item.repairabilityIndex}/10
                </span>
              ` : ''}
            </div>
          </td>
          <td class="text-right">
            <span class="font-bold text-gray-900">${item.price.toLocaleString('fr-FR')} €</span>
            ${item.costPrice ? `<div class="text-xs text-gray-500">Coût : ${item.costPrice} €</div>` : ''}
          </td>
          <td>
            <div class="flex items-center gap-2">
              <!-- Boutons d'ajustement direct en 1 clic : +1 ou -1 -->
              <div class="inline-flex items-center border border-gray-300 rounded-lg bg-white shadow-sm overflow-hidden">
                <button onclick="InventoryAdmin.adjustStock('${item.id}', -1)" class="px-2.5 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-black transition" title="Diminuer stock d'une unité">-</button>
                <span class="px-3 py-1 text-xs font-bold text-gray-900 bg-gray-50 min-w-[32px] text-center">${item.stock}</span>
                <button onclick="InventoryAdmin.adjustStock('${item.id}', 1)" class="px-2.5 py-1 text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-black transition" title="Augmenter stock d'une unité">+</button>
              </div>
              <div>${stockBadge}</div>
            </div>
          </td>
          <td class="text-right">
            <div class="inline-flex items-center gap-1">
              <button onclick="InventoryAdmin.openEditModal('${item.id}')" class="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition" title="Modifier la fiche produit">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              </button>
              <button onclick="InventoryAdmin.confirmDelete('${item.id}')" class="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition" title="Supprimer définitivement">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * ======================================================================================
   * SECTION 4 : MODIFICATION RAPIDE DE STOCK (AU COMPTOIR)
   * ======================================================================================
   */
  async adjustStock(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    if (item.stock + delta < 0) {
      App.showToast('Le stock physique ne peut pas être négatif.', 'warning');
      return;
    }

    try {
      const res = await DataStore.adjustStock(id, delta);
      item.stock = res.stock;
      this.applyFilters();
      await this.loadStats();
      App.showToast(`Stock de "${item.title}" mis à jour (${item.stock} unités).`);

      // Actualisation synchronisée de la boutique publique
      if (typeof App !== 'undefined' && App.loadCatalog) {
        App.loadCatalog();
      }
    } catch (e) {
      App.showToast(e.message, 'error');
    }
  },

  /**
   * ======================================================================================
   * SECTION 5 : MODALE D'AJOUT ET MODIFICATION DE PRODUIT (FORMULAIRE CRUD)
   * ======================================================================================
   */
  openAddModal() {
    const modal = document.getElementById('product-edit-modal');
    const form = document.getElementById('product-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('product-modal-title').textContent = 'Ajouter un appareil au catalogue';
    document.getElementById('prod-form-id').value = '';
    document.getElementById('prod-form-sku').value = `ART-${Math.floor(1000 + Math.random() * 9000)}`;
    document.getElementById('prod-form-stock').value = 3;
    document.getElementById('prod-form-min-alert').value = 2;
    document.getElementById('prod-form-repairability').value = 8.5;
    document.getElementById('prod-form-warranty').value = 2;

    modal.style.display = 'flex';
  },

  openEditModal(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('product-edit-modal');
    const form = document.getElementById('product-form');
    if (!modal || !form) return;

    document.getElementById('product-modal-title').textContent = `Modifier : ${item.title}`;
    document.getElementById('prod-form-id').value = item.id;
    document.getElementById('prod-form-sku').value = item.sku;
    document.getElementById('prod-form-title').value = item.title;
    document.getElementById('prod-form-brand').value = item.brand;
    document.getElementById('prod-form-category').value = item.category;
    document.getElementById('prod-form-subcategory').value = item.subCategory || '';
    document.getElementById('prod-form-condition').value = item.condition;
    document.getElementById('prod-form-price').value = item.price;
    document.getElementById('prod-form-cost').value = item.costPrice || '';
    document.getElementById('prod-form-stock').value = item.stock;
    document.getElementById('prod-form-min-alert').value = item.minStockAlert || 2;
    document.getElementById('prod-form-energy').value = item.energyClass || 'A';
    document.getElementById('prod-form-repairability').value = item.repairabilityIndex || 8.5;
    document.getElementById('prod-form-warranty').value = item.warrantyYears || 2;
    document.getElementById('prod-form-image').value = item.image || '';
    document.getElementById('prod-form-desc').value = item.description || item.shortDescription || '';
    document.getElementById('prod-form-unclenote').value = item.uncleNote || '';

    modal.style.display = 'flex';
  },

  closeModal() {
    const modal = document.getElementById('product-edit-modal');
    if (modal) modal.style.display = 'none';
  },

  /**
   * Traite l'enregistrement du formulaire de produit (création ou mise à jour).
   */
  async handleProductFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('prod-form-id').value;

    const payload = {
      sku: document.getElementById('prod-form-sku').value.trim().toUpperCase(),
      title: document.getElementById('prod-form-title').value.trim(),
      brand: document.getElementById('prod-form-brand').value.trim(),
      category: document.getElementById('prod-form-category').value,
      subCategory: document.getElementById('prod-form-subcategory').value.trim() || 'Appareil',
      condition: document.getElementById('prod-form-condition').value,
      conditionLabel: document.getElementById('prod-form-condition').value === 'Reconditionné Atelier' 
        ? 'Reconditionné Certifié Atelier — Grade A' 
        : 'Neuf d\'usine (Garanti 2 ans)',
      price: parseFloat(document.getElementById('prod-form-price').value) || 0,
      costPrice: parseFloat(document.getElementById('prod-form-cost').value) || 0,
      stock: parseInt(document.getElementById('prod-form-stock').value, 10) || 0,
      minStockAlert: parseInt(document.getElementById('prod-form-min-alert').value, 10) || 2,
      energyClass: document.getElementById('prod-form-energy').value,
      repairabilityIndex: parseFloat(document.getElementById('prod-form-repairability').value) || 8.5,
      warrantyYears: parseInt(document.getElementById('prod-form-warranty').value, 10) || 2,
      image: document.getElementById('prod-form-image').value.trim() || 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=800&q=80',
      shortDescription: document.getElementById('prod-form-desc').value.trim(),
      description: document.getElementById('prod-form-desc').value.trim(),
      uncleNote: document.getElementById('prod-form-unclenote').value.trim() || 'Vérifié et garanti par Infinity Machinery.'
    };

    try {
      if (id) {
        await DataStore.updateProduct(id, payload);
        App.showToast(`Appareil "${payload.title}" mis à jour.`);
      } else {
        await DataStore.addProduct(payload);
        App.showToast(`Nouvel appareil "${payload.title}" ajouté au stock.`);
      }
      this.closeModal();
      await this.loadInventory();
      if (typeof App !== 'undefined' && App.loadCatalog) App.loadCatalog();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  /**
   * ======================================================================================
   * SECTION 6 : SUPPRESSION, EXPORT CSV ET RÉINITIALISATION DÉMO
   * ======================================================================================
   */
  async confirmDelete(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'article "${item.title}" (${item.sku}) de l'inventaire ?`)) {
      try {
        await DataStore.deleteProduct(id);
        App.showToast(`Article "${item.title}" retiré du catalogue.`);
        await this.loadInventory();
        if (typeof App !== 'undefined' && App.loadCatalog) App.loadCatalog();
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    }
  },

  async handleResetCatalog() {
    if (confirm('Attention : réinitialiser l\'inventaire rechargera les articles et stocks d\'origine de démonstration. Continuer ?')) {
      try {
        await DataStore.resetInventory();
        App.showToast('Inventaire initial restauré avec succès.');
        await this.loadInventory();
        if (typeof App !== 'undefined' && App.loadCatalog) App.loadCatalog();
      } catch (err) {
        App.showToast(err.message, 'error');
      }
    }
  },

  bindEvents() {
    // Champ de recherche inventaire
    const searchInput = document.getElementById('inventory-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        this.applyFilters();
      });
    }

    // Boutons de filtre (Tous, Alerte réassort, Ruptures)
    const filterBtns = document.querySelectorAll('.inventory-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('bg-stone-900', 'text-white'));
        btn.classList.add('bg-stone-900', 'text-white');
        this.currentFilter = btn.dataset.filter;
        this.applyFilters();
      });
    });

    // Bouton export CSV
    const exportBtn = document.getElementById('inventory-export-csv-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        DataStore.exportToCsv(this.items);
        App.showToast('Fichier CSV d\'inventaire exporté avec succès.');
      });
    }

    // Bouton de réinitialisation démo
    const resetBtn = document.getElementById('inventory-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handleResetCatalog());
    }
  }
};
