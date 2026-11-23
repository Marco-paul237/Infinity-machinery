/**
 * ========================================================================================
 * PROJET : INFINITY MACHINERY — BOUTIQUE ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FONDÉ PAR : DEUGUEU HEMEDAK THÉODORE (Maître Artisan Électromécanicien)
 * FICHIER : public/js/app.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Chef d'orchestre principal du frontend (Main Application Orchestrator).
 * - Gère le routeur de vues de l'application monopage (SPA) :
 *   * 'home'     : Accueil avec présentation de Théodore et sélection vedette.
 *   * 'catalog'  : Boutique en ligne avec filtres, tri et recherche.
 *   * 'story'    : Autobiographie de Théodore en 4 chapitres.
 *   * 'services' : Atelier de diagnostic et réparation.
 *   * 'contact'  : Accès magasin et horaires.
 *   * 'admin'    : Back-Office d'inventaire réservé à Théodore (protégé par code PIN).
 * - Fournit la méthode App.selectCategoryAndGo(category) pour le bandeau de catégories rapide.
 * - Gère le tri dynamique des appareils (prix croissant/décroissant, réparabilité).
 * - Ouvre et peuple la modale de fiche technique détaillée d'un appareil (App.openProductDetailModal).
 * - Gère l'authentification PIN de Théodore (code: 1994 ou bouton de démo en 1 clic).
 * - Traite l'envoi du formulaire de diagnostic d'atelier (App.handleRepairFormSubmit).
 * - Affiche les alertes flottantes toast (App.showToast).
 * ========================================================================================
 */

