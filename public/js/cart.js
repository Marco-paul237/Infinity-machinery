/**
 * ========================================================================================
 * PROJET : MAISON DEUGUEU HEMEDAK — BOUTIQUE ÉLECTROMÉNAGER & GESTION D'INVENTAIRE
 * FICHIER : public/js/cart.js
 * 
 * RÔLE DU FICHIER :
 * ----------------------------------------------------------------------------------------
 * Module de gestion du panier d'achat et du processus de commande (Checkout).
 * - Enregistre les articles sélectionnés dans le navigateur (localStorage).
 * - Applique une validation stricte des limites de stock : impossible d'ajouter ou de commander
 *   une quantité supérieure au stock physique réel en magasin.
 * - Calcule les sous-totaux et applique les frais selon le mode sélectionné :
 *   * Retrait gratuit en magasin (0 €)
 *   * Livraison & Installation par Théodore (29 €)
 * - Soumet la commande à DataStore.createOrder(), déclenchant la décrémentation automatique
 *   du stock côté serveur.
 * - Affiche le reçu de confirmation de commande prêt pour impression.
 * 
 * COMMENT CE FICHIER EST INTERCONNECTÉ AVEC LE RESTE DU PROJET :
 * ----------------------------------------------------------------------------------------
 * - Dépend de `public/js/data-store.js` : appelle DataStore.createOrder() lors du checkout.
 * - Dépend de `public/js/app.js` :
 *   * App.showToast() pour les alertes visuelles.
 *   * App.loadCatalog() pour actualiser les badges de stock sur les cartes produits publiques.
 * - Interagit avec `public/js/inventory-admin.js` :
 *   * InventoryAdmin.loadInventory() pour que l'inventaire de Théodore reflète la vente immédiatement.
 * - Manipule le DOM de `index.html` :
 *   * #cart-drawer-container (tiroir latéral)
 *   * #checkout-modal (modale de paiement/livraison)
 *   * #order-confirmation-modal (bon de commande)
 * ========================================================================================
 */

