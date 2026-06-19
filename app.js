/**
 * A1 STORE - INVENTORY & MONEY MANAGEMENT SYSTEM
 * Frontend Application Engine (Vanilla ES6 JavaScript)
 */

// ==========================================
// STATE MANAGEMENT & LOCAL STORAGE SCHEMA
// ==========================================

const DB_PREFIX = "a1_store_";

const defaultProducts = [
  { id: "prod_1", name: "Coca-Cola 500ml", price: 80.00, quantity: 24, minThreshold: 5 },
  { id: "prod_2", name: "Lays Chips Classic", price: 50.00, quantity: 42, minThreshold: 10 },
  { id: "prod_3", name: "Wai Wai Noodles 75g", price: 25.00, quantity: 12, minThreshold: 15 },
  { id: "prod_4", name: "Basmati Rice 5kg", price: 650.00, quantity: 8, minThreshold: 3 },
  { id: "prod_5", name: "Aashirvaad Atta 5kg", price: 420.00, quantity: 15, minThreshold: 5 },
  { id: "prod_6", name: "Amul Butter 100g", price: 90.00, quantity: 4, minThreshold: 5 },
  { id: "prod_7", name: "Red Label Tea 500g", price: 310.00, quantity: 0, minThreshold: 2 }
];

const defaultTransactions = [
  {
    id: "tx_init",
    date: "2026-06-19T08:00:00.000Z",
    products: [],
    total: 10000.00,
    type: "incoming",
    paymentMethod: "cash",
    customerName: null,
    customerPhone: null,
    description: "Opening Galla Cash Balance"
  },
  {
    id: "tx_1",
    date: "2026-06-19T10:15:00.000Z",
    products: [{ name: "Coca-Cola 500ml", quantity: 2, price: 80.00 }],
    total: 160.00,
    type: "incoming",
    paymentMethod: "cash",
    customerName: null,
    customerPhone: null,
    description: "Standard cash counter sale"
  },
  {
    id: "tx_2",
    date: "2026-06-19T11:40:00.000Z",
    products: [
      { name: "Basmati Rice 5kg", quantity: 1, price: 650.00 },
      { name: "Aashirvaad Atta 5kg", quantity: 1, price: 420.00 }
    ],
    total: 1070.00,
    type: "incoming",
    paymentMethod: "credit",
    customerName: "Bijay Kumar",
    customerPhone: "+9779812345678",
    description: "Credit sale"
  }
];

const defaultCredits = [
  {
    customerName: "Bijay Kumar",
    customerPhone: "+9779812345678",
    pendingAmount: 1070.00,
    purchases: [
      { date: "2026-06-19T11:40:00.000Z", items: "Basmati Rice 5kg x1, Aashirvaad Atta 5kg x1", amount: 1070.00 }
    ]
  }
];

const defaultTemplate = "Dear {customer_name}, please clear your pending dues of Rs. {amount} at A1 Store. Thank you!";

// Core Storage Fetchers
let products = getStorage("products", defaultProducts);
let transactions = getStorage("transactions", defaultTransactions);
let credits = getStorage("credits", defaultCredits);
let reminderTemplate = localStorage.getItem(DB_PREFIX + "template") || defaultTemplate;

// Application State Carts
let payCart = [];
let creditCart = [];

function getStorage(key, defaultVal) {
  const data = localStorage.getItem(DB_PREFIX + key);
  return data ? JSON.parse(data) : defaultVal;
}

function setStorage(key, val) {
  localStorage.setItem(DB_PREFIX + key, JSON.stringify(val));
}

// ==========================================
// NAVIGATION & DOM ROUTING
// ==========================================

const tabs = ["home", "galla", "inventory", "credits"];
const tabTitles = {
  home: { title: "Dashboard Overview", subtitle: "Real-time store metrics & fast entry controls" },
  galla: { title: "Galla Box Register", subtitle: "Transaction ledger, sales cash-in, and expense tracking" },
  inventory: { title: "Product Inventory Catalog", subtitle: "Manage items, adjustment prices, and execute restocks" },
  credits: { title: "Customer Credit Accounts", subtitle: "Manage outstanding balances and send WhatsApp reminders" }
};

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    const tabName = item.getAttribute("data-tab");
    switchTab(tabName);
  });
});

function switchTab(tabName) {
  tabs.forEach(tab => {
    const section = document.getElementById(`sec-${tab}`);
    const navBtn = document.getElementById(`nav-${tab}`);
    if (tab === tabName) {
      section.classList.add("active");
      navBtn.classList.add("active");
    } else {
      section.classList.remove("active");
      navBtn.classList.remove("active");
    }
  });

  // Update Header Title
  document.getElementById("section-title").innerText = tabTitles[tabName].title;
  document.getElementById("section-subtitle").innerText = tabTitles[tabName].subtitle;

  // Perform any section-specific initializations
  if (tabName === "credits") {
    document.getElementById("credits-msg-template").value = reminderTemplate;
  }
}

