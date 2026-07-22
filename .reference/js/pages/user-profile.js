document.addEventListener('DOMContentLoaded', function () {
  var session = PrintPortAuth.requireRole('user');
  if (!session) return;
  PrintPortStore.init();
  var user = PrintPortStore.getUser(session.id) || session;

  function fill() {
    document.querySelectorAll('[data-profile-name]').forEach(function (el) { el.textContent = user.name; });
    document.querySelectorAll('[data-profile-id]').forEach(function (el) { el.textContent = user.studentId || ''; });
    document.querySelectorAll('[data-profile-email]').forEach(function (el) { el.textContent = user.email; });
    document.querySelectorAll('[data-profile-college]').forEach(function (el) { el.textContent = user.college || ''; });
    document.getElementById('pfName').value = user.name || '';
    document.getElementById('pfPhone').value = user.phone || '';
    document.getElementById('pfCollege').value = user.college || '';
  }
  fill();

  document.getElementById('profileForm').addEventListener('submit', function (e) {
    e.preventDefault();
    user = PrintPortStore.updateUser(session.id, {
      name: document.getElementById('pfName').value,
      phone: document.getElementById('pfPhone').value,
      college: document.getElementById('pfCollege').value,
    });
    PrintPortAuth.refreshSession();
    document.querySelectorAll('[data-session-name]').forEach(function (el) { el.textContent = user.name; });
    document.querySelectorAll('[data-session-initials]').forEach(function (el) {
      el.textContent = PrintPortAuth.initials(user.name);
    });
    fill();
    var saved = document.getElementById('profileSaved');
    saved.classList.remove('d-none');
    setTimeout(function () { saved.classList.add('d-none'); }, 3000);
  });
});
