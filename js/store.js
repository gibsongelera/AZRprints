/**
 * localStorage persistence with seed merge for demo data
 */
(function (global) {
  var KEY = 'printport_data';
  var initialized = false;
  var cached = null;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function save(data) {
    cached = data;
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function mergeUsers(seedUsers, savedUsers) {
    savedUsers = savedUsers || [];
    return (seedUsers || []).map(function (seed) {
      var saved = savedUsers.find(function (u) { return u.id === seed.id; });
      return saved ? Object.assign({}, seed, saved, { password: seed.password }) : Object.assign({}, seed);
    }).concat(savedUsers.filter(function (u) {
      return !(seedUsers || []).some(function (s) { return s.id === u.id; });
    }));
  }

  function mergeById(seedItems, savedItems) {
    var map = {};
    (seedItems || []).forEach(function (item) { map[item.id] = Object.assign({}, item); });
    (savedItems || []).forEach(function (item) { map[item.id] = Object.assign({}, map[item.id] || {}, item); });
    return Object.keys(map).map(function (id) { return map[id]; }).sort(function (a, b) {
      return String(b.date || b.id).localeCompare(String(a.date || a.id));
    });
  }

  function mergeNotifications(seedItems, savedItems) {
    var map = {};
    (seedItems || []).forEach(function (item) { map[item.id] = Object.assign({}, item); });
    (savedItems || []).forEach(function (item) { map[item.id] = Object.assign({}, map[item.id] || {}, item); });
    return Object.keys(map).map(function (id) { return map[id]; }).sort(function (a, b) {
      return Number(b.id) - Number(a.id);
    });
  }

  function mergeWithSeed(existing, seed) {
    existing.users = mergeUsers(seed.users, existing.users);
    existing.pricing = Object.assign({}, seed.pricing, existing.pricing);
    existing.settings = Object.assign({}, seed.settings, existing.settings);
    existing.paymentMethods = existing.paymentMethods || seed.paymentMethods;
    existing.orders = mergeById(seed.orders, existing.orders);
    existing.notifications = mergeNotifications(seed.notifications, existing.notifications);
    if (seed.brand) existing.brand = Object.assign({}, seed.brand, existing.brand || {});
    return existing;
  }

  function init() {
    if (initialized) return cached;
    var existing = load();
    var seed = global.PrintPortSeed;
    if (!existing && seed) {
      existing = JSON.parse(JSON.stringify(seed));
      save(existing);
    } else if (existing && seed) {
      mergeWithSeed(existing, seed);
      save(existing);
    }
    cached = existing || {};
    initialized = true;
    return cached;
  }

  function get() {
    return init();
  }

  function getBrand() {
    var data = get();
    return data.brand || (global.PrintPortSeed && PrintPortSeed.brand) || { name: "AZR PRINT'S", tagline: 'ZPPSU Printing Services' };
  }

  function getSettings() {
    return get().settings || {};
  }

  function getUser(id) {
    return (get().users || []).find(function (u) { return u.id === id; });
  }

  function updateUser(id, patch) {
    var data = get();
    var idx = (data.users || []).findIndex(function (u) { return u.id === id; });
    if (idx === -1) return null;
    data.users[idx] = Object.assign({}, data.users[idx], patch);
    save(data);
    syncSessionFromUser(data.users[idx]);
    return data.users[idx];
  }

  function syncSessionFromUser(user) {
    if (!global.PrintPortAuth) return;
    var session = PrintPortAuth.getSession();
    if (!session || session.id !== user.id) return;
    session.name = user.name;
    session.email = user.email;
    if (user.studentId) session.studentId = user.studentId;
    if (user.college) session.college = user.college;
    if (user.credits != null) session.credits = user.credits;
    sessionStorage.setItem(PrintPortAuth.SESSION_KEY, JSON.stringify(session));
  }

  function getOrders(userId) {
    var orders = get().orders || [];
    if (!userId) return orders;
    return orders.filter(function (o) { return o.userId === userId; });
  }

  function addOrder(order) {
    var data = get();
    data.orders = data.orders || [];
    data.orders.unshift(order);
    save(data);
    return order;
  }

  function updateOrder(id, patch) {
    var data = get();
    var idx = (data.orders || []).findIndex(function (o) { return o.id === id; });
    if (idx === -1) return null;
    data.orders[idx] = Object.assign({}, data.orders[idx], patch);
    save(data);
    return data.orders[idx];
  }

  function getPricing() {
    return get().pricing || {};
  }

  function updatePricing(patch) {
    var data = get();
    data.pricing = Object.assign({}, data.pricing, patch);
    save(data);
    return data.pricing;
  }

  function updateSettings(patch) {
    var data = get();
    data.settings = Object.assign({}, data.settings, patch);
    save(data);
    return data.settings;
  }

  function reset() {
    if (!global.PrintPortSeed) return;
    var fresh = JSON.parse(JSON.stringify(PrintPortSeed));
    save(fresh);
    initialized = true;
    return fresh;
  }

  global.PrintPortStore = {
    KEY: KEY,
    init: init,
    get: get,
    getBrand: getBrand,
    getSettings: getSettings,
    getUser: getUser,
    updateUser: updateUser,
    getOrders: getOrders,
    addOrder: addOrder,
    updateOrder: updateOrder,
    getPricing: getPricing,
    updatePricing: updatePricing,
    updateSettings: updateSettings,
    reset: reset,
    syncSessionFromUser: syncSessionFromUser,
  };
})(window);