// ==========================================
// SYSTEM CLOCK & INITIALIZATION
// ==========================================
function updateClock() {
  const clockEl = document.getElementById("current-time");
  if (clockEl) {
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
setInterval(updateClock, 1000);
updateClock();

// Initialize the system UI renders
document.addEventListener("DOMContentLoaded", () => {
  setStorage("products", products);
  setStorage("transactions", transactions);
  setStorage("credits", credits);
  renderAll();
  logTerminal("System fully initialized. Ready for transactions.", "info");
});

// ==========================================
// RECTIVE RENDERING ENGINES
// ==========================================

function renderAll() {
  renderStats();
  renderHomeRecentTable();
  renderGallaTable();
  renderInventoryTable();
  renderCreditsTable();
  populateProductDropdowns();
  updateBadgeCounts();
}

function renderStats() {
  // Galla Balance Calculation
  // Incoming = Income, Outgoing = Expenses
  let totalBalance = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach(tx => {
    if (tx.type === "incoming") {
      // Direct cash/qr transactions add to current balance.
      // Credit transactions do NOT add cash immediately. Only repayments (paymentMethod: cash/qr) add cash.
      // Actually, standard sales increase Galla immediately UNLESS it's on credit.
      if (tx.paymentMethod !== "credit") {
        totalBalance += tx.total;
        totalIncome += tx.total;
      }
    } else if (tx.type === "outgoing") {
      totalBalance -= tx.total;
      totalExpense += tx.total;
    }
  });

  // Active Credits Outstanding
  let activeCreditsSum = credits.reduce((sum, debtor) => sum + debtor.pendingAmount, 0);
  let activeDebtorsCount = credits.filter(c => c.pendingAmount > 0).length;

  // Low stock products count
  let lowStockCount = products.filter(p => p.quantity <= p.minThreshold).length;

  // Update Stats Cards
  document.getElementById("stat-galla-balance").innerText = `Rs. ${totalBalance.toFixed(2)}`;
  document.getElementById("stat-active-credits").innerText = `Rs. ${activeCreditsSum.toFixed(2)}`;
  document.getElementById("stat-total-products").innerText = `${products.length} Products`;

  // Update trend text under cards
  document.getElementById("stat-debtor-count").innerText = `${activeDebtorsCount} Active Customer Accounts`;
  const lowStockLabel = document.getElementById("stat-low-stock-alert");
  if (lowStockCount > 0) {
    lowStockLabel.innerText = `${lowStockCount} Products Low Stock!`;
    lowStockLabel.className = "stat-trend trend-danger";
  } else {
    lowStockLabel.innerText = "All Stocks Healthy";
    lowStockLabel.className = "stat-trend trend-up";
  }

  // Update Galla box specific screen
  document.getElementById("galla-balance-display").innerText = `Rs. ${totalBalance.toFixed(2)}`;
  document.getElementById("galla-total-income").innerText = `Rs. ${totalIncome.toFixed(2)}`;
  document.getElementById("galla-total-expense").innerText = `Rs. ${totalExpense.toFixed(2)}`;

  // Update Credits Dashboard specifics
  document.getElementById("credit-total-outstanding").innerText = `Rs. ${activeCreditsSum.toFixed(2)}`;
  document.getElementById("credit-active-customers-count").innerText = activeDebtorsCount;
}

function updateBadgeCounts() {
  const lowStockCount = products.filter(p => p.quantity <= p.minThreshold).length;
  const activeDebtorsCount = credits.filter(c => c.pendingAmount > 0).length;

  const lowStockBadge = document.getElementById("low-stock-count-badge");
  if (lowStockCount > 0) {
    lowStockBadge.innerText = lowStockCount;
    lowStockBadge.classList.remove("hidden");
  } else {
    lowStockBadge.classList.add("hidden");
  }

  const creditsBadge = document.getElementById("credit-debtors-badge");
  if (activeDebtorsCount > 0) {
    creditsBadge.innerText = activeDebtorsCount;
    creditsBadge.classList.remove("hidden");
  } else {
    creditsBadge.classList.add("hidden");
  }
}

// 1. Render Home Recent Transactions Table
function renderHomeRecentTable() {
  const tbody = document.getElementById("home-recent-transactions");
  tbody.innerHTML = "";

  // Get last 5 transactions
  const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  if (sortedTx.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;" class="text-muted">No transactions recorded yet.</td></tr>`;
    return;
  }

  sortedTx.forEach(tx => {
    const tr = document.createElement("tr");

    // Formatted Date
    const txDate = new Date(tx.date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

    // Products description
    let prodDesc = "";
    if (tx.products && tx.products.length > 0) {
      prodDesc = tx.products.map(p => `${p.name} (x${p.quantity})`).join(", ");
    } else {
      prodDesc = tx.description || "Credit Account Settlement";
    }

    // Payment Type badge
    let paymentBadge = "";
    if (tx.paymentMethod === "cash") {
      paymentBadge = `<span class="pill-badge tag-cash">Cash</span>`;
    } else if (tx.paymentMethod === "qr") {
      paymentBadge = `<span class="pill-badge tag-cash">QR Pay</span>`;
    } else if (tx.paymentMethod === "credit") {
      paymentBadge = `<span class="pill-badge tag-credit">Credit</span>`;
    }

    // Customer/Entity
    const entity = tx.customerName || "-";

    // Impact
    const impactClass = tx.type === "incoming" ? "trend-up" : "trend-danger";
    const prefix = tx.type === "incoming" ? "+" : "-";
    // Show cash ledger effect (credit transactions don't instantly add cash, but represent potential revenue)
    const ledgerImpact = tx.paymentMethod === "credit" 
      ? `<span class="text-muted">Rs. ${tx.total.toFixed(2)} (Booked Credit)</span>` 
      : `<span class="${impactClass}">${prefix}Rs. ${tx.total.toFixed(2)}</span>`;

    tr.innerHTML = `
      <td>${txDate}</td>
      <td class="product-mono-list" title="${prodDesc}">${truncateString(prodDesc, 35)}</td>
      <td>${paymentBadge}</td>
      <td>${entity}</td>
      <td>${ledgerImpact}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 2. Render Galla Box Register Table (With Filters)
function renderGallaTable() {
  const tbody = document.getElementById("galla-transaction-table-body");
  const emptyState = document.getElementById("galla-empty-state");
  tbody.innerHTML = "";

  const searchQuery = document.getElementById("galla-search").value.toLowerCase();
  const filterType = document.getElementById("galla-filter-type").value; // all, incoming, outgoing
  const filterMethod = document.getElementById("galla-filter-method").value; // all, cash, credit

  const filteredTx = transactions.filter(tx => {
    // Search filter: match products list, customer name, description, reference ID
    const searchMatch = 
      (tx.customerName && tx.customerName.toLowerCase().includes(searchQuery)) ||
      (tx.description && tx.description.toLowerCase().includes(searchQuery)) ||
      tx.id.toLowerCase().includes(searchQuery) ||
      (tx.products && tx.products.some(p => p.name.toLowerCase().includes(searchQuery)));

    // Flow Type Filter
    const typeMatch = filterType === "all" || tx.type === filterType;

    // Payment Method Filter
    let methodMatch = true;
    if (filterMethod === "cash") {
      methodMatch = tx.paymentMethod === "cash" || tx.paymentMethod === "qr";
    } else if (filterMethod === "credit") {
      methodMatch = tx.paymentMethod === "credit";
    }

    return searchMatch && typeMatch && methodMatch;
  });

  // Sort descending by date
  filteredTx.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (filteredTx.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  filteredTx.forEach(tx => {
    const tr = document.createElement("tr");

    const dateStr = new Date(tx.date).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    
    const typeBadge = tx.type === "incoming" 
      ? `<span class="pill-badge pill-incoming">Income</span>`
      : `<span class="pill-badge pill-outgoing">Expense</span>`;

    let itemsHtml = "";
    if (tx.products && tx.products.length > 0) {
      itemsHtml = tx.products.map(p => `<div>${p.name} <span class="text-muted">x${p.quantity}</span> (Rs. ${p.price.toFixed(2)})</div>`).join("");
    } else {
      itemsHtml = `<div class="text-muted">${tx.description || "N/A"}</div>`;
    }

    let paymentBadge = "";
    if (tx.paymentMethod === "cash") {
      paymentBadge = `<span class="pill-badge tag-cash">Cash Register</span>`;
    } else if (tx.paymentMethod === "qr") {
      paymentBadge = `<span class="pill-badge tag-cash">QR Pay</span>`;
    } else if (tx.paymentMethod === "credit") {
      paymentBadge = `<span class="pill-badge tag-credit" title="Customer: ${tx.customerName}">Credit Ledger (${tx.customerName})</span>`;
    }

    const flowClass = tx.type === "incoming" ? "trend-up" : "trend-danger";
    const sign = tx.type === "incoming" ? "+" : "-";
    
    // For visual consistency, highlight Galla impact (credits are pending)
    let impactText = "";
    if (tx.paymentMethod === "credit") {
      impactText = `<div class="text-muted">Rs. ${tx.total.toFixed(2)}</div><div style="font-size: 0.65rem; color: var(--text-muted);">Awaiting Cash</div>`;
    } else {
      impactText = `<div class="${flowClass}">${sign}Rs. ${tx.total.toFixed(2)}</div>`;
    }

    tr.innerHTML = `
      <td>${dateStr}</td>
      <td class="tx-ref-mono">${tx.id}</td>
      <td>${typeBadge}</td>
      <td>${itemsHtml}</td>
      <td>${paymentBadge}</td>
      <td>${impactText}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 3. Render Inventory Table (With Search)
function renderInventoryTable() {
  const tbody = document.getElementById("inventory-table-body");
  const emptyState = document.getElementById("inventory-empty-state");
  tbody.innerHTML = "";

  const searchInput = document.getElementById("inventory-search-input").value.toLowerCase();

  const filteredProducts = products.filter(p => {
    const statusText = p.quantity === 0 ? "out of stock" : (p.quantity <= p.minThreshold ? "low stock" : "in stock");
    return p.name.toLowerCase().includes(searchInput) || statusText.includes(searchInput);
  });

  if (filteredProducts.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  filteredProducts.forEach(p => {
    const tr = document.createElement("tr");

    // Stock Status configuration
    let statusClass = "in-stock";
    let statusText = "In Stock";
    if (p.quantity === 0) {
      statusClass = "out-of-stock";
      statusText = "Out of Stock";
    } else if (p.quantity <= p.minThreshold) {
      statusClass = "low-stock";
      statusText = "Low Stock";
    }

    tr.innerHTML = `
      <td style="font-weight: 500;">${p.name}</td>
      <td class="tx-ref-mono">Rs. ${p.price.toFixed(2)}</td>
      <td class="tx-ref-mono">${p.quantity} units</td>
      <td>
        <div class="stock-indicator">
          <span class="status-dot ${statusClass}"></span>
          <span class="status-label" style="font-size:0.8rem; font-weight:500;">${statusText}</span>
        </div>
      </td>
      <td>
        <div class="action-link-group">
          <button class="link-btn link-success" onclick="openRestockModal('${p.id}')">Restock (+)</button>
          <button class="link-btn link-primary" onclick="openEditPriceModal('${p.id}')">Edit Price</button>
          <button class="link-btn link-danger" onclick="deleteProduct('${p.id}')">Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. Render Credits Customer Accounts Table
function renderCreditsTable() {
  const tbody = document.getElementById("credits-table-body");
  const emptyState = document.getElementById("credits-empty-state");
  tbody.innerHTML = "";

  const activeDebtors = credits.filter(c => c.pendingAmount > 0);

  if (activeDebtors.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  activeDebtors.forEach(c => {
    const tr = document.createElement("tr");

    // Construct purchased items summary list
    const debtDetails = c.purchases.map(p => {
      const pDate = new Date(p.date).toLocaleDateString([], { month: "short", day: "numeric" });
      return `<div>${pDate}: ${p.items} (Rs. ${p.amount.toFixed(2)})</div>`;
    }).join("");

    // Last purchase date
    let lastDateStr = "-";
    if (c.purchases.length > 0) {
      const dates = c.purchases.map(p => new Date(p.date));
      const maxDate = new Date(Math.max.apply(null, dates));
      lastDateStr = maxDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    }

    tr.innerHTML = `
      <td style="font-weight: 500;">${c.customerName}</td>
      <td class="tx-ref-mono">${c.customerPhone}</td>
      <td style="font-size:0.78rem;" class="text-secondary">${debtDetails}</td>
      <td class="tx-ref-mono text-warning" style="font-weight: 700;">Rs. ${c.pendingAmount.toFixed(2)}</td>
      <td>${lastDateStr}</td>
      <td>
        <div class="action-link-group">
          <button class="link-btn link-success" onclick="openSettleCreditModal('${c.customerName}')">Settle / Pay</button>
          <button class="link-btn link-warning" onclick="sendSingleWhatsAppReminder('${c.customerName}')">WhatsApp Reminder</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Populate modal product selector dropdowns
function populateProductDropdowns() {
  const payDropdown = document.getElementById("pay-product-select");
  const creditDropdown = document.getElementById("credit-product-select");
  
  const options = products
    .filter(p => p.quantity > 0)
    .map(p => `<option value="${p.id}">${p.name} - Rs. ${p.price.toFixed(2)} (Stock: ${p.quantity})</option>`)
    .join("");

  const placeholder = `<option value="" disabled selected>-- Select Product --</option>`;

  payDropdown.innerHTML = placeholder + options;
  creditDropdown.innerHTML = placeholder + options;
}

// ==========================================
// MODAL WORKFLOW & CARTS ACTIONS
// ==========================================

// Global Modal handlers
const modalBackdrop = document.getElementById("modal-backdrop");

document.querySelectorAll("[data-close-modal]").forEach(btn => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const modalId = btn.getAttribute("data-close-modal");
    closeModal(modalId);
  });
});

modalBackdrop.addEventListener("click", () => {
  document.querySelectorAll(".modal").forEach(modal => {
    if (!modal.classList.contains("hidden")) {
      closeModal(modal.id);
    }
  });
});

function openModal(modalId) {
  modalBackdrop.classList.remove("hidden");
  document.getElementById(modalId).classList.remove("hidden");
}

function closeModal(modalId) {
  modalBackdrop.classList.add("hidden");
  document.getElementById(modalId).classList.add("hidden");
  
  // Clear forms and internal cart if needed
  if (modalId === "modal-pay-sale") {
    payCart = [];
    renderPayCart();
    document.getElementById("form-pay-sale").reset();
  } else if (modalId === "modal-credit-sale") {
    creditCart = [];
    renderCreditCart();
    document.getElementById("form-credit-sale").reset();
  } else if (modalId === "modal-add-product") {
    document.getElementById("form-add-product").reset();
  } else if (modalId === "modal-restock-product") {
    document.getElementById("form-restock-product").reset();
    document.getElementById("restock-total-cost").innerText = "Rs. 0.00";
  } else if (modalId === "modal-edit-price") {
    document.getElementById("form-edit-price").reset();
  } else if (modalId === "modal-settle-credit") {
    document.getElementById("form-settle-credit").reset();
  }
}

// Trigger button wiring
document.getElementById("btn-quick-sale").addEventListener("click", () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("pay-date").value = today;
  openModal("modal-pay-sale");
});

document.getElementById("btn-pay-modal").addEventListener("click", () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("pay-date").value = today;
  openModal("modal-pay-sale");
});

document.getElementById("btn-credit-modal").addEventListener("click", () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("credit-date").value = today;
  openModal("modal-credit-sale");
});

document.getElementById("btn-add-product-modal").addEventListener("click", () => {
  openModal("modal-add-product");
});

// A. On Pay Cart Management
document.getElementById("btn-pay-add-to-cart").addEventListener("click", () => {
  const select = document.getElementById("pay-product-select");
  const qtyInput = document.getElementById("pay-qty-input");
  const productId = select.value;
  const quantity = parseInt(qtyInput.value);

  if (!productId) {
    alert("Please select a product first.");
    return;
  }

  const product = products.find(p => p.id === productId);
  if (!product) return;

  // Stock check
  const existingInCart = payCart.find(item => item.id === productId);
  const cartQty = existingInCart ? existingInCart.qty : 0;
  
  if (product.quantity < (cartQty + quantity)) {
    alert(`Insufficient stock. Only ${product.quantity} units of ${product.name} left. (You have ${cartQty} in cart)`);
    return;
  }

  if (existingInCart) {
    existingInCart.qty += quantity;
  } else {
    payCart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: quantity
    });
  }

  qtyInput.value = "1";
  renderPayCart();
});

function renderPayCart() {
  const tbody = document.getElementById("pay-cart-body");
  const subtotalEl = document.getElementById("pay-cart-subtotal");
  tbody.innerHTML = "";

  if (payCart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="cart-empty-message">No items in cart yet. Add items above.</td></tr>`;
    subtotalEl.innerText = "Rs. 0.00";
    return;
  }

  let total = 0;
  payCart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td class="tx-ref-mono">Rs. ${item.price.toFixed(2)}</td>
      <td class="tx-ref-mono">${item.qty}</td>
      <td class="tx-ref-mono">Rs. ${itemTotal.toFixed(2)}</td>
      <td><button type="button" class="btn-remove-item" onclick="removePayCartItem(${index})">&times;</button></td>
    `;
    tbody.appendChild(tr);
  });

  subtotalEl.innerText = `Rs. ${total.toFixed(2)}`;
}

window.removePayCartItem = function(index) {
  payCart.splice(index, 1);
  renderPayCart();
};

// B. On Credit Cart Management
document.getElementById("btn-credit-add-to-cart").addEventListener("click", () => {
  const select = document.getElementById("credit-product-select");
  const qtyInput = document.getElementById("credit-qty-input");
  const productId = select.value;
  const quantity = parseInt(qtyInput.value);

  if (!productId) {
    alert("Please select a product first.");
    return;
  }

  const product = products.find(p => p.id === productId);
  if (!product) return;

  // Stock check
  const existingInCart = creditCart.find(item => item.id === productId);
  const cartQty = existingInCart ? existingInCart.qty : 0;
  
  if (product.quantity < (cartQty + quantity)) {
    alert(`Insufficient stock. Only ${product.quantity} units of ${product.name} left. (You have ${cartQty} in cart)`);
    return;
  }

  if (existingInCart) {
    existingInCart.qty += quantity;
  } else {
    creditCart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: quantity
    });
  }

  qtyInput.value = "1";
  renderCreditCart();
});

