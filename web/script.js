// Full-Stack Canteen Billing Application State
let menuItems = [];
let categoriesList = [];
const cart = []; // Array of { id, name, price, category, quantity, maxStock }
let activeCategory = "all";
let searchQuery = "";
let currentSettings = {
  canteen_name: "Campus Canteen",
  tax_percent: 5,
  default_discount: 0,
  currency: "Rs."
};

// Item-to-Emoji mappings for modern canteen visual design
const ITEM_EMOJIS = {
  "Tea": "🍵",
  "Coffee": "☕",
  "Fruit Juice": "🧃",
  "Samosa": "🥟",
  "Puff": "🥐",
  "Sandwich": "🥪",
  "Veg Meals": "🍛",
  "Chapati Curry": "🫓",
  "Chicken Biryani": "🍗"
};

function getItemEmoji(name, category) {
  if (ITEM_EMOJIS[name]) return ITEM_EMOJIS[name];
  const cat = (category || "").toLowerCase();
  if (cat.includes("beverage")) return "☕";
  if (cat.includes("snack")) return "🥟";
  if (cat.includes("special")) return "🍗";
  if (cat.includes("meal")) return "🍛";
  return "🍽️";
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", async () => {
  // Protect page (requires login)
  if (!Auth.protectPage({ redirectUrl: 'login.html' })) return;

  // Render unified header navigation
  Auth.renderHeader('billing');

  // Load settings first, then categories and menu
  await loadSettings();
  await loadCategories();
  await fetchMenu();

  renderCart();
  initCheckoutEvents();
  initSearch();
  initPaymentChips();
  initDiscountListener();

  const clearBtn = document.getElementById("clear-cart-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      cart.length = 0;
      renderCart();
    });
  }
});

// Load settings from backend
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      currentSettings.canteen_name = data.canteen_name || "Campus Canteen";
      currentSettings.tax_percent = parseFloat(data.tax_percent) || 0;
      currentSettings.default_discount = parseFloat(data.default_discount) || 0;
      currentSettings.currency = data.currency || "Rs.";

      const taxRateEl = document.getElementById("summary-tax-rate");
      if (taxRateEl) taxRateEl.textContent = currentSettings.tax_percent;

      const discountInput = document.getElementById("summary-discount-input");
      if (discountInput && currentSettings.default_discount > 0) {
        discountInput.value = currentSettings.default_discount;
      }
    }
  } catch (err) {
    console.warn("Could not load settings:", err);
  }
}

// Load categories dynamically
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    if (res.ok) {
      categoriesList = await res.json();
      renderCategoryTabs();
    }
  } catch (err) {
    console.warn("Could not load categories:", err);
  }
}

function renderCategoryTabs() {
  const tabsContainer = document.getElementById("category-tabs");
  if (!tabsContainer) return;

  let tabsHtml = `<button type="button" class="tab-btn ${activeCategory === 'all' ? 'active' : ''}" data-category="all">🍽️ All</button>`;

  categoriesList.forEach((cat) => {
    const catLower = cat.name.toLowerCase();
    const isActive = activeCategory === catLower ? 'active' : '';
    let emoji = "🍽️";
    if (catLower.includes("beverage")) emoji = "☕";
    else if (catLower.includes("snack")) emoji = "🥟";
    else if (catLower.includes("special")) emoji = "🍗";
    else if (catLower.includes("meal")) emoji = "🍛";

    tabsHtml += `<button type="button" class="tab-btn ${isActive}" data-category="${escapeHtml(catLower)}">${emoji} ${escapeHtml(cat.name)}</button>`;
  });

  tabsContainer.innerHTML = tabsHtml;

  tabsContainer.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      tabsContainer.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-category") || "all";
      filterAndRenderMenu();
    });
  });
}

// Fetches menu items from backend API
async function fetchMenu() {
  const menuContainer = document.getElementById("menu-container");

  try {
    const res = await fetch("/api/items");
    if (!res.ok) {
      throw new Error("Unable to fetch menu items from server.");
    }
    menuItems = await res.json();
    filterAndRenderMenu();
  } catch (error) {
    menuContainer.innerHTML = `<p class="loading-state" style="color: #B85042;">Error loading menu: ${error.message}</p>`;
  }
}

