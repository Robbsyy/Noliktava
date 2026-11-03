const STORAGE_KEY = 'warehouse_app_state';

const ROLE_LABELS = {
  admin: 'Administrators',
  warehouse_worker: 'Noliktavas darbinieks',
  shelf_organizer: 'Plauktu kārtotājs'
};

const ROLE_ACCESS = {
  admin: ['dashboard', 'users', 'products', 'orders', 'locations', 'reports'],
  warehouse_worker: ['dashboard', 'products', 'orders', 'reports'],
  shelf_organizer: ['dashboard', 'products', 'locations', 'reports']
};

const DEFAULT_STATE = {
  users: [
    { id: 'u-admin', fullName: 'Anna Administratore', username: 'admin', password: 'admin123', role: 'admin' },
    { id: 'u-worker', fullName: 'Jānis Darbinieks', username: 'warehouse', password: 'worker123', role: 'warehouse_worker' },
    { id: 'u-shelf', fullName: 'Mārtiņš Kārtotājs', username: 'shelf', password: 'shelf123', role: 'shelf_organizer' }
  ],
  products: [
    { id: 'p1', sku: 'SKU-1001', name: 'Klēpjdators', category: 'IT', quantity: 18, price: 999.99, warehouse: 'Noliktava A', location: 'A1-02' },
    { id: 'p2', sku: 'SKU-1002', name: 'Printeris', category: 'IT', quantity: 6, price: 249.5, warehouse: 'Noliktava A', location: 'B2-01' },
    { id: 'p3', sku: 'SKU-2003', name: 'Papīrs', category: 'Kancelejas preces', quantity: 120, price: 12.2, warehouse: 'Noliktava B', location: 'C4-07' }
  ],
  orders: [
    { id: 'o1', orderNumber: 'ORD-1001', customer: 'Rīgas Centrs', quantity: 4, status: 'pending', createdAt: new Date().toISOString() },
    { id: 'o2', orderNumber: 'ORD-1002', customer: 'SIA Optima', quantity: 12, status: 'packed', createdAt: new Date(Date.now() - 3600000).toISOString() }
  ],
  locations: [
    { id: 'l1', productId: 'p1', aisle: 'A', rack: '1', bin: '02', updatedAt: new Date().toISOString() },
    { id: 'l2', productId: 'p2', aisle: 'B', rack: '2', bin: '01', updatedAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'l3', productId: 'p3', aisle: 'C', rack: '4', bin: '07', updatedAt: new Date(Date.now() - 1800000).toISOString() }
  ],
  session: null
};

const state = loadState();
const app = { currentUser: null };