function renderCreditCart() {
  const tbody = document.getElementById("credit-cart-body");
  const totalEl = document.getElementById("credit-cart-total");
  tbody.innerHTML = "";

  if (creditCart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="cart-empty-message">No items in cart yet. Add items above.</td></tr>`;
    totalEl.innerText = "Rs. 0.00";
    return;
  }

  let total = 0;
  creditCart.forEach((item, index) => {
    const itemTotal = item.price * item.qty;
    total += itemTotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.name}</td>
      <td class="tx-ref-mono">Rs. ${item.price.toFixed(2)}</td>
      <td class="tx-ref-mono">${item.qty}</td>
      <td class="tx-ref-mono">Rs. ${itemTotal.toFixed(2)}</td>
      <td><button type="button" class="btn-remove-item" onclick="removeCreditCartItem(${index})">&times;</button></td>
    `;
    tbody.appendChild(tr);
  });

  totalEl.innerText = `Rs. ${total.toFixed(2)}`;
}

window.removeCreditCartItem = function(index) {
  creditCart.splice(index, 1);
  renderCreditCart();
};

// ==========================================
// TRANSACTION FORM SUBMISSIONS (STORE LOGIC)
// ==========================================

// 1. Record Direct Payment Sale ("ON PAY")
document.getElementById("form-pay-sale").addEventListener("submit", (e) => {
  e.preventDefault();

  if (payCart.length === 0) {
    alert("Your cart is empty. Add products to execute a sale.");
    return;
  }

  const txDate = document.getElementById("pay-date").value;
  const payMethod = document.getElementById("pay-payment-method").value;
  const dateObj = new Date(txDate);
  
  // Calculate total
  let total = payCart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Generate Tx ID
  const txId = "tx_" + Date.now().toString(36).substring(4);

  // Form products payload
  const txProducts = payCart.map(item => ({
    name: item.name,
    quantity: item.qty,
    price: item.price
  }));

  // Create Transaction
  const newTx = {
    id: txId,
    date: dateObj.toISOString(),
    products: txProducts,
    total: total,
    type: "incoming",
    paymentMethod: payMethod,
    customerName: null,
    customerPhone: null,
    description: `Direct Cash Counter Sale (${payMethod.toUpperCase()})`
  };

  // Deduct Inventory Stock
  payCart.forEach(cartItem => {
    const prod = products.find(p => p.id === cartItem.id);
    if (prod) {
      prod.quantity -= cartItem.qty;
    }
  });

  // Save to lists
  transactions.push(newTx);
  setStorage("transactions", transactions);
  setStorage("products", products);

  // Reset & close
  closeModal("modal-pay-sale");
  renderAll();
  logTerminal(`Recorded direct Cash payment sale of Rs. ${total.toFixed(2)}. Reference: ${txId}`, "success");
});