// Filters menu items based on active category and search query
function filterAndRenderMenu() {
  const filtered = menuItems.filter((item) => {
    const matchesCategory = activeCategory === "all" || 
      (item.category && item.category.trim().toLowerCase() === activeCategory.trim().toLowerCase());
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });
  renderMenu(filtered);
}

function initSearch() {
  const searchInput = document.getElementById("menu-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      filterAndRenderMenu();
    });
  }
}

function initPaymentChips() {
  const chips = document.querySelectorAll(".payment-method-chip");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
    });
  });
}

function initDiscountListener() {
  const discountInput = document.getElementById("summary-discount-input");
  if (discountInput) {
    discountInput.addEventListener("input", () => {
      renderCartSummary();
    });
  }
}

// Renders menu cards with live stock indicators and Sold Out badges
function renderMenu(items) {
  const menuContainer = document.getElementById("menu-container");
  menuContainer.innerHTML = "";

  if (items.length === 0) {
    menuContainer.innerHTML = '<p class="loading-state">No items found matching criteria.</p>';
    return;
  }

  items.forEach((item) => {
    const categoryClass = (item.category || "").toLowerCase().replace(/\s+/g, "-");
    const emoji = getItemEmoji(item.name, item.category);
    const isSoldOut = !item.is_available || item.stock <= 0;

    let stockBadgeHtml = '';
    if (isSoldOut) {
      stockBadgeHtml = '<span class="stock-indicator sold-out-badge">⚠️ Sold Out</span>';
    } else if (item.stock <= 5) {
      stockBadgeHtml = `<span class="stock-indicator low-stock-badge">⚡ Only ${item.stock} left</span>`;
    } else {
      stockBadgeHtml = `<span class="stock-indicator in-stock-badge">✓ In Stock (${item.stock})</span>`;
    }

    const card = document.createElement("div");
    card.className = `menu-card ${isSoldOut ? "sold-out" : ""}`;
    card.innerHTML = `
      <div>
        <div class="card-hero">
          <div class="item-icon-bubble" title="${escapeHtml(item.name)}">${emoji}</div>
          <span class="category-badge ${categoryClass}">${escapeHtml(item.category || "General")}</span>
        </div>
        <h3 class="item-name">${escapeHtml(item.name)}</h3>
        <div>${stockBadgeHtml}</div>
      </div>
      <div>
        <div class="item-price">
          <span class="currency">${currentSettings.currency}</span> ${parseFloat(item.price).toFixed(2)}
        </div>
        <button type="button" class="add-btn" data-id="${item.id}" ${isSoldOut ? 'disabled' : ''}>
          ${isSoldOut ? 'Sold Out' : '+ Add to Cart'}
        </button>
      </div>
    `;

    if (!isSoldOut) {
      card.querySelector(".add-btn").addEventListener("click", () => {
        addToCart(item.id);
      });
    }

    menuContainer.appendChild(card);
  });
}

// Add item to cart with stock validation
function addToCart(itemId) {
  const menuItem = menuItems.find((m) => m.id === itemId);
  if (!menuItem) return;

  if (!menuItem.is_available || menuItem.stock <= 0) {
    showError(`"${menuItem.name}" is sold out!`);
    return;
  }

  const existingItem = cart.find((item) => item.id === itemId);
  if (existingItem) {
    if (existingItem.quantity >= menuItem.stock) {
      showError(`Cannot add more. Only ${menuItem.stock} of "${menuItem.name}" available in stock.`);
      return;
    }
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      category: menuItem.category,
      quantity: 1,
      maxStock: menuItem.stock
    });
  }

  hideError();
  renderCart();
}

function updateQuantity(itemId, change) {
  const cartItem = cart.find((ci) => ci.id === itemId);
  if (!cartItem) return;

  const menuItem = menuItems.find((m) => m.id === itemId);
  const maxStock = menuItem ? menuItem.stock : cartItem.maxStock;

  if (change > 0 && cartItem.quantity >= maxStock) {
    showError(`Maximum stock limit reached (${maxStock}) for "${cartItem.name}".`);
    return;
  }

  cartItem.quantity += change;
  if (cartItem.quantity <= 0) {
    removeFromCart(itemId);
  } else {
    hideError();
    renderCart();
  }
}

