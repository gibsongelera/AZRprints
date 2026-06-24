document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();
  var icons = { success: 'check-circle', warning: 'exclamation-triangle', info: 'info-circle' };
  document.getElementById('notificationsList').innerHTML = (PrintPortStore.get().notifications || []).map(function (n) {
    return '<div class="card"><div class="card-body d-flex gap-3"><i class="bi bi-' + (icons[n.type] || 'bell') + ' fs-4 text-' + (n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'primary') + '"></i>' +
      '<div><strong>' + n.title + '</strong><p class="mb-1 small">' + n.message + '</p><span class="text-muted small">' + n.time + '</span></div></div></div>';
  }).join('');
});