// 2. Record Credit Purchase Sale ("ON CREDIT")
document.getElementById("form-credit-sale").addEventListener("submit", (e) => {
  e.preventDefault();

  if (creditCart.length === 0) {
    alert("Your cart is empty. Add products to execute a credit sale.");
    return;
  }

  const customerName = document.getElementById("credit-customer-name").value.trim();
  const customerPhone = document.getElementById("credit-customer-phone").value.trim();
  const txDate = document.getElementById("credit-date").value;
  const dateObj = new Date(txDate);

  // Basic mobile check
  if (!customerPhone.startsWith("+") && customerPhone.length < 8) {
    alert("Please enter a valid phone number (preferably starting with international code, e.g. +977...)");
    return;
  }

  // Calculate total
  let total = creditCart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Generate Tx ID
  const txId = "tx_" + Date.now().toString(36).substring(4);

  // Form products payload
  const txProducts = creditCart.map(item => ({
    name: item.name,
    quantity: item.qty,
    price: item.price
  }));

  // Create Transaction
  const newTx = {
    id: txId,
    date: dateObj.toISOString(),
    products: txProducts,
    total: total,
    type: "incoming",
    paymentMethod: "credit",
    customerName: customerName,
    customerPhone: customerPhone,
    description: `Credit Sale Booked`
  };

  // Deduct Inventory Stock
  creditCart.forEach(cartItem => {
    const prod = products.find(p => p.id === cartItem.id);
    if (prod) {
      prod.quantity -= cartItem.qty;
    }
  });

  // Update/Create customer credit profile
  let debtor = credits.find(c => c.customerName.toLowerCase() === customerName.toLowerCase());
  const itemsText = creditCart.map(item => `${item.name} x${item.qty}`).join(", ");
  
  if (debtor) {
    debtor.pendingAmount += total;
    // Overwrite phone if they provide a different one, keeping it updated
    debtor.customerPhone = customerPhone;
    debtor.purchases.push({
      date: dateObj.toISOString(),
      items: itemsText,
      amount: total
    });
  } else {
    credits.push({
      customerName: customerName,
      customerPhone: customerPhone,
      pendingAmount: total,
      purchases: [{
        date: dateObj.toISOString(),
        items: itemsText,
        amount: total
      }]
    });
  }

  // Save state
  transactions.push(newTx);
  setStorage("transactions", transactions);
  setStorage("products", products);
  setStorage("credits", credits);

  // Reset & close
  closeModal("modal-credit-sale");
  renderAll();
  logTerminal(`Booked Credit Sale of Rs. ${total.toFixed(2)} for customer ${customerName}. Reference: ${txId}`, "warning");
});