const loginForm = document.getElementById('loginForm');
const authMessage = document.getElementById('authMessage');
const authView = document.getElementById('authView');
const appView = document.getElementById('appView');
const welcomeUser = document.getElementById('welcomeUser');
const logoutBtn = document.getElementById('logoutBtn');
const navButtons = [...document.querySelectorAll('.nav-btn')];
const sections = [...document.querySelectorAll('.content-section')];
const reportOutput = document.getElementById('reportOutput');

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { ...cloneDefaultState(), ...saved };
  } catch (error) {
    return cloneDefaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.style.color = isError ? '#d9534f' : '#1d2433';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function validateText(value, label, minLength) {
  const text = String(value || '').trim();
  if (text.length < minLength) {
    throw new Error(`${label} ir obligāts un jāsatur vismaz ${minLength} rakstzīmes.`);
  }
  return text;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('lv-LV');
}

function getCurrentUser() {
  if (!state.session) return null;
  return state.users.find(user => user.id === state.session) || null;
}

function canAccess(sectionName) {
  if (!app.currentUser) return false;
  return (ROLE_ACCESS[app.currentUser.role] || []).includes(sectionName);
}

function populateLocationOptions() {
  const select = document.getElementById('locationProduct');
  select.innerHTML = state.products
    .map(product => `<option value="${product.id}">${escapeHtml(product.name)} (${escapeHtml(product.sku)})</option>`)
    .join('');
}

function renderNavigation() {
  navButtons.forEach(button => {
    const sectionName = button.dataset.section;
    const allowed = app.currentUser ? canAccess(sectionName) : false;
    button.classList.toggle('hidden', !allowed);
    button.classList.toggle('active', allowed && sectionName === 'dashboard');
  });
}

function showSection(sectionName) {
  if (!app.currentUser || !canAccess(sectionName)) {
    setMessage('Jums nav piekļuves šai sadaļai.', true);
    return;
  }

  navButtons.forEach(button => {
    button.classList.toggle('active', button.dataset.section === sectionName);
  });

  sections.forEach(section => {
    const active = section.id === `${sectionName}Section`;
    section.classList.toggle('hidden', !active);
  });
}

function renderDashboard() {
  const cards = document.getElementById('dashboardCards');
  const activity = document.getElementById('activityList');

  cards.innerHTML = `
    <div class="stat-card"><span class="label">Lietotāji</span><strong>${state.users.length}</strong></div>
    <div class="stat-card"><span class="label">Preces</span><strong>${state.products.length}</strong></div>
    <div class="stat-card"><span class="label">Pasūtījumi</span><strong>${state.orders.length}</strong></div>
    <div class="stat-card"><span class="label">Izvietojumi</span><strong>${state.locations.length}</strong></div>
  `;

  const lowStock = state.products.filter(product => product.quantity <= 10).length;
  const pendingOrders = state.orders.filter(order => order.status === 'pending').length;

  activity.innerHTML = `
    <li>Preces ar zemu daudzumu: ${lowStock}</li>
    <li>Gaidoši pasūtījumi: ${pendingOrders}</li>
    <li>Lietotāju skaits sistēmā: ${state.users.length}</li>
  `;
}

function renderUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  if (!canAccess('users')) {
    tbody.innerHTML = '';
    return;
  }

  tbody.innerHTML = state.users.map(user => `
    <tr>
      <td>${escapeHtml(user.fullName)}</td>
      <td>${escapeHtml(user.username)}</td>
      <td>${escapeHtml(ROLE_LABELS[user.role] || user.role)}</td>
      <td>
        <div class="action-row">
          <button class="action-btn edit" type="button" data-edit-user="${user.id}">Rediģēt</button>
          <button class="action-btn delete" type="button" data-delete-user="${user.id}">Dzēst</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderProductsTable() {
  const tbody = document.getElementById('productsTableBody');
  if (!canAccess('products')) {
    tbody.innerHTML = '';
    return;
  }

  tbody.innerHTML = state.products.map(product => `
    <tr>
      <td>${escapeHtml(product.sku)}</td>
      <td>${escapeHtml(product.name)}</td>
      <td>${escapeHtml(product.category)}</td>
      <td>${escapeHtml(product.quantity)}</td>
      <td>${escapeHtml(product.price.toFixed(2))} €</td>
      <td>${escapeHtml(product.location)}</td>
      <td>
        <div class="action-row">
          <button class="action-btn edit" type="button" data-edit-product="${product.id}">Rediģēt</button>
          <button class="action-btn delete" type="button" data-delete-product="${product.id}">Dzēst</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderOrdersTable() {
  const tbody = document.getElementById('ordersTableBody');
  if (!canAccess('orders')) {
    tbody.innerHTML = '';
    return;
  }

  tbody.innerHTML = state.orders.map(order => `
    <tr>
      <td>${escapeHtml(order.orderNumber)}</td>
      <td>${escapeHtml(order.customer)}</td>
      <td>${escapeHtml(order.quantity)}</td>
      <td><span class="status-pill">${escapeHtml(order.status)}</span></td>
      <td>${escapeHtml(formatDate(order.createdAt))}</td>
      <td>
        <div class="action-row">
          <button class="action-btn edit" type="button" data-edit-order="${order.id}">Rediģēt</button>
          <button class="action-btn delete" type="button" data-delete-order="${order.id}">Dzēst</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderLocationsTable() {
  const tbody = document.getElementById('locationsTableBody');
  if (!canAccess('locations')) {
    tbody.innerHTML = '';
    return;
  }

  tbody.innerHTML = state.locations.map(location => {
    const product = state.products.find(item => item.id === location.productId);
    return `
      <tr>
        <td>${escapeHtml(product ? product.name : 'Nezināma prece')}</td>
        <td>${escapeHtml(location.aisle)}</td>
        <td>${escapeHtml(location.rack)}</td>
        <td>${escapeHtml(location.bin)}</td>
        <td>${escapeHtml(formatDate(location.updatedAt))}</td>
        <td>
          <div class="action-row">
            <button class="action-btn edit" type="button" data-edit-location="${location.id}">Rediģēt</button>
            <button class="action-btn delete" type="button" data-delete-location="${location.id}">Dzēst</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderReport() {
  const output = document.getElementById('reportOutput');
  if (!canAccess('reports')) {
    output.innerHTML = '<p>Jums nav piekļuves pārskatiem.</p>';
    return;
  }

  const lowStock = state.products.filter(product => product.quantity <= 10).length;
  const delivered = state.orders.filter(order => order.status === 'delivered').length;

  output.innerHTML = `
    <h3>Noliktavas darbības pārskats</h3>
    <p><strong>Lietotāju skaits:</strong> ${state.users.length}</p>
    <p><strong>Preču skaits:</strong> ${state.products.length}</p>
    <p><strong>Pasūtījumu skaits:</strong> ${state.orders.length}</p>
    <p><strong>Preces ar zemu daudzumu:</strong> ${lowStock}</p>
    <p><strong>Izpildītie pasūtījumi:</strong> ${delivered}</p>
  `;
}

function renderAll() {
  populateLocationOptions();
  renderNavigation();
  renderDashboard();
  renderUsersTable();
  renderProductsTable();
  renderOrdersTable();
  renderLocationsTable();
  renderReport();
}

function loginUser(username, password) {
  const user = state.users.find(item => item.username.toLowerCase() === username.toLowerCase() && item.password === password);
  if (!user) {
    throw new Error('Nederīgs lietotājvārds vai parole.');
  }

  app.currentUser = user;
  state.session = user.id;
  saveState();

  welcomeUser.textContent = `${user.fullName} · ${ROLE_LABELS[user.role]}`;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  showSection('dashboard');
  renderAll();
}

function logoutUser() {
  app.currentUser = null;
  state.session = null;
  saveState();

  authView.classList.remove('hidden');
  appView.classList.add('hidden');
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  setMessage('');
}

function fillUserForm(user) {
  document.getElementById('userId').value = user.id;
  document.getElementById('userFullName').value = user.fullName;
  document.getElementById('userUsername').value = user.username;
  document.getElementById('userPassword').value = '';
  document.getElementById('userRole').value = user.role;
}

function fillProductForm(product) {
  document.getElementById('productId').value = product.id;
  document.getElementById('productSku').value = product.sku;
  document.getElementById('productName').value = product.name;
  document.getElementById('productCategory').value = product.category;
  document.getElementById('productQuantity').value = product.quantity;
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productWarehouse').value = product.warehouse;
  document.getElementById('productLocation').value = product.location;
}

function fillOrderForm(order) {
  document.getElementById('orderId').value = order.id;
  document.getElementById('orderCustomer').value = order.customer;
  document.getElementById('orderNumber').value = order.orderNumber;
  document.getElementById('orderStatus').value = order.status;
  document.getElementById('orderQuantity').value = order.quantity;
}

function fillLocationForm(location) {
  document.getElementById('locationId').value = location.id;
  document.getElementById('locationProduct').value = location.productId;
  document.getElementById('locationAisle').value = location.aisle;
  document.getElementById('locationRack').value = location.rack;
  document.getElementById('locationBin').value = location.bin;
}

function resetUserForm() {
  document.getElementById('userForm').reset();
  document.getElementById('userId').value = '';
}

function resetProductForm() {
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
}

function resetOrderForm() {
  document.getElementById('orderForm').reset();
  document.getElementById('orderId').value = '';
}

function resetLocationForm() {
  document.getElementById('locationForm').reset();
  document.getElementById('locationId').value = '';
}

loginForm.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const username = validateText(document.getElementById('username').value, 'Lietotājvārds', 3);
    const password = validateText(document.getElementById('password').value, 'Parole', 6);
    loginUser(username, password);
    setMessage('');
  } catch (error) {
    setMessage(error.message, true);
  }
});

logoutBtn.addEventListener('click', logoutUser);

navButtons.forEach(button => {
  button.addEventListener('click', () => showSection(button.dataset.section));
});

document.addEventListener('click', event => {
  const editUser = event.target.closest('[data-edit-user]');
  const deleteUser = event.target.closest('[data-delete-user]');
  const editProduct = event.target.closest('[data-edit-product]');
  const deleteProduct = event.target.closest('[data-delete-product]');
  const editOrder = event.target.closest('[data-edit-order]');
  const deleteOrder = event.target.closest('[data-delete-order]');
  const editLocation = event.target.closest('[data-edit-location]');
  const deleteLocation = event.target.closest('[data-delete-location]');

  if (editUser) {
    const user = state.users.find(item => item.id === editUser.dataset.editUser);
    if (user) {
      fillUserForm(user);
      showSection('users');
    }
  }

  if (deleteUser && canAccess('users')) {
    state.users = state.users.filter(item => item.id !== deleteUser.dataset.deleteUser);
    saveState();
    renderAll();
  }

  if (editProduct) {
    const product = state.products.find(item => item.id === editProduct.dataset.editProduct);
    if (product) {
      fillProductForm(product);
      showSection('products');
    }
  }

  if (deleteProduct && canAccess('products')) {
    state.products = state.products.filter(item => item.id !== deleteProduct.dataset.deleteProduct);
    saveState();
    renderAll();
  }

  if (editOrder) {
    const order = state.orders.find(item => item.id === editOrder.dataset.editOrder);
    if (order) {
      fillOrderForm(order);
      showSection('orders');
    }
  }

  if (deleteOrder && canAccess('orders')) {
    state.orders = state.orders.filter(item => item.id !== deleteOrder.dataset.deleteOrder);
    saveState();
    renderAll();
  }

  if (editLocation) {
    const location = state.locations.find(item => item.id === editLocation.dataset.editLocation);
    if (location) {
      fillLocationForm(location);
      showSection('locations');
    }
  }

  if (deleteLocation && canAccess('locations')) {
    state.locations = state.locations.filter(item => item.id !== deleteLocation.dataset.deleteLocation);
    saveState();
    renderAll();
  }
});

document.getElementById('userForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!canAccess('users')) {
    setMessage('Jums nav atļauts pārvaldīt lietotājus.', true);
    return;
  }

  try {
    const id = document.getElementById('userId').value;
    const fullName = validateText(document.getElementById('userFullName').value, 'Pilnais vārds', 2);
    const username = validateText(document.getElementById('userUsername').value, 'Lietotājvārds', 3);
    const role = document.getElementById('userRole').value;
    const password = document.getElementById('userPassword').value.trim();

    if (state.users.some(user => user.username.toLowerCase() === username.toLowerCase() && user.id !== id)) {
      throw new Error('Šāds lietotājvārds jau pastāv.');
    }

    if (!id) {
      if (password.length < 6) {
        throw new Error('Parolei jābūt vismaz 6 rakstzīmēm.');
      }
      state.users.push({ id: makeId('u'), fullName, username, password, role });
    } else {
      const user = state.users.find(item => item.id === id);
      if (!user) throw new Error('Lietotājs netika atrasts.');
      user.fullName = fullName;
      user.username = username;
      user.role = role;
      if (password) user.password = password;
    }

    saveState();
    document.getElementById('userForm').reset();
    renderAll();
    setMessage('Lietotājs saglabāts.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('productForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!canAccess('products')) {
    setMessage('Jums nav atļauts pārvaldīt preces.', true);
    return;
  }

  try {
    const id = document.getElementById('productId').value;
    const sku = validateText(document.getElementById('productSku').value, 'SKU', 3);
    const name = validateText(document.getElementById('productName').value, 'Nosaukums', 2);
    const category = validateText(document.getElementById('productCategory').value, 'Kategorija', 2);
    const quantity = Number(document.getElementById('productQuantity').value);
    const price = Number(document.getElementById('productPrice').value);
    const warehouse = validateText(document.getElementById('productWarehouse').value, 'Noliktava', 2);
    const location = validateText(document.getElementById('productLocation').value, 'Atrašanās vieta', 2);

    if (Number.isNaN(quantity) || quantity < 0) throw new Error('Daudzumam jābūt ne-negatīvam skaitlim.');
    if (Number.isNaN(price) || price <= 0) throw new Error('Cenai jābūt lielākai par nulli.');

    const product = {
      id: id || makeId('p'),
      sku,
      name,
      category,
      quantity,
      price,
      warehouse,
      location
    };

    if (id) {
      const existing = state.products.find(item => item.id === id);
      if (!existing) throw new Error('Prece netika atrasta.');
      Object.assign(existing, product);
    } else {
      state.products.push(product);
    }

    saveState();
    document.getElementById('productForm').reset();
    renderAll();
    setMessage('Prece saglabāta.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('orderForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!canAccess('orders')) {
    setMessage('Jums nav atļauts pārvaldīt pasūtījumus.', true);
    return;
  }

  try {
    const id = document.getElementById('orderId').value;
    const customer = validateText(document.getElementById('orderCustomer').value, 'Klients', 2);
    const orderNumber = validateText(document.getElementById('orderNumber').value, 'Pasūtījuma numurs', 2);
    const status = document.getElementById('orderStatus').value;
    const quantity = Number(document.getElementById('orderQuantity').value);

    if (Number.isNaN(quantity) || quantity <= 0) throw new Error('Preču daudzumam jābūt lielākam par nulli.');

    const record = {
      id: id || makeId('o'),
      orderNumber,
      customer,
      quantity,
      status,
      createdAt: id ? (state.orders.find(item => item.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString()
    };

    if (id) {
      const existing = state.orders.find(item => item.id === id);
      if (!existing) throw new Error('Pasūtījums netika atrasts.');
      Object.assign(existing, record);
    } else {
      state.orders.push(record);
    }

    saveState();
    document.getElementById('orderForm').reset();
    renderAll();
    setMessage('Pasūtījums saglabāts.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('locationForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!canAccess('locations')) {
    setMessage('Jums nav atļauts pārvaldīt izvietojumus.', true);
    return;
  }

  try {
    const id = document.getElementById('locationId').value;
    const productId = document.getElementById('locationProduct').value;
    const aisle = validateText(document.getElementById('locationAisle').value, 'Aile', 1);
    const rack = validateText(document.getElementById('locationRack').value, 'Plaukts', 1);
    const bin = validateText(document.getElementById('locationBin').value, 'Nodalījums', 1);

    const record = {
      id: id || makeId('l'),
      productId,
      aisle,
      rack,
      bin,
      updatedAt: new Date().toISOString()
    };

    if (id) {
      const existing = state.locations.find(item => item.id === id);
      if (!existing) throw new Error('Izvietojums netika atrasts.');
      Object.assign(existing, record);
    } else {
      state.locations.push(record);
    }

    saveState();
    document.getElementById('locationForm').reset();
    renderAll();
    setMessage('Izvietojums saglabāts.');
  } catch (error) {
    setMessage(error.message, true);
  }
});

document.getElementById('cancelUserEdit').addEventListener('click', resetUserForm);
document.getElementById('cancelProductEdit').addEventListener('click', resetProductForm);
document.getElementById('cancelOrderEdit').addEventListener('click', resetOrderForm);
document.getElementById('cancelLocationEdit').addEventListener('click', resetLocationForm);

document.getElementById('generateSummaryReport').addEventListener('click', () => {
  if (!canAccess('reports')) {
    setMessage('Jums nav atļauts ģenerēt pārskatus.', true);
    return;
  }
  renderReport();
});

app.currentUser = getCurrentUser();
if (app.currentUser) {
  welcomeUser.textContent = `${app.currentUser.fullName} · ${ROLE_LABELS[app.currentUser.role]}`;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
} else {
  appView.classList.add('hidden');
  authView.classList.remove('hidden');
}

renderAll();
