// Application State
let menuItems = [];
const cart = []; // In-memory cart array
let activeCategory = "all";
let searchQuery = "";

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

// Returns matching emoji icon or fallback
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
document.addEventListener("DOMContentLoaded", () => {
  fetchMenu();
  renderCart();
  initCheckoutEvents();
  initCategoryTabs();
  initSearchAndHistory();
});

// Fetches menu items from the Java backend API
function fetchMenu() {
  const menuContainer = document.getElementById("menu-container");

  fetch("/api/menu")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to fetch menu items from server.");
      }
      return response.json();
    })
    .then((items) => {
      menuItems = items;
      filterAndRenderMenu();
    })
    .catch((error) => {
      menuContainer.innerHTML = `<p class="loading-state" style="color: #B85042;">Error loading menu: ${error.message}</p>`;
    });
}

// Binds category filter tabs
function initCategoryTabs() {
  const tabButtons = document.querySelectorAll(".category-tabs .tab-btn");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeCategory = btn.getAttribute("data-category") || "all";
      filterAndRenderMenu();
    });
  });
}

// Filters menu items based on active category tab and search query
function filterAndRenderMenu() {
  const filtered = menuItems.filter((item) => {
    const matchesCategory = activeCategory === "all" || 
      item.category.trim().toLowerCase() === activeCategory.trim().toLowerCase();
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  renderMenu(filtered);
}

// Binds search box input and past orders history modal
function initSearchAndHistory() {
  const searchInput = document.getElementById("menu-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      filterAndRenderMenu();
    });
  }

  const historyBtn = document.getElementById("history-nav-btn");
  const historyModal = document.getElementById("history-modal");
  const historyCloseBtn = document.getElementById("history-close-btn");
  const historyDismissBtn = document.getElementById("history-dismiss-btn");
  const historyLog = document.getElementById("history-log");

  if (historyBtn && historyModal) {
    historyBtn.addEventListener("click", () => {
      historyModal.style.display = "flex";
      historyLog.textContent = "Loading past orders from bills.txt...";

      fetch("/api/history")
        .then((res) => res.json())
        .then((data) => {
          historyLog.textContent = data.history || "No orders recorded in bills.txt yet.";
        })
        .catch((err) => {
          historyLog.textContent = "Error loading history: " + err.message;
        });
    });
  }

  if (historyCloseBtn && historyModal) {
    historyCloseBtn.addEventListener("click", () => {
      historyModal.style.display = "none";
    });
  }

  if (historyDismissBtn && historyModal) {
    historyDismissBtn.addEventListener("click", () => {
      historyModal.style.display = "none";
    });
  }
}

// Renders menu cards with rounded aesthetic, emoji bubbles, and Add buttons
function renderMenu(items) {
  const menuContainer = document.getElementById("menu-container");
  menuContainer.innerHTML = "";

  if (items.length === 0) {
    menuContainer.innerHTML = '<p class="loading-state">No items found in this category.</p>';
    return;
  }

  items.forEach((item) => {
    const categoryClass = item.category.toLowerCase().replace(/\s+/g, "-");
    const emoji = getItemEmoji(item.name, item.category);

    const card = document.createElement("div");
    card.className = "menu-card";
    card.innerHTML = `
      <div>
        <div class="card-hero">
          <div class="item-icon-bubble" title="${escapeHtml(item.name)}">${emoji}</div>
          <span class="category-badge ${categoryClass}">${escapeHtml(item.category)}</span>
        </div>
        <h3 class="item-name">${escapeHtml(item.name)}</h3>
      </div>
      <div>
        <div class="item-price">
          <span class="currency">Rs.</span> ${parseFloat(item.price).toFixed(2)}
        </div>
        <button type="button" class="add-btn" data-id="${item.id}">+ Add to Cart</button>
      </div>
    `;

    card.querySelector(".add-btn").addEventListener("click", () => {
      addToCart(item.id);
    });

    menuContainer.appendChild(card);
  });
}

// Puts an item into the cart array or increments its quantity
function addToCart(itemId) {
  const menuItem = menuItems.find((m) => m.id === itemId);
  if (!menuItem) return;

  const existingItem = cart.find((item) => item.id === itemId);
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      category: menuItem.category,
      quantity: 1
    });
  }

  hideError();
  renderCart();
}

// Updates item quantity via + or - buttons
function updateQuantity(itemId, change) {
  const item = cart.find((ci) => ci.id === itemId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    removeFromCart(itemId);
  } else {
    renderCart();
  }
}

// Removes an item completely from the cart array
function removeFromCart(itemId) {
  const index = cart.findIndex((ci) => ci.id === itemId);
  if (index !== -1) {
    cart.splice(index, 1);
  }
  renderCart();
}