// 3. Add New Product to Inventory
document.getElementById("form-add-product").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("prod-name").value.trim();
  const price = parseFloat(document.getElementById("prod-price").value);
  const qty = parseInt(document.getElementById("prod-qty").value);
  const threshold = parseInt(document.getElementById("prod-threshold").value);

  // Check duplicate
  const exists = products.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    alert("A product with this name already exists. Adjust its stock or edit price instead.");
    return;
  }

  const newProd = {
    id: "prod_" + Date.now().toString(36).substring(5),
    name: name,
    price: price,
    quantity: qty,
    minThreshold: threshold
  };

  products.push(newProd);
  setStorage("products", products);

  closeModal("modal-add-product");
  renderAll();
  logTerminal(`Added new catalog product: ${name} (Price: Rs. ${price.toFixed(2)}, Stock: ${qty})`, "info");
});

// 4. Update Price Modal
window.openEditPriceModal = function(id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  document.getElementById("edit-price-prod-id").value = prod.id;
  document.getElementById("edit-price-display-name").innerText = prod.name;
  document.getElementById("edit-price-value").value = prod.price;

  openModal("modal-edit-price");
};

document.getElementById("form-edit-price").addEventListener("submit", (e) => {
  e.preventDefault();
  const prodId = document.getElementById("edit-price-prod-id").value;
  const newPrice = parseFloat(document.getElementById("edit-price-value").value);

  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  const oldPrice = prod.price;
  prod.price = newPrice;
  
  setStorage("products", products);
  closeModal("modal-edit-price");
  renderAll();
  logTerminal(`Updated product selling price: ${prod.name} (Rs. ${oldPrice.toFixed(2)} → Rs. ${newPrice.toFixed(2)})`, "info");
});

