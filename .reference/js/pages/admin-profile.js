document.addEventListener('DOMContentLoaded', function () {
  var session = PrintPortAuth.requireRole('admin');
  if (!session) return;
  PrintPortStore.init();
  var user = PrintPortStore.getUser(session.id) || session;

  function fill() {
    document.querySelectorAll('[data-profile-name]').forEach(function (el) { el.textContent = user.name; });
    document.querySelectorAll('[data-profile-id]').forEach(function (el) { el.textContent = user.staffId || ''; });
    document.querySelectorAll('[data-profile-dept]').forEach(function (el) { el.textContent = user.department || ''; });
    document.getElementById('apName').value = user.name || '';
    document.getElementById('apPhone').value = user.phone || '';
    document.getElementById('apDept').value = user.department || '';
  }
  fill();

  document.getElementById('adminProfileForm').addEventListener('submit', function (e) {
    e.preventDefault();
    user = PrintPortStore.updateUser(session.id, {
      name: document.getElementById('apName').value,
      phone: document.getElementById('apPhone').value,
      department: document.getElementById('apDept').value,
    });
    PrintPortAuth.refreshSession();
    document.querySelectorAll('[data-session-name]').forEach(function (el) { el.textContent = user.name; });
    document.querySelectorAll('[data-session-initials]').forEach(function (el) {
      el.textContent = PrintPortAuth.initials(user.name);
    });
    fill();
    var saved = document.getElementById('adminProfileSaved');
    saved.classList.remove('d-none');
    setTimeout(function () { saved.classList.add('d-none'); }, 3000);
  });
});
