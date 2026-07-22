(function () {
  PrintPortStore.init();
  var session = PrintPortAuth.refreshSession();

  // Pull latest localStorage when user returns to this tab (no hard refresh needed)
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') PrintPortStore.reload();
  });
  window.addEventListener('focus', function () {
    PrintPortStore.reload();
  });

  var sidebar = document.getElementById('appSidebar');
  var backdrop = document.getElementById('sidebarBackdrop');
  var toggle = document.getElementById('sidebarToggle');

  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');
  }

  function openSidebar() {
    if (sidebar) sidebar.classList.add('show');
    if (backdrop) backdrop.classList.add('show');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      sidebar && sidebar.classList.contains('show') ? closeSidebar() : openSidebar();
    });
  }
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  document.querySelectorAll('[data-logout]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      PrintPortAuth.logout();
    });
  });

  document.querySelectorAll('[data-header-nav]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      window.location.href = btn.getAttribute('data-header-nav');
    });
  });

  if (session) {
    document.querySelectorAll('[data-session-name]').forEach(function (el) {
      el.textContent = session.name;
    });
    document.querySelectorAll('[data-session-initials]').forEach(function (el) {
      el.textContent = PrintPortAuth.initials(session.name);
    });
  }

  var page = window.location.pathname.split('/').pop() || '';
  document.querySelectorAll('[data-nav-link]').forEach(function (link) {
    var href = link.getAttribute('href') || '';
    if (href.endsWith(page)) {
      link.classList.add('active');
    }
    if (sidebar && link.closest('.app-sidebar')) {
      link.addEventListener('click', closeSidebar);
    }
  });

  var mainContent = document.querySelector('.app-content');
  if (mainContent && !document.querySelector('.mobile-bottom-nav')) {
    mainContent.classList.add('app-content--no-mobile-nav');
  }
})();