function removeFromCart(itemId) {
  const index = cart.findIndex((ci) => ci.id === itemId);
  if (index !== -1) {
    cart.splice(index, 1);
  }
  renderCart();
}

// Renders the cart items and calls renderCartSummary()
function renderCart() {
  const cartContainer = document.getElementById("cart-container");
  const cartSummary = document.getElementById("cart-summary");

  if (cart.length === 0) {
    cartContainer.innerHTML = '<p class="cart-empty-text">Cart is empty</p>';
    if (cartSummary) cartSummary.style.display = "none";
    return;
  }

  if (cartSummary) cartSummary.style.display = "block";

  cartContainer.innerHTML = cart.map((item) => {
    const itemSubtotal = item.price * item.quantity;
    const emoji = getItemEmoji(item.name, item.category);

    return `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <div class="cart-item-name">${emoji} ${escapeHtml(item.name)}</div>
          <div class="cart-item-price">
            ${currentSettings.currency} ${item.price.toFixed(2)} &times; ${item.quantity} = ${currentSettings.currency} ${itemSubtotal.toFixed(2)}
          </div>
        </div>
        <div class="cart-qty-controls">
          <button type="button" class="qty-btn-sm" onclick="updateQuantity(${item.id}, -1)">-</button>
          <span class="cart-qty-value">${item.quantity}</span>
          <button type="button" class="qty-btn-sm" onclick="updateQuantity(${item.id}, 1)">+</button>
          <button type="button" class="remove-btn" onclick="removeFromCart(${item.id})" title="Remove item">&times;</button>
        </div>
      </div>
    `;
  }).join("");

  renderCartSummary();
}

// Calculates live subtotal, tax, discount, and grand total
function renderCartSummary() {
  const itemsCountEl = document.getElementById("summary-items-count");
  const subtotalEl = document.getElementById("summary-subtotal");
  const taxAmountEl = document.getElementById("summary-tax-amount");
  const totalPriceEl = document.getElementById("summary-total-price");
  const discountInput = document.getElementById("summary-discount-input");

  let totalItemsCount = 0;
  let subtotal = 0;

  cart.forEach((it) => {
    totalItemsCount += it.quantity;
    subtotal += it.price * it.quantity;
  });

  let discount = parseFloat(discountInput ? discountInput.value : 0) || 0;
  if (discount < 0) discount = 0;
  if (discount > subtotal) discount = subtotal;

  const taxableAmount = Math.max(0, subtotal - discount);
  const taxAmount = (taxableAmount * currentSettings.tax_percent) / 100;
  const grandTotal = taxableAmount + taxAmount;

  if (itemsCountEl) itemsCountEl.textContent = totalItemsCount;
  if (subtotalEl) subtotalEl.textContent = `${currentSettings.currency} ${subtotal.toFixed(2)}`;
  if (taxAmountEl) taxAmountEl.textContent = `${currentSettings.currency} ${taxAmount.toFixed(2)}`;
  if (totalPriceEl) totalPriceEl.textContent = `${currentSettings.currency} ${grandTotal.toFixed(2)}`;
}

// Binds checkout button, modal events
function initCheckoutEvents() {
  const checkoutBtn = document.getElementById("checkout-btn");
  const closeBtn = document.getElementById("modal-close-btn");
  const printBtn = document.getElementById("print-bill-btn");
  const newOrderBtn = document.getElementById("new-order-btn");
  const modal = document.getElementById("receipt-modal");

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", handleCheckout);
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }

  if (newOrderBtn) {
    newOrderBtn.addEventListener("click", startNewOrder);
  }
}

