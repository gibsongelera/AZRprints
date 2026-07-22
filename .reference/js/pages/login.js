(function () {
  function initLogin() {
    if (!window.PrintPortAuth) {
      console.error('PrintPortAuth not loaded');
      return;
    }

    var form = document.getElementById('loginForm');
    var errorEl = document.getElementById('loginError');
    var toggleBtn = document.getElementById('togglePassword');
    var passwordInput = document.getElementById('password');
    var emailInput = document.getElementById('userId');

    document.querySelectorAll('[data-demo-fill]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (emailInput) emailInput.value = btn.getAttribute('data-demo-email') || '';
        if (passwordInput) passwordInput.value = btn.getAttribute('data-demo-password') || '';
        if (errorEl) errorEl.classList.add('hidden');
      });
    });

    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', function () {
        var icon = this.querySelector('i');
        if (passwordInput.type === 'password') {
          passwordInput.type = 'text';
          if (icon) icon.className = 'bi bi-eye-slash';
        } else {
          passwordInput.type = 'password';
          if (icon) icon.className = 'bi bi-eye';
        }
      });
    }

    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (errorEl) errorEl.classList.add('hidden');

      var result = PrintPortAuth.login(
        emailInput ? emailInput.value : '',
        passwordInput ? passwordInput.value : ''
      );

      if (!result.ok) {
        if (errorEl) {
          errorEl.textContent = result.error;
          errorEl.classList.remove('hidden');
        }
        return;
      }

      window.location.assign(PrintPortAuth.resolveRedirect(result.session.redirect));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogin);
  } else {
    initLogin();
  }
})();
