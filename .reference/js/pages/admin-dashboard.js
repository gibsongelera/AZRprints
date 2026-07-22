document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();
  var fmt = PrintPortFormat.formatPHP;

  function render() {
    var data = PrintPortStore.get();
    var orders = data.orders || [];
    var totalSales = orders.reduce(function (s, o) { return s + o.amount; }, 0);
    var pendingPayments = orders.filter(function (o) {
      return o.paymentStatus === 'receipt_submitted';
    }).length;

    document.getElementById('adminStats').innerHTML = [
      { label: 'Total Sales', value: fmt(totalSales), icon: 'currency-exchange' },
      { label: 'Orders', value: orders.length, icon: 'receipt' },
      { label: 'Students', value: (data.users || []).filter(function (u) { return u.role === 'user'; }).length, icon: 'people' },
      { label: 'Pending', value: orders.filter(function (o) { return o.status === 'pending'; }).length, icon: 'hourglass' },
    ].map(function (s) {
      return '<div class="col-sm-6 col-xl-3"><div class="stat-card d-flex align-items-center gap-3">' +
        '<span class="rounded-circle bg-danger bg-opacity-10 text-danger p-3"><i class="bi bi-' + s.icon + ' fs-4"></i></span>' +
        '<div><div class="text-muted small">' + s.label + '</div><div class="stat-value">' + s.value + '</div></div></div></div>';
    }).join('');

    var countEl = document.getElementById('pendingPaymentCount');
    if (countEl) countEl.textContent = String(pendingPayments);

    var users = data.users || [];
    document.getElementById('recentOrders').innerHTML = orders.slice(0, 5).map(function (o) {
      var u = users.find(function (x) { return x.id === o.userId; });
      return '<tr><td>' + o.id + '</td><td>' + (u ? u.name : o.userId) + '</td><td>' + fmt(o.amount) + '</td><td><span class="badge bg-secondary">' + o.status + '</span></td></tr>';
    }).join('');
  }

  render();
  PrintPortStore.subscribe(render);
});
