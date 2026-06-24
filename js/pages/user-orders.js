document.addEventListener('DOMContentLoaded', function () {
  var session = PrintPortAuth.requireRole('user');
  if (!session) return;
  PrintPortStore.init();
  var fmt = PrintPortFormat.formatPHP;
  var orders = PrintPortStore.getOrders(session.id);
  var container = document.getElementById('ordersList');
  if (!orders.length) {
    container.innerHTML = '<div class="col-12"><div class="alert alert-info">No orders yet. <a href="dashboard.html">Create your first order</a>.</div></div>';
    return;
  }
  var statusBadge = { pending: 'warning', in_progress: 'info', completed: 'success' };
  container.innerHTML = orders.map(function (o) {
    return '<div class="col-md-6 col-lg-4"><div class="card order-card h-100"><div class="card-body">' +
      '<div class="d-flex justify-content-between mb-2"><strong>' + o.id + '</strong>' +
      '<span class="badge bg-' + (statusBadge[o.status] || 'secondary') + '">' + o.status.replace('_', ' ') + '</span></div>' +
      '<p class="small text-muted mb-1"><i class="bi bi-file-earmark"></i> ' + o.fileName + '</p>' +
      '<p class="small mb-1">' + o.pages + ' pages × ' + o.copies + ' copies</p>' +
      '<p class="fw-bold text-primary mb-1">' + fmt(o.amount) + '</p>' +
      '<p class="small text-muted mb-0">' + o.date + ' · ' + o.payment + '</p>' +
      '</div></div></div>';
  }).join('');
});