// Renders the cart list and rough estimated totals (no final backend pricing here)
function renderCart() {
  const cartContainer = document.getElementById("cart-container");
  const cartSummary = document.getElementById("cart-summary");
  const itemsCountEl = document.getElementById("summary-items-count");
  const totalPriceEl = document.getElementById("summary-total-price");

  if (cart.length === 0) {
    cartContainer.innerHTML = '<p class="cart-empty-text">Cart is empty</p>';
    if (cartSummary) cartSummary.style.display = "none";
    return;
  }

  if (cartSummary) cartSummary.style.display = "block";

  let totalItemsCount = 0;
  let roughEstimate = 0;

  cartContainer.innerHTML = cart.map((item) => {
    totalItemsCount += item.quantity;
    const itemSubtotal = item.price * item.quantity;
    roughEstimate += itemSubtotal;
    const emoji = getItemEmoji(item.name, item.category);

    return `
      <div class="cart-item-row">
        <div class="cart-item-info">
          <div class="cart-item-name">${emoji} ${escapeHtml(item.name)}</div>
          <div class="cart-item-price">
            Rs. ${item.price.toFixed(2)} &times; ${item.quantity} = Rs. ${itemSubtotal.toFixed(2)} (estimated)
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

  if (itemsCountEl) itemsCountEl.textContent = totalItemsCount;
  if (totalPriceEl) totalPriceEl.textContent = `Rs. ${roughEstimate.toFixed(2)} (estimated)`;
}

// Binds checkout button, modal controls, Print Bill, and New Order buttons
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

// Handles checkout validation and submits POST request to /api/bill
async function handleCheckout() {
  hideError();

  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";

  // 1. Validate Customer Name
  if (!name) {
    showError("Please enter your name to proceed with checkout.");
    if (nameInput) nameInput.focus();
    return;
  }

  // 2. Validate Phone Number (must be exactly 10 digits)
  const digitsOnly = phone.replace(/\D/g, "");
  if (digitsOnly.length !== 10) {
    showError("Please enter a valid 10-digit phone number (e.g., 9876543210).");
    if (phoneInput) phoneInput.focus();
    return;
  }

  // 3. Validate Cart is not empty
  if (cart.length === 0) {
    showError("Your cart is empty! Please add at least one item from the menu.");
    return;
  }

  const payload = {
    name: name,
    phone: digitsOnly,
    items: cart.map((item) => ({
      itemId: item.id,
      quantity: item.quantity
    }))
  };

  const checkoutBtn = document.getElementById("checkout-btn");
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Generating Bill...";
  }

  try {
    const response = await fetch("/api/bill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate bill from server.");
    }

    showReceiptModal(data);
  } catch (err) {
    showError("Error: " + err.message);
  } finally {
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Checkout & Generate Bill";
    }
  }
}

// Shows friendly error message
function showError(message) {
  const errorEl = document.getElementById("form-error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = "block";
  }
}

// Hides error banner
function hideError() {
  const errorEl = document.getElementById("form-error");
  if (errorEl) {
    errorEl.style.display = "none";
    errorEl.textContent = "";
  }
}

// Populates and displays the receipt modal popup
function showReceiptModal(bill) {
  const metaEl = document.getElementById("receipt-meta");
  const itemsBodyEl = document.getElementById("receipt-items-body");
  const totalEl = document.getElementById("receipt-grand-total");
  const modal = document.getElementById("receipt-modal");

  metaEl.innerHTML = `
    <div><strong>Customer ID :</strong> ${escapeHtml(bill.customerId || "C001")}</div>
    <div><strong>Name        :</strong> ${escapeHtml(bill.name)}</div>
    <div><strong>Phone       :</strong> ${escapeHtml(bill.phone)}</div>
  `;

  itemsBodyEl.innerHTML = bill.items.map((it) => {
    const emoji = getItemEmoji(it.name, it.category);
    return `
      <tr>
        <td>
          <strong>${emoji} ${escapeHtml(it.name)}</strong><br>
          <span style="font-size: 11px; color: #5C4A42;">${escapeHtml(it.category)}</span>
        </td>
        <td>${it.quantity}</td>
        <td>Rs. ${parseFloat(it.amount).toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  totalEl.textContent = `Rs. ${parseFloat(bill.grandTotal).toFixed(2)}`;
  modal.style.display = "flex";
}

// Clears cart, form fields, and closes receipt modal for a fresh order
function startNewOrder() {
  cart.length = 0;
  renderCart();

  const nameInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");
  if (nameInput) nameInput.value = "";
  if (phoneInput) phoneInput.value = "";

  hideError();

  const modal = document.getElementById("receipt-modal");
  if (modal) modal.style.display = "none";
}

// Escapes HTML special characters for safe rendering
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Expose functions for inline HTML calls
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
