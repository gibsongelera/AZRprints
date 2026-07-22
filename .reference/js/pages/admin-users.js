document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();
  document.getElementById('usersTable').innerHTML = (PrintPortStore.get().users || []).map(function (u) {
    return '<tr><td>' + u.name + '</td><td>' + (u.studentId || u.staffId || '-') + '</td><td>' + u.email + '</td>' +
      '<td><span class="badge bg-' + (u.role === 'admin' ? 'primary' : 'success') + '">' + u.role + '</span></td>' +
      '<td>' + (u.phone || '—') + '</td></tr>';
  }).join('');
});
