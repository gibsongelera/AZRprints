document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();
  var fmt = PrintPortFormat.formatPHP;
  var data = PrintPortStore.get();
  var orders = data.orders || [];
  var totalSales = orders.reduce(function (s, o) { return s + o.amount; }, 0);

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

  var users = data.users || [];
  document.getElementById('recentOrders').innerHTML = orders.slice(0, 5).map(function (o) {
    var u = users.find(function (x) { return x.id === o.userId; });
    return '<tr><td>' + o.id + '</td><td>' + (u ? u.name : o.userId) + '</td><td>' + fmt(o.amount) + '</td><td><span class="badge bg-secondary">' + o.status + '</span></td></tr>';
  }).join('');

  document.getElementById('topupBtn').addEventListener('click', function () {
    var id = document.getElementById('topupId').value.trim();
    var amt = parseFloat(document.getElementById('topupAmount').value) || 0;
    var user = users.find(function (u) { return u.studentId === id || u.email === id; });
    if (!user || amt <= 0) { alert('Enter valid student ID and amount.'); return; }
    PrintPortStore.updateUser(user.id, { credits: (user.credits || 0) + amt });
    alert('Added ' + fmt(amt) + ' to ' + user.name);
    document.getElementById('topupId').value = '';
    document.getElementById('topupAmount').value = '';
  });
});