// 5. Restock Product Modal
window.openRestockModal = function(id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  document.getElementById("restock-prod-id").value = prod.id;
  document.getElementById("restock-prod-display-name").innerText = prod.name;
  // Default Unit Cost to current retail selling price * 0.75 as an estimate of wholesale cost
  document.getElementById("restock-unit-cost").value = (prod.price * 0.75).toFixed(2);
  
  openModal("modal-restock-product");
  updateRestockTotal();
};

const restockQtyInput = document.getElementById("restock-qty");
const restockCostInput = document.getElementById("restock-unit-cost");

restockQtyInput.addEventListener("input", updateRestockTotal);
restockCostInput.addEventListener("input", updateRestockTotal);

function updateRestockTotal() {
  const qty = parseInt(restockQtyInput.value) || 0;
  const cost = parseFloat(restockCostInput.value) || 0;
  const total = qty * cost;
  document.getElementById("restock-total-cost").innerText = `Rs. ${total.toFixed(2)}`;
}

document.getElementById("form-restock-product").addEventListener("submit", (e) => {
  e.preventDefault();
  const prodId = document.getElementById("restock-prod-id").value;
  const qty = parseInt(restockQtyInput.value);
  const cost = parseFloat(restockCostInput.value);
  const total = qty * cost;

  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  // Deduct Galla box balance
  // Outgoing transaction
  const txId = "tx_" + Date.now().toString(36).substring(4);
  const newTx = {
    id: txId,
    date: new Date().toISOString(),
    products: [{ name: prod.name, quantity: qty, price: cost }],
    total: total,
    type: "outgoing",
    paymentMethod: "cash",
    customerName: null,
    customerPhone: null,
    description: `Product Restock Expense (${prod.name} x${qty})`
  };

  // Add stock to product
  prod.quantity += qty;

  transactions.push(newTx);
  setStorage("transactions", transactions);
  setStorage("products", products);

  closeModal("modal-restock-product");
  renderAll();
  logTerminal(`Restocked product: ${prod.name} (+${qty} units). Deducted wholesale expense of Rs. ${total.toFixed(2)} from Galla. Reference: ${txId}`, "danger");
});

