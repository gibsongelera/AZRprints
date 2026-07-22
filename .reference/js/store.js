/**
 * localStorage persistence with seed merge for demo data
 * Live sync: same-tab subscribers + cross-tab storage/BroadcastChannel
 */
(function (global) {
  var KEY = 'printport_data';
  var CHANNEL = 'printport_sync';
  var initialized = false;
  var cached = null;
  var listeners = [];
  var suppressBroadcast = false;
  var bc = null;

  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = function () {
      reloadFromStorage(true);
    };
  } catch (_) {}

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function notify() {
    var snapshot = cached;
    listeners.slice().forEach(function (fn) {
      try { fn(snapshot); } catch (_) {}
    });
    if (!suppressBroadcast && bc) {
      try { bc.postMessage({ type: 'changed', at: Date.now() }); } catch (_) {}
    }
  }

  function save(data) {
    cached = data;
    localStorage.setItem(KEY, JSON.stringify(data));
    notify();
  }

  /** Re-read localStorage into memory (other tabs / visibility). */
  function reloadFromStorage(fromRemote) {
    var existing = load();
    if (!existing) return cached;
    if (fromRemote) suppressBroadcast = true;
    cached = migrateData(existing);
    initialized = true;
    notify();
    suppressBroadcast = false;
    return cached;
  }

  function subscribe(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function unsubscribe() {
      listeners = listeners.filter(function (f) { return f !== fn; });
    };
  }

  // Other tabs writing localStorage
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) reloadFromStorage(true);
    });
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

  /** One-time / on-load migration: strip credits, nest payment, backfill orders */
  function migrateData(data) {
    if (!data) return data;

    (data.users || []).forEach(function (u) {
      delete u.credits;
      delete u.gcash;
      delete u.maya;
    });

    delete data.paymentMethods;

    var s = data.settings || (data.settings = {});
    if (!s.payment) {
      s.payment = {
        channel: 'instapay_gcash',
        mobileNumber: s.gcashNumber || '',
        accountName: s.paymentAccountName || s.shopName || '',
        qrImage: s.paymentQr || '',
        updatedAt: s.paymentUpdatedAt || '',
      };
    } else {
      s.payment.channel = s.payment.channel || 'instapay_gcash';
      if (!s.payment.mobileNumber && s.gcashNumber) s.payment.mobileNumber = s.gcashNumber;
      if (!s.payment.accountName && (s.paymentAccountName || s.shopName)) {
        s.payment.accountName = s.paymentAccountName || s.shopName;
      }
      if (!s.payment.qrImage && s.paymentQr) s.payment.qrImage = s.paymentQr;
      if (!s.payment.updatedAt && s.paymentUpdatedAt) s.payment.updatedAt = s.paymentUpdatedAt;
    }
    delete s.gcashNumber;
    delete s.mayaNumber;
    delete s.paymentQr;
    delete s.paymentAccountName;
    delete s.paymentUpdatedAt;

    (data.orders || []).forEach(function (o) {
      if (!o.paymentChannel) {
        o.paymentChannel = 'instapay_gcash';
      }
      if (!o.paymentStatus) {
        if (o.receipt) o.paymentStatus = 'receipt_submitted';
        else if (o.status === 'completed' || o.status === 'in_progress') o.paymentStatus = 'verified';
        else o.paymentStatus = 'legacy';
      }
      if (o.payment && !o.paymentNumber) {
        // keep historical label only as channel hint; drop unused string later
      }
      delete o.payment;
    });

    return data;
  }

  function mergeWithSeed(existing, seed) {
    existing.users = mergeUsers(seed.users, existing.users);
    existing.pricing = Object.assign({}, seed.pricing, existing.pricing);
    existing.settings = Object.assign({}, seed.settings, existing.settings);
    if (seed.settings && seed.settings.payment) {
      existing.settings.payment = Object.assign(
        {},
        seed.settings.payment,
        (existing.settings && existing.settings.payment) || {}
      );
    }
    existing.orders = mergeById(seed.orders, existing.orders);
    existing.notifications = mergeNotifications(seed.notifications, existing.notifications);
    if (seed.brand) existing.brand = Object.assign({}, seed.brand, existing.brand || {});
    delete existing.paymentMethods;
    return migrateData(existing);
  }

  function init() {
    if (initialized) return cached;
    var existing = load();
    var seed = global.PrintPortSeed;
    if (!existing && seed) {
      existing = migrateData(JSON.parse(JSON.stringify(seed)));
      save(existing);
    } else if (existing && seed) {
      mergeWithSeed(existing, seed);
      save(existing);
    } else if (existing) {
      migrateData(existing);
      save(existing);
    }
    cached = existing || {};
    initialized = true;
    return cached;
  }

  function get() {
    init();
    return cached;
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
    var next = Object.assign({}, data.users[idx], patch);
    delete next.credits;
    delete next.gcash;
    delete next.maya;
    data.users[idx] = next;
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
    delete session.credits;
    sessionStorage.setItem(PrintPortAuth.SESSION_KEY, JSON.stringify(session));
  }

  function getOrders(userId) {
    var orders = get().orders || [];
    if (!userId) return orders;
    return orders.filter(function (o) { return o.userId === userId; });
  }

  function addOrder(order) {
    var data = get();
    var pay = getPaymentSettings();
    data.orders = data.orders || [];
    var enriched = Object.assign({}, order, {
      paymentChannel: order.paymentChannel || 'instapay_gcash',
      paymentNumber: order.paymentNumber != null ? order.paymentNumber : (pay.mobileNumber || ''),
      paymentAccountName: order.paymentAccountName != null ? order.paymentAccountName : (pay.accountName || ''),
      paymentStatus: order.paymentStatus || (order.receipt ? 'receipt_submitted' : 'legacy'),
    });
    delete enriched.payment;
    data.orders.unshift(enriched);
    try {
      save(data);
    } catch (e) {
      data.orders.shift();
      return null;
    }
    return enriched;
  }

  function updateOrder(id, patch) {
    var data = get();
    var idx = (data.orders || []).findIndex(function (o) { return o.id === id; });
    if (idx === -1) return null;
    data.orders[idx] = Object.assign({}, data.orders[idx], patch);
    delete data.orders[idx].payment;
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

  // ---- Payment settings "API" ----------------------------------------------
  var QR_MAX_BYTES = 1.5 * 1024 * 1024;
  var QR_DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/i;

  function getPaymentSettings() {
    var s = getSettings();
    var p = s.payment || {};
    var qrImage = p.qrImage || s.paymentQr || '';
    var mobileNumber = p.mobileNumber || s.gcashNumber || '';
    var accountName = p.accountName || s.paymentAccountName || s.shopName || '';
    return {
      channel: p.channel || 'instapay_gcash',
      qrImage: qrImage,
      mobileNumber: mobileNumber,
      accountName: accountName,
      updatedAt: p.updatedAt || s.paymentUpdatedAt || '',
      isConfigured: !!(mobileNumber && qrImage),
    };
  }

  function updatePaymentSettings(patch) {
    patch = patch || {};
    var data = get();
    var s = data.settings || (data.settings = {});
    var p = Object.assign({}, s.payment || {
      channel: 'instapay_gcash',
      mobileNumber: '',
      accountName: '',
      qrImage: '',
      updatedAt: '',
    });

    if (patch.mobileNumber != null || patch.gcashNumber != null) {
      var num = String(patch.mobileNumber != null ? patch.mobileNumber : patch.gcashNumber).trim();
      if (!num) return { ok: false, error: 'InstaPay / GCash number is required.' };
      p.mobileNumber = num;
    }
    if (patch.accountName != null) p.accountName = String(patch.accountName).trim();

    if (patch.qrImage != null) {
      var img = String(patch.qrImage);
      if (img) {
        if (!QR_DATA_URL_RE.test(img)) {
          return { ok: false, error: 'QR must be a PNG, JPG, WEBP or GIF image.' };
        }
        if (img.length > QR_MAX_BYTES) {
          return { ok: false, error: 'QR image is too large (max ~1MB).' };
        }
      }
      p.qrImage = img;
    }

    p.channel = 'instapay_gcash';
    p.updatedAt = new Date().toISOString();
    s.payment = p;
    // clear legacy flat keys
    delete s.gcashNumber;
    delete s.mayaNumber;
    delete s.paymentQr;
    delete s.paymentAccountName;
    delete s.paymentUpdatedAt;

    try {
      save(data);
    } catch (e) {
      return { ok: false, error: 'Could not save (storage full). Use a smaller image.' };
    }
    return { ok: true, settings: getPaymentSettings() };
  }

  function reset() {
    if (!global.PrintPortSeed) return;
    var fresh = migrateData(JSON.parse(JSON.stringify(PrintPortSeed)));
    save(fresh);
    initialized = true;
    return fresh;
  }

  global.PrintPortStore = {
    KEY: KEY,
    init: init,
    get: get,
    reload: function () { return reloadFromStorage(false); },
    subscribe: subscribe,
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
    getPaymentSettings: getPaymentSettings,
    updatePaymentSettings: updatePaymentSettings,
    reset: reset,
    syncSessionFromUser: syncSessionFromUser,
  };
})(window);