// Handles checkout validation and submits POST request to /api/orders
async function handleCheckout() {
  hideError();

  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const discountInput = document.getElementById("summary-discount-input");
  const payMethodSelected = document.querySelector('input[name="payment_method"]:checked');

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const discount = parseFloat(discountInput ? discountInput.value : 0) || 0;
  const paymentMethod = payMethodSelected ? payMethodSelected.value : "Cash";

  if (!name) {
    showError("Please enter customer name to proceed with checkout.");
    if (nameInput) nameInput.focus();
    return;
  }

  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length !== 10) {
    showError("Please enter a valid 10-digit customer phone number (e.g. 9876543210).");
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (cart.length === 0) {
    showError("Your cart is empty! Please add at least one item from the menu.");
    return;
  }

  const payload = {
    customer_name: name,
    customer_phone: digitsOnly,
    payment_method: paymentMethod,
    discount: discount,
    items: cart.map((item) => ({
      itemId: item.id,
      quantity: item.quantity
    }))
  };

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Processing Order...";
  }

  try {
    const response = await Auth.fetch("/api/orders", {
      method: "POST",
      body: payload
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate bill.");
    }

    // Refresh menu items immediately so decremented stock is reflected
    await fetchMenu();

    // Show official receipt modal
    showReceiptModal(data);
  } catch (err) {
    showError("Order Error: " + err.message);
  } finally {
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Checkout & Generate Bill";
    }
  }
}

function showError(message) {
  const errorEl = document.getElementById("form-error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
    errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function hideError() {
  const errorEl = document.getElementById("form-error");
  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }
}

// Populates and displays the receipt modal popup
function showReceiptModal(bill) {
  const canteenTitle = document.getElementById("receipt-canteen-name");
  const metaEl = document.getElementById("receipt-meta");
  const itemsBodyEl = document.getElementById("receipt-items-body");
  const breakdownEl = document.getElementById("receipt-summary-breakdown");
  const totalEl = document.getElementById("receipt-grand-total");
  const modal = document.getElementById("receipt-modal");

  const curr = bill.currency || currentSettings.currency;

  if (canteenTitle) {
    canteenTitle.textContent = bill.canteen_name || currentSettings.canteen_name;
  }

  const dateStr = new Date(bill.created_at || Date.now()).toLocaleString();

  metaEl.innerHTML = `
    <div><strong>Bill No   :</strong> ${escapeHtml(bill.bill_no)}</div>
    <div><strong>Date/Time :</strong> ${escapeHtml(dateStr)}</div>
    <div><strong>Customer  :</strong> ${escapeHtml(bill.customer_name)} (${escapeHtml(bill.customer_phone)})</div>
    <div><strong>Cashier   :</strong> ${escapeHtml(bill.cashier_name || "Staff")}</div>
    <div><strong>Payment   :</strong> ${escapeHtml(bill.payment_method)}</div>
  `;

  itemsBodyEl.innerHTML = bill.items.map((it) => {
    const emoji = getItemEmoji(it.name, it.category);
    return `
      <tr>
        <td>
          <strong>${emoji} ${escapeHtml(it.name)}</strong><br>
          <span style="font-size: 11px; color: var(--dark-brown-muted);">${escapeHtml(it.category || "")}</span>
        </td>
        <td style="text-align: center;">${it.quantity} &times; ${curr} ${parseFloat(it.price).toFixed(2)}</td>
        <td style="text-align: right;">${curr} ${parseFloat(it.amount).toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  breakdownEl.innerHTML = `
    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
      <span>Subtotal:</span>
      <span>${curr} ${parseFloat(bill.subtotal).toFixed(2)}</span>
    </div>
    ${bill.discount > 0 ? `
    <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #2E7D32;">
      <span>Discount:</span>
      <span>-${curr} ${parseFloat(bill.discount).toFixed(2)}</span>
    </div>` : ''}
    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
      <span>Tax (${bill.tax_percent || currentSettings.tax_percent}%):</span>
      <span>+${curr} ${parseFloat(bill.tax).toFixed(2)}</span>
    </div>
  `;

  totalEl.textContent = `${curr} ${parseFloat(bill.total).toFixed(2)}`;
  modal.style.display = "flex";
}

function startNewOrder() {
  cart.length = 0;
  renderCart();

  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const discountInput = document.getElementById("summary-discount-input");
  if (nameInput) nameInput.value = "";
  if (phoneInput) phoneInput.value = "";
  if (discountInput) discountInput.value = currentSettings.default_discount || 0;

  hideError();

  const modal = document.getElementById("receipt-modal");
  if (modal) modal.style.display = "none";
}

window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