// 6. Delete Product
window.deleteProduct = function(id) {
  const prod = products.find(p => p.id === id);
  if (!prod) return;

  if (confirm(`Are you sure you want to remove '${prod.name}' from the active inventory catalog?\n(This will not affect historical records in the Galla Register)`)) {
    products = products.filter(p => p.id !== id);
    setStorage("products", products);
    renderAll();
    logTerminal(`Removed product catalog item: ${prod.name}`, "info");
  }
};

// 7. Settle/Repay Credits Modal
window.openSettleCreditModal = function(customerName) {
  const debtor = credits.find(c => c.customerName === customerName);
  if (!debtor) return;

  document.getElementById("settle-customer-name-hidden").value = debtor.customerName;
  document.getElementById("settle-customer-display-name").innerText = debtor.customerName;
  document.getElementById("settle-customer-display-balance").innerText = `Rs. ${debtor.pendingAmount.toFixed(2)}`;
  document.getElementById("settle-amount").value = debtor.pendingAmount.toFixed(2);
  
  const today = new Date().toISOString().split('T')[0];
  document.getElementById("settle-date").value = today;

  openModal("modal-settle-credit");
};

document.getElementById("form-settle-credit").addEventListener("submit", (e) => {
  e.preventDefault();
  const customerName = document.getElementById("settle-customer-name-hidden").value;
  const amount = parseFloat(document.getElementById("settle-amount").value);
  const txDate = document.getElementById("settle-date").value;
  const dateObj = new Date(txDate);

  const debtor = credits.find(c => c.customerName === customerName);
  if (!debtor) return;

  if (amount > debtor.pendingAmount) {
    alert(`Payment amount (Rs. ${amount.toFixed(2)}) is greater than the outstanding debt (Rs. ${debtor.pendingAmount.toFixed(2)}). Please enter a correct repayment amount.`);
    return;
  }

  // Record Incoming Galla transaction (cash repayment)
  const txId = "tx_" + Date.now().toString(36).substring(4);
  const newTx = {
    id: txId,
    date: dateObj.toISOString(),
    products: [],
    total: amount,
    type: "incoming",
    paymentMethod: "cash",
    customerName: debtor.customerName,
    customerPhone: debtor.customerPhone,
    description: `Credit Payment Repayment Received`
  };

  // Deduct pending balance
  debtor.pendingAmount -= amount;

  // If debt is fully cleared, we can keep the customer record but with pendingAmount 0, or clean it.
  // We keep it with pendingAmount 0 to render historic credits properly.

  transactions.push(newTx);
  setStorage("transactions", transactions);
  setStorage("credits", credits);

  closeModal("modal-settle-credit");
  renderAll();
  logTerminal(`Cleared outstanding credit balance by Rs. ${amount.toFixed(2)} for ${debtor.customerName}. Remaining Debt: Rs. ${debtor.pendingAmount.toFixed(2)}. Reference: ${txId}`, "success");
});

// ==========================================
// WHATSAPP API & SIMULATED COMMUNICATIONS
// ==========================================

// Save modified reminder template
document.getElementById("btn-save-template").addEventListener("click", () => {
  const text = document.getElementById("credits-msg-template").value.trim();
  if (!text) {
    alert("Template message cannot be empty.");
    return;
  }
  reminderTemplate = text;
  localStorage.setItem(DB_PREFIX + "template", text);
  alert("Message template saved successfully!");
  logTerminal("Reminder message template updated in local database.", "info");
});

// Format message template with data fields
function formatReminder(template, customerName, pendingAmount) {
  return template
    .replace(/{customer_name}/g, customerName)
    .replace(/{amount}/g, pendingAmount.toFixed(2))
    .replace(/{store_name}/g, "A1 Store");
}