const App = {
  // Vue actuellement active à l'écran
  currentView: 'home',
  // Liste en mémoire de tous les appareils du catalogue
  catalogItems: [],
  // Filtre de catégorie actif ('all', 'gros-electro', 'petit-electro', 'reconditionne')
  selectedCategory: 'all',
  // Filtre d'état ('all', 'Neuf', 'Reconditionné Atelier')
  selectedCondition: 'all',
  // Mode de tri ('default', 'price-asc', 'price-desc', 'repairability')
  selectedSort: 'default',
  // Texte de recherche tapé par le visiteur
  searchQuery: '',
  // Case à cocher "En stock uniquement"
  inStockOnly: false,
  // Produit actuellement ouvert dans la modale détaillée
  selectedProduct: null,
  // Statut d'authentification pour l'espace gestion de Théodore
  isAdminAuthenticated: false,

  /**
   * ======================================================================================
   * SECTION 1 : INITIALISATION DU CYCLE DE VIE
   * ======================================================================================
   */
  async init() {
    this.bindNavigation();
    this.bindSearchAndFilters();
    this.bindModals();
    await this.loadCatalog();
    Cart.init();

    // Lecture du hash dans l'URL (ex: #catalog ou #story)
    const hash = window.location.hash.replace('#', '');
    if (['home', 'catalog', 'story', 'services', 'contact', 'admin'].includes(hash)) {
      this.switchView(hash);
    } else {
      this.switchView('home');
    }
  },

  /**
   * Charge la liste des appareils via DataStore et met à jour les grilles.
   */
  async loadCatalog() {
    try {
      this.catalogItems = await DataStore.getInventory();
      this.renderCatalog();
      this.renderFeatured();
    } catch (e) {
      this.showToast('Erreur de chargement du catalogue', 'error');
    }
  },

  /**
   * ======================================================================================
   * SECTION 2 : ROUTEUR DE VUES MONOPAGE (SPA VIEW ROUTER)
   * ======================================================================================
   */
  switchView(viewName) {
    if (viewName === 'admin' && !this.isAdminAuthenticated) {
      this.openAdminAuthModal();
      return;
    }

    this.currentView = viewName;
    window.location.hash = viewName;

    // Mise à jour de l'état actif sur les liens de menu
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.dataset.view === viewName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Bascule de visibilité des conteneurs de section
    const views = ['home', 'catalog', 'story', 'services', 'contact', 'admin'];
    views.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) {
        el.style.display = (v === viewName) ? 'block' : 'none';
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewName === 'admin') {
      InventoryAdmin.init();
      OrdersAdmin.init();
    } else if (viewName === 'catalog') {
      this.renderCatalog();
    }
  },

  /**
   * Raccourci depuis les cartes d'accueil pour filtrer directement et basculer sur le catalogue.
   * @param {string} category - 'gros-electro', 'petit-electro', 'reconditionne'
   */
  selectCategoryAndGo(category) {
    this.selectedCategory = category;
    
    // Met à jour les boutons d'onglets de catégorie
    document.querySelectorAll('.catalog-cat-btn').forEach(btn => {
      if (btn.dataset.category === category) {
        btn.classList.remove('bg-white', 'text-slate-700');
        btn.classList.add('bg-[#C25E34]', 'text-white');
      } else {
        btn.classList.remove('bg-[#C25E34]', 'text-white');
        btn.classList.add('bg-white', 'text-slate-700');
      }
    });

    this.switchView('catalog');
  },

  /**
   * ======================================================================================
   * SECTION 3 : RENDU DU CATALOGUE ET DES SÉLECTIONS VEDETTES
   * ======================================================================================
   */
  renderFeatured() {
    const container = document.getElementById('featured-products-container');
    if (!container) return;

    const featured = this.catalogItems.filter(i => i.featured).slice(0, 4);
    container.innerHTML = featured.map(p => this.createProductCardHtml(p)).join('');
  },

  /**
   * Applique les filtres et le tri, puis génère la grille du catalogue public.
   */
  renderCatalog() {
    const grid = document.getElementById('catalog-products-grid');
    const emptyState = document.getElementById('catalog-empty-state');
    const countBadge = document.getElementById('catalog-results-count');
    if (!grid) return;

    let filtered = [...this.catalogItems];

    // Filtre par catégorie
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(i => i.category === this.selectedCategory);
    }

    // Filtre par état (Neuf ou Reconditionné)
    if (this.selectedCondition !== 'all') {
      filtered = filtered.filter(i => i.condition === this.selectedCondition);
    }

    // Filtre en stock uniquement
    if (this.inStockOnly) {
      filtered = filtered.filter(i => i.stock > 0);
    }

    // Recherche par mot-clé (titre, marque, SKU ou description)
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        (i.title && i.title.toLowerCase().includes(q)) ||
        (i.brand && i.brand.toLowerCase().includes(q)) ||
        (i.sku && i.sku.toLowerCase().includes(q)) ||
        (i.shortDescription && i.shortDescription.toLowerCase().includes(q))
      );
    }

    // Tri dynamique des résultats
    if (this.selectedSort === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (this.selectedSort === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (this.selectedSort === 'repairability') {
      filtered.sort((a, b) => (b.repairabilityIndex || 0) - (a.repairabilityIndex || 0));
    }

    if (countBadge) {
      countBadge.textContent = `${filtered.length} appareil(s) disponible(s)`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    grid.innerHTML = filtered.map(p => this.createProductCardHtml(p)).join('');
  },

  /**
   * Génère le code HTML d'une carte produit pour la boutique publique.
   */
  createProductCardHtml(p) {
    const isOutOfStock = p.stock <= 0;
    const isLowStock = p.stock > 0 && p.stock <= p.minStockAlert;
    
    // Badge de disponibilité physique
    let stockBadge = '';
    if (isOutOfStock) {
      stockBadge = '<span class="badge badge-stock-out">Rupture temporaire</span>';
    } else if (isLowStock) {
      stockBadge = `<span class="badge badge-stock-low">Dernier exemplaire (${p.stock} dispo)</span>`;
    } else {
      stockBadge = `<span class="badge badge-stock-in">En stock au magasin (${p.stock})</span>`;
    }

    // Badge d'état (Neuf ou Reconditionné certifié)
    const conditionBadge = p.condition === 'Reconditionné Atelier'
      ? `<span class="badge badge-reconditioned">Reconditionné Atelier</span>`
      : `<span class="badge badge-new">Neuf Garanti</span>`;

    // Classe énergétique européenne
    const energyClass = p.energyClass || 'A';
    const energyBadgeClass = energyClass.includes('+') ? 'energy-tag-A-plus' : `energy-tag-${energyClass}`;

    return `
      <div class="product-card">
        <div class="product-image-container cursor-pointer" onclick="App.openProductDetailModal('${p.id}')">
          <img src="${p.image}" alt="${p.title}" class="product-image" loading="lazy">
          <div class="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            ${conditionBadge}
          </div>
          <div class="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <span class="energy-tag ${energyBadgeClass}" title="Classe énergétique">${energyClass}</span>
          </div>
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-baseline text-xs text-slate-500 font-mono mb-1">
              <span>${p.brand.toUpperCase()}</span>
              <span>${p.sku}</span>
            </div>

            <h3 class="font-bold text-base text-slate-900 leading-snug cursor-pointer hover:text-[#C25E34] transition line-clamp-2" onclick="App.openProductDetailModal('${p.id}')">
              ${p.title}
            </h3>

            <p class="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
              ${p.shortDescription}
            </p>

            ${p.uncleNote ? `
              <div class="uncle-quote-box mt-3 line-clamp-2 text-xs">
                "${p.uncleNote}"
              </div>
            ` : ''}

            <div class="flex flex-wrap items-center gap-2 mt-3">
              ${stockBadge}
              ${p.repairabilityIndex ? `
                <span class="repairability-pill text-[11px]" title="Indice officiel de réparabilité">
                  🔧 ${p.repairabilityIndex}/10
                </span>
              ` : ''}
            </div>
          </div>

          <div class="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between">
            <div>
              <span class="text-xs text-slate-500 block">Prix TTC</span>
              <span class="text-xl font-bold font-serif text-slate-900">${p.price.toLocaleString('fr-FR')} €</span>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="App.openProductDetailModal('${p.id}')" class="btn btn-secondary btn-sm" title="Fiche technique complète">
                Détails
              </button>
              <button onclick="Cart.addItem(App.getProductById('${p.id}'))" class="btn btn-primary btn-sm" ${isOutOfStock ? 'disabled title="En rupture"' : ''}>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                ${isOutOfStock ? 'Épuisé' : 'Commander'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  getProductById(id) {
    return this.catalogItems.find(p => p.id === id);
  },

  /**
   * ======================================================================================
   * SECTION 4 : MODALE DE FICHE TECHNIQUE DÉTAILLÉE
   * ======================================================================================
   */
  openProductDetailModal(id) {
    const p = this.getProductById(id);
    if (!p) return;

    this.selectedProduct = p;
    const modal = document.getElementById('product-detail-modal');
    if (!modal) return;

    document.getElementById('detail-image').src = p.image;
    document.getElementById('detail-title').textContent = p.title;
    document.getElementById('detail-brand').textContent = p.brand;
    document.getElementById('detail-sku').textContent = p.sku;
    document.getElementById('detail-price').textContent = `${p.price.toLocaleString('fr-FR')} €`;
    document.getElementById('detail-condition').textContent = p.conditionLabel || p.condition;
    document.getElementById('detail-desc').textContent = p.description || p.shortDescription;
    document.getElementById('detail-warranty').textContent = `Garantie ${p.warrantyYears || 2} ans pièces et main d'œuvre`;

    const energyEl = document.getElementById('detail-energy');
    if (energyEl) {
      energyEl.textContent = p.energyClass || 'A';
      energyEl.className = `energy-tag energy-tag-${p.energyClass || 'A'}`;
    }

    const repairEl = document.getElementById('detail-repairability');
    if (repairEl) {
      repairEl.textContent = p.repairabilityIndex ? `Indice de réparabilité : ${p.repairabilityIndex}/10` : 'Réparable en atelier';
    }

    const quoteEl = document.getElementById('detail-uncle-quote');
    if (quoteEl) {
      quoteEl.textContent = p.uncleNote || 'Testé et approuvé sur banc d\'essai par Théodore Deugueu Hemedak.';
    }

    const specsContainer = document.getElementById('detail-specs-table');
    if (specsContainer && p.specs) {
      specsContainer.innerHTML = Object.entries(p.specs).map(([key, val]) => `
        <tr class="border-b border-slate-200">
          <td class="py-2 text-slate-600 font-medium text-xs">${key}</td>
          <td class="py-2 text-slate-900 font-semibold text-xs text-right">${val}</td>
        </tr>
      `).join('');
    }

    const stockStatusEl = document.getElementById('detail-stock-status');
    const addBtn = document.getElementById('detail-add-cart-btn');

    if (p.stock <= 0) {
      stockStatusEl.innerHTML = '<span class="badge badge-stock-out">Rupture de stock momentanée</span>';
      addBtn.disabled = true;
      addBtn.textContent = 'Indisponible pour le moment';
    } else {
      stockStatusEl.innerHTML = `<span class="badge badge-stock-in">En stock au magasin : ${p.stock} exemplaire(s)</span>`;
      addBtn.disabled = false;
      addBtn.innerHTML = `
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
        Ajouter au panier (${p.price.toLocaleString('fr-FR')} €)
      `;
      addBtn.onclick = () => {
        Cart.addItem(p);
        this.closeProductDetailModal();
      };
    }

    modal.style.display = 'flex';
  },

  closeProductDetailModal() {
    const modal = document.getElementById('product-detail-modal');
    if (modal) modal.style.display = 'none';
  },

  /**
   * ======================================================================================
   * SECTION 5 : AUTHENTIFICATION PIN DE L'ESPACE GESTIONNAIRE DE THÉODORE
   * ======================================================================================
   */
  openAdminAuthModal() {
    const modal = document.getElementById('admin-auth-modal');
    if (modal) {
      document.getElementById('admin-pin-input').value = '';
      modal.style.display = 'flex';
    }
  },

  closeAdminAuthModal() {
    const modal = document.getElementById('admin-auth-modal');
    if (modal) modal.style.display = 'none';
  },

  handleAdminAuth(pin) {
    if (pin === '1994' || pin === 'demo') {
      this.isAdminAuthenticated = true;
      this.closeAdminAuthModal();
      this.showToast('Accès Gestionnaire autorisé : Deugueu Hemedak Théodore.', 'success');
      this.switchView('admin');
      document.getElementById('admin-toggle-badge').textContent = 'Mode Gestion Actif';
    } else {
      this.showToast('Code PIN incorrect (Indice : année de fondation 1994).', 'error');
    }
  },

  /**
   * ======================================================================================
   * SECTION 6 : FORMULAIRE DE DIAGNOSTIC DE PANNE EN ATELIER
   * ======================================================================================
   */
  openRepairModal() {
    const modal = document.getElementById('repair-request-modal');
    if (modal) modal.style.display = 'flex';
  },

  closeRepairModal() {
    const modal = document.getElementById('repair-request-modal');
    if (modal) modal.style.display = 'none';
  },

  async handleRepairFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Envoi en cours...';
    }

    try {
      const formData = new FormData(form);
      const repairPayload = {
        customer: {
          name: formData.get('name'),
          phone: formData.get('phone'),
          email: formData.get('email')
        },
        appliance: {
          type: formData.get('applianceType'),
          brand: formData.get('brand'),
          model: formData.get('model') || '',
          approxAge: formData.get('approxAge') || ''
        },
        issue: formData.get('issue')
      };

      await DataStore.createRepair(repairPayload);
      form.reset();
      this.closeRepairModal();
      this.showToast('Demande de diagnostic transmise à Théodore ! Nous vous recontactons sous 24h.', 'success');
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Transmettre la demande de diagnostic';
      }
    }
  },

  /**
   * ======================================================================================
   * SECTION 7 : GESTIONNAIRE DE NOTIFICATIONS TOAST
   * ======================================================================================
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  },

  /**
   * ======================================================================================
   * SECTION 8 : BINDING DES ÉVÉNEMENTS DU DOM
   * ======================================================================================
   */
  bindNavigation() {
    document.querySelectorAll('.nav-link, [data-nav]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = el.dataset.view || el.dataset.nav;
        if (targetView) this.switchView(targetView);
      });
    });
  },

  bindSearchAndFilters() {
    const searchInput = document.getElementById('catalog-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim();
        this.renderCatalog();
      });
    }

    document.querySelectorAll('.catalog-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.catalog-cat-btn').forEach(b => {
          b.classList.remove('bg-[#C25E34]', 'text-white');
          b.classList.add('bg-white', 'text-slate-700');
        });
        btn.classList.remove('bg-white', 'text-slate-700');
        btn.classList.add('bg-[#C25E34]', 'text-white');
        this.selectedCategory = btn.dataset.category;
        this.renderCatalog();
      });
    });

    const conditionSelect = document.getElementById('catalog-condition-filter');
    if (conditionSelect) {
      conditionSelect.addEventListener('change', (e) => {
        this.selectedCondition = e.target.value;
        this.renderCatalog();
      });
    }

    const sortSelect = document.getElementById('catalog-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.selectedSort = e.target.value;
        this.renderCatalog();
      });
    }

    const stockToggle = document.getElementById('catalog-instock-toggle');
    if (stockToggle) {
      stockToggle.addEventListener('change', (e) => {
        this.inStockOnly = e.target.checked;
        this.renderCatalog();
      });
    }
  },

  bindModals() {
    const adminForm = document.getElementById('admin-auth-form');
    if (adminForm) {
      adminForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const pin = document.getElementById('admin-pin-input').value.trim();
        this.handleAdminAuth(pin);
      });
    }

    const demoBypassBtn = document.getElementById('admin-demo-bypass-btn');
    if (demoBypassBtn) {
      demoBypassBtn.addEventListener('click', () => this.handleAdminAuth('1994'));
    }

    const repairForm = document.getElementById('repair-request-form');
    if (repairForm) {
      repairForm.addEventListener('submit', (e) => this.handleRepairFormSubmit(e));
    }

    const productForm = document.getElementById('product-form');
    if (productForm) {
      productForm.addEventListener('submit', (e) => InventoryAdmin.handleProductFormSubmit(e));
    }

    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', (e) => Cart.handleCheckoutSubmit(e));
    }
  }
};

// Démarrage automatique
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
