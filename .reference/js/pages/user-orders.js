document.addEventListener('DOMContentLoaded', function () {
  var session = PrintPortAuth.requireRole('user');
  if (!session) return;
  PrintPortStore.init();
  var fmt = PrintPortFormat.formatPHP;
  var container = document.getElementById('ordersList');

  var statusBadge = { pending: 'warning', in_progress: 'info', completed: 'success', cancelled: 'secondary' };
  var payMap = {
    receipt_submitted: { cls: 'payment-status-badge submitted', label: 'Receipt submitted' },
    verified: { cls: 'payment-status-badge verified', label: 'Payment verified' },
    rejected: { cls: 'payment-status-badge rejected', label: 'Receipt rejected' },
    legacy: { cls: 'payment-status-badge legacy', label: 'Legacy' },
  };

  function render() {
    var orders = PrintPortStore.getOrders(session.id);
    if (!orders.length) {
      container.innerHTML = '<div class="col-12"><div class="alert alert-info">No orders yet. <a href="dashboard.html">Create your first order</a>.</div></div>';
      return;
    }
    container.innerHTML = orders.map(function (o) {
      var pay = payMap[o.paymentStatus] || payMap.legacy;
      var reupload = o.paymentStatus === 'rejected'
        ? '<a href="dashboard.html" class="btn btn-sm btn-outline-danger mt-2"><i class="bi bi-upload me-1"></i> Re-upload receipt</a>'
        : '';
      return '<div class="col-md-6 col-lg-4"><div class="card order-card h-100"><div class="card-body">' +
        '<div class="d-flex justify-content-between mb-2"><strong>' + o.id + '</strong>' +
        '<span class="badge bg-' + (statusBadge[o.status] || 'secondary') + '">' + String(o.status || '').replace('_', ' ') + '</span></div>' +
        '<p class="small text-muted mb-1"><i class="bi bi-file-earmark"></i> ' + o.fileName + '</p>' +
        '<p class="small mb-1">' + o.pages + ' pages × ' + o.copies + ' copies</p>' +
        '<p class="fw-bold text-primary mb-1">' + fmt(o.amount) + '</p>' +
        '<p class="small mb-1"><span class="' + pay.cls + '">' + pay.label + '</span></p>' +
        '<p class="small text-muted mb-0">' + o.date + ' · InstaPay / GCash</p>' +
        reupload +
        '</div></div></div>';
    }).join('');
  }

  render();
  PrintPortStore.subscribe(render);
});
