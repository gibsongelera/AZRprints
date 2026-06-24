/**
 * PrintPort demo authentication – synced with seed/store
 */
(function (global) {
  var SESSION_KEY = 'printport_session';

  function getAccounts() {
    var seedUsers = global.PrintPortSeed ? PrintPortSeed.users : [];
    if (!global.PrintPortStore) return seedUsers;
    PrintPortStore.init();
    var stored = PrintPortStore.get().users || [];
    return seedUsers.map(function (seed) {
      var saved = stored.find(function (u) { return u.id === seed.id; });
      return saved ? Object.assign({}, seed, saved, { password: seed.password }) : seed;
    });
  }

  function initials(name) {
    return (name || '').split(/\s+/).map(function (p) { return p[0] || ''; }).join('').slice(0, 2).toUpperCase();
  }

  function loginPath() {
    var path = window.location.pathname;
    if (path.includes('/admin/') || path.includes('/user/')) return '../login.html';
    return 'login.html';
  }

  function getSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function enrichSession(account) {
    return {
      id: account.id,
      email: account.email,
      role: account.role,
      name: account.name,
      redirect: account.redirect,
      studentId: account.studentId,
      staffId: account.staffId,
      college: account.college,
      department: account.department,
      credits: account.credits,
      phone: account.phone,
    };
  }

  function login(email, password) {
    var emailNorm = (email || '').trim().toLowerCase();
    var account = getAccounts().find(function (a) {
      return a.email.toLowerCase() === emailNorm && a.password === password;
    });
    if (!account) return { ok: false, error: 'Invalid email or password.' };
    var session = enrichSession(account);
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (err) {
      return { ok: false, error: 'Could not save session. Check browser privacy settings.' };
    }
    return { ok: true, session: session };
  }

  function resolveRedirect(target) {
    if (!target) return 'login.html';
    if (/^https?:\/\//.test(target)) return target;
    var path = window.location.pathname || '';
    if (path.includes('/admin/') || path.includes('/user/')) {
      return target.startsWith('../') ? target : '../' + target.replace(/^\.\//, '');
    }
    return target;
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    window.location.href = loginPath();
  }

  function requireRole(role) {
    var session = getSession();
    if (!session) { window.location.replace(loginPath()); return null; }
    if (session.role !== role) { window.location.replace(session.redirect); return null; }
    if (global.PrintPortStore) {
      var user = PrintPortStore.getUser(session.id);
      if (user) {
        session = enrichSession(user);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }
    }
    return session;
  }

  function refreshSession() {
    var session = getSession();
    if (!session || !global.PrintPortStore) return session;
    var user = PrintPortStore.getUser(session.id);
    if (user) {
      session = enrichSession(user);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
    return session;
  }

  global.PrintPortAuth = {
    SESSION_KEY: SESSION_KEY,
    getAccounts: getAccounts,
    login: login,
    logout: logout,
    getSession: getSession,
    requireRole: requireRole,
    refreshSession: refreshSession,
    initials: initials,
    loginPath: loginPath,
    resolveRedirect: resolveRedirect,
  };
})(window);