const Cart = {
  // Liste des articles actuellement dans le panier
  items: [],
  // Mode de livraison par défaut ('pickup' pour retrait ou 'delivery' pour livraison à domicile)
  deliveryMethod: 'pickup',
  // Frais de livraison (0€ pour retrait, 29€ pour livraison et mise en service)
  deliveryFee: 0,

  /**
   * ======================================================================================
   * SECTION 1 : INITIALISATION & PERSISTANCE DANS LE LOCALSTORAGE
   * ======================================================================================
   */

  /**
   * Initialise le panier au chargement de l'application.
   */
  init() {
    this.loadFromStorage();
    this.renderBadge();
    this.bindEvents();
  },

  /**
   * Restaure les articles précédemment mis de côté dans le localStorage du navigateur.
   */
  loadFromStorage() {
    try {
      const saved = localStorage.getItem('mb_cart');
      if (saved) {
        this.items = JSON.parse(saved);
      }
    } catch (e) {
      this.items = [];
    }
  },

  /**
   * Sauvegarde le panier dans le localStorage et met à jour le badge du compteur d'en-tête.
   */
  saveToStorage() {
    localStorage.setItem('mb_cart', JSON.stringify(this.items));
    this.renderBadge();
  },

  /**
   * ======================================================================================
   * SECTION 2 : AJOUT, MODIFICATION ET SUPPRESSION D'ARTICLES (AVEC CONTRÔLE DE STOCK)
   * ======================================================================================
   */

  /**
   * Ajoute un appareil au panier avec vérification impérative du stock disponible.
   * @param {Object} product - Fiche produit (id, title, price, stock...)
   * @param {number} quantity - Quantité souhaitée (1 par défaut)
   */
  addItem(product, quantity = 1) {
    if (!product || product.stock <= 0) {
      App.showToast('Cet appareil est actuellement en rupture de stock au magasin.', 'warning');
      return;
    }

    const existingIndex = this.items.findIndex(i => i.id === product.id);
    if (existingIndex > -1) {
      const currentQty = this.items[existingIndex].quantity;
      // Contrôle de dépassement de stock
      if (currentQty + quantity > product.stock) {
        App.showToast(`Stock maximum atteint (${product.stock} unité(s) disponible(s) en magasin).`, 'warning');
        return;
      }
      this.items[existingIndex].quantity += quantity;
    } else {
      if (quantity > product.stock) {
        App.showToast(`Seulement ${product.stock} unité(s) disponible(s) en magasin.`, 'warning');
        quantity = product.stock;
      }
      this.items.push({
        id: product.id,
        sku: product.sku,
        title: product.title,
        brand: product.brand,
        price: product.price,
        image: product.image,
        maxStock: product.stock,
        condition: product.condition,
        quantity: quantity
      });
    }

    this.saveToStorage();
    App.showToast(`"${product.title}" ajouté au panier.`);
    this.openDrawer();
  },

  /**
   * Modifie la quantité d'un article (+1 ou -1) avec contrôle des bornes.
   * @param {string} id - Identifiant de l'appareil
   * @param {number} delta - +1 ou -1
   */
  updateQuantity(id, delta) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      this.removeItem(id);
      return;
    }

    if (newQty > item.maxStock) {
      App.showToast(`Stock maximum atteint (${item.maxStock} disponible(s) en magasin).`, 'warning');
      return;
    }

    item.quantity = newQty;
    this.saveToStorage();
    this.renderDrawer();
  },

  /**
   * Supprime un article du panier.
   */
  removeItem(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.saveToStorage();
    this.renderDrawer();
    App.showToast('Article retiré du panier.');
  },

  /**
   * Vide entièrement le panier (après commande réussie).
   */
  clear() {
    this.items = [];
    this.saveToStorage();
    this.renderDrawer();
  },

  /**
   * Calcule le sous-total brut des articles.
   */
  getSubtotal() {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  },

  /**
   * Calcule le montant total TTC (sous-total + frais de livraison éventuels).
   */
  getTotal() {
    return this.getSubtotal() + (this.deliveryMethod === 'delivery' ? 29 : 0);
  },

  /**
   * Change le mode de réception (retrait gratuit ou livraison à domicile).
   */
  setDeliveryMethod(method) {
    this.deliveryMethod = method;
    this.deliveryFee = method === 'delivery' ? 29 : 0;
    this.renderDrawer();
  },

  /**
   * ======================================================================================
   * SECTION 3 : RENDU VISUEL DU TIROIR PANIER (DRAWER)
   * ======================================================================================
   */

  /**
   * Met à jour le macaron rouge du compteur de panier sur l'en-tête.
   */
  renderBadge() {
    const totalCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-counter-badge');
    badges.forEach(badge => {
      badge.textContent = totalCount;
      badge.style.display = totalCount > 0 ? 'inline-flex' : 'none';
    });
  },

  openDrawer() {
    this.renderDrawer();
    const drawer = document.getElementById('cart-drawer-container');
    if (drawer) drawer.style.display = 'block';
  },

  closeDrawer() {
    const drawer = document.getElementById('cart-drawer-container');
    if (drawer) drawer.style.display = 'none';
  },

  /**
   * Génère le HTML des articles présents dans le panier latéral.
   */
  renderDrawer() {
    const listEl = document.getElementById('cart-items-list');
    const emptyEl = document.getElementById('cart-empty-state');
    const footerEl = document.getElementById('cart-drawer-footer');
    const subtotalEl = document.getElementById('cart-subtotal-val');
    const deliveryFeeEl = document.getElementById('cart-delivery-fee-val');
    const totalEl = document.getElementById('cart-total-val');

    if (!listEl) return;

    if (this.items.length === 0) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'block';

    listEl.innerHTML = this.items.map(item => `
      <div class="flex items-center gap-4 py-3 border-b border-[#ECE6D8]">
        <img src="${item.image}" alt="${item.title}" class="w-16 h-16 object-cover rounded-lg border border-[#E5DEC9] bg-[#FAF8F5]">
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start">
            <h4 class="text-sm font-semibold text-[#1C1917] truncate" title="${item.title}">${item.title}</h4>
            <button onclick="Cart.removeItem('${item.id}')" class="text-xs text-red-500 hover:text-red-700 ml-2" title="Supprimer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
          <p class="text-xs text-[#6B655B] font-mono">${item.sku} • <span class="text-amber-800 font-medium">${item.condition}</span></p>
          <div class="flex justify-between items-center mt-2">
            <div class="inline-flex items-center border border-[#D3C9AF] rounded-md bg-white">
              <button onclick="Cart.updateQuantity('${item.id}', -1)" class="px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded-l">-</button>
              <span class="px-2 text-xs font-semibold text-gray-900">${item.quantity}</span>
              <button onclick="Cart.updateQuantity('${item.id}', 1)" class="px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-100 rounded-r" ${item.quantity >= item.maxStock ? 'disabled title="Stock max atteint"' : ''}>+</button>
            </div>
            <span class="text-sm font-bold text-[#1C1917]">${(item.price * item.quantity).toLocaleString('fr-FR')} €</span>
          </div>
        </div>
      </div>
    `).join('');

    const subtotal = this.getSubtotal();
    const fee = this.deliveryMethod === 'delivery' ? 29 : 0;
    const total = subtotal + fee;

    if (subtotalEl) subtotalEl.textContent = `${subtotal.toLocaleString('fr-FR')} €`;
    if (deliveryFeeEl) deliveryFeeEl.textContent = fee === 0 ? 'Gratuit (Retrait)' : `${fee} €`;
    if (totalEl) totalEl.textContent = `${total.toLocaleString('fr-FR')} €`;
  },

  /**
   * ======================================================================================
   * SECTION 4 : PROCESSUS DE VALIDATION DE COMMANDE (CHECKOUT)
   * ======================================================================================
   */

  openCheckoutModal() {
    if (this.items.length === 0) {
      App.showToast('Votre panier est vide.', 'warning');
      return;
    }
    this.closeDrawer();
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.style.display = 'flex';

    // Remplissage du récapitulatif dans la modale
    const summaryList = document.getElementById('checkout-items-summary');
    if (summaryList) {
      summaryList.innerHTML = this.items.map(item => `
        <div class="flex justify-between text-xs py-1 border-b border-[#ECE6D8]">
          <span class="text-[#1C1917] truncate max-w-[220px]">${item.quantity}x ${item.title}</span>
          <span class="font-bold text-[#1C1917]">${(item.price * item.quantity).toLocaleString('fr-FR')} €</span>
        </div>
      `).join('');
    }

    const subtotal = this.getSubtotal();
    const fee = this.deliveryMethod === 'delivery' ? 29 : 0;
    const total = subtotal + fee;

    const totalEl = document.getElementById('checkout-total-val');
    if (totalEl) totalEl.textContent = `${total.toLocaleString('fr-FR')} €`;
  },

  closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.style.display = 'none';
  },

  /**
   * Traite la soumission du formulaire de commande :
   * 1. Construit l'objet payload de commande.
   * 2. Appelle DataStore.createOrder() (le serveur vérifie et décrémente les stocks).
   * 3. Vide le panier et affiche la modale de confirmation imprimable.
   * 4. Déclenche l'actualisation du catalogue public et de l'inventaire admin.
   */
  async handleCheckoutSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Validation en cours...';
    }

    try {
      const formData = new FormData(form);
      const deliveryMethod = formData.get('deliveryMethod') || this.deliveryMethod;
      const subtotal = this.getSubtotal();
      const deliveryFee = deliveryMethod === 'delivery' ? 29 : 0;
      const total = subtotal + deliveryFee;

      const orderPayload = {
        customer: {
          firstName: formData.get('firstName'),
          lastName: formData.get('lastName'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          address: formData.get('address'),
          instructions: formData.get('instructions') || ''
        },
        deliveryMethod: deliveryMethod,
        paymentMethod: formData.get('paymentMethod'),
        paymentLabel: formData.get('paymentMethod') === 'on_delivery' 
          ? (deliveryMethod === 'delivery' ? 'Paiement à la livraison (CB / Chèque)' : 'Paiement au comptoir (CB / Espèces)')
          : (formData.get('paymentMethod') === 'transfer' ? 'Virement bancaire' : 'Carte bancaire en ligne'),
        items: this.items.map(item => ({
          id: item.id,
          sku: item.sku,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        })),
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: total,
        notes: formData.get('instructions') || ''
      };

      // Appel de l'API REST
      const createdOrder = await DataStore.createOrder(orderPayload);

      // Commande validée avec succès
      this.clear();
      this.closeCheckoutModal();
      this.showOrderConfirmationModal(createdOrder);

      // Synchronisation en cascade : actualisation du catalogue public et de l'espace admin
      if (typeof App !== 'undefined' && App.loadCatalog) {
        App.loadCatalog();
      }
      if (typeof InventoryAdmin !== 'undefined' && InventoryAdmin.loadInventory) {
        InventoryAdmin.loadInventory();
      }

    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Confirmer et Commander';
      }
    }
  },

  /**
   * ======================================================================================
   * SECTION 5 : BON DE CONFIRMATION DE COMMANDE (IMPRIMABLE)
   * ======================================================================================
   */

  showOrderConfirmationModal(order) {
    const modal = document.getElementById('order-confirmation-modal');
    if (!modal) return;

    document.getElementById('conf-order-id').textContent = order.id;
    document.getElementById('conf-order-date').textContent = new Date(order.createdAt).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    document.getElementById('conf-customer-name').textContent = `${order.customer.firstName} ${order.customer.lastName}`;
    document.getElementById('conf-customer-contact').textContent = `${order.customer.phone} • ${order.customer.email}`;
    document.getElementById('conf-delivery-mode').textContent = order.deliveryLabel;
    document.getElementById('conf-delivery-address').textContent = order.customer.address || 'Retrait direct en magasin';
    document.getElementById('conf-payment-mode').textContent = order.paymentLabel;
    document.getElementById('conf-order-total').textContent = `${order.total.toLocaleString('fr-FR')} €`;

    const itemsContainer = document.getElementById('conf-items-list');
    if (itemsContainer) {
      itemsContainer.innerHTML = order.items.map(item => `
        <div class="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
          <div>
            <span class="font-semibold text-gray-900">${item.title}</span>
            <span class="text-xs text-gray-500 font-mono ml-2">(${item.sku})</span>
            <div class="text-xs text-gray-600">Qté : ${item.quantity} × ${item.price.toLocaleString('fr-FR')} €</div>
          </div>
          <span class="font-bold text-gray-900">${(item.price * item.quantity).toLocaleString('fr-FR')} €</span>
        </div>
      `).join('');
    }

    modal.style.display = 'flex';
  },

  closeOrderConfirmationModal() {
    const modal = document.getElementById('order-confirmation-modal');
    if (modal) modal.style.display = 'none';
  },

  bindEvents() {
    const pickupOption = document.getElementById('delivery-pickup-opt');
    const deliveryOption = document.getElementById('delivery-home-opt');
    if (pickupOption) {
      pickupOption.addEventListener('change', () => this.setDeliveryMethod('pickup'));
    }
    if (deliveryOption) {
      deliveryOption.addEventListener('change', () => this.setDeliveryMethod('delivery'));
    }
  }
};