// 1. WhatsApp Web Direct URL Launcher
window.sendSingleWhatsAppReminder = function(customerName) {
  const debtor = credits.find(c => c.customerName === customerName);
  if (!debtor) return;

  const formattedMsg = formatReminder(reminderTemplate, debtor.customerName, debtor.pendingAmount);
  
  // Construct Twilio API Log Terminal output first
  logTwilioAPICall(debtor.customerPhone, formattedMsg);

  // Generate real Web Link for the user to proceed immediately
  // URL formats: api.whatsapp.com/send?phone=...&text=...
  const cleanedPhone = debtor.customerPhone.replace(/[\s\-\(\)]/g, ""); // Strip whitespace, dashes, parens
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${encodeURIComponent(cleanedPhone)}&text=${encodeURIComponent(formattedMsg)}`;
  
  // Open Whatsapp window
  window.open(whatsappUrl, "_blank");
  logTerminal(`Opened WhatsApp link dispatch window for phone ${debtor.customerPhone}.`, "info");
};

// 2. Broadcast reminders to all active debtors
document.getElementById("btn-whatsapp-all").addEventListener("click", () => {
  const debtors = credits.filter(c => c.pendingAmount > 0);
  
  if (debtors.length === 0) {
    alert("There are no customer credit records to notify.");
    return;
  }

  logTerminal(`[Broadcaster] Starting reminder dispatch loop for ${debtors.length} debtors...`, "warning");

  debtors.forEach((debtor, index) => {
    // Stagger the logs to feel realistic
    setTimeout(() => {
      const formattedMsg = formatReminder(reminderTemplate, debtor.customerName, debtor.pendingAmount);
      logTwilioAPICall(debtor.customerPhone, formattedMsg);
      
      if (index === debtors.length - 1) {
        logTerminal(`[Broadcaster] WhatsApp broadcast queue completed successfully. Sent: ${debtors.length} notifications.`, "success");
      }
    }, index * 2000);
  });

  alert(`API Broadcaster started. Sent notifications to ${debtors.length} customer credit accounts. You can inspect the API JSON Console below for logs.`);
});

// Twilio API JSON request simulator
function logTwilioAPICall(phone, message) {
  const timestamp = new Date().toLocaleString();
  const accountSid = "AC8b3c95e17da9d80d2876a445d0701b2a"; // Mock SID
  const messageSid = "SM" + Math.random().toString(36).substring(2, 17) + Math.random().toString(36).substring(2, 17);

  logTerminal(`[${timestamp}] API REQUEST: POST https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, "info");
  
  // Headers log
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Authorization": `Basic AC8b3c95e17da9d80d2876a445d0701b2a:****************`
  };
  logTerminal(`Headers: ${JSON.stringify(headers, null, 2)}`, "muted");

  // Post Payload log
  const payload = {
    "To": phone,
    "From": "whatsapp:+14155238886", // Twilio sandbox whatsapp number
    "Body": message
  };
  logTerminal(`Payload: ${JSON.stringify(payload, null, 2)}`, "warning");

  // Response simulation
  setTimeout(() => {
    logTerminal(`[${new Date().toLocaleString()}] API RESPONSE: 201 Created`, "success");
    const response = {
      "sid": messageSid,
      "date_created": new Date().toUTCString(),
      "date_updated": new Date().toUTCString(),
      "date_sent": null,
      "account_sid": accountSid,
      "to": payload.To,
      "from": payload.From,
      "body": payload.Body,
      "status": "queued",
      "direction": "outbound-api",
      "api_version": "2010-04-01",
      "price": "0.005",
      "price_unit": "USD",
      "error_code": null,
      "error_message": null
    };
    logTerminal(`Response Body: ${JSON.stringify(response, null, 2)}`, "success");
    // Scroll terminal to bottom
    const term = document.getElementById("terminal-api-logs");
    term.scrollTop = term.scrollHeight;
  }, 1000);
}

// Developer Terminal controls
const terminalLogs = document.getElementById("terminal-api-logs");
document.getElementById("btn-clear-terminal").addEventListener("click", () => {
  terminalLogs.innerHTML = `<div class="log-line text-muted">[${new Date().toLocaleString()}] Developer logs cleared.</div>`;
});

function logTerminal(message, type = "muted") {
  const line = document.createElement("div");
  line.className = `log-line text-${type}`;
  line.innerText = message;
  terminalLogs.appendChild(line);
  terminalLogs.scrollTop = terminalLogs.scrollHeight;
}

// ==========================================
// FILTER SEARCH CONTROLS ON ENTER & BUTTONS
// ==========================================
document.getElementById("galla-search").addEventListener("input", renderGallaTable);
document.getElementById("galla-filter-type").addEventListener("change", renderGallaTable);
document.getElementById("galla-filter-method").addEventListener("change", renderGallaTable);

document.getElementById("galla-btn-reset-filters").addEventListener("click", () => {
  document.getElementById("galla-search").value = "";
  document.getElementById("galla-filter-type").value = "all";
  document.getElementById("galla-filter-method").value = "all";
  renderGallaTable();
});

document.getElementById("inventory-search-input").addEventListener("input", renderInventoryTable);

// ==========================================
// HELPER UTILITIES
// ==========================================
function truncateString(str, num) {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + "...";
}
