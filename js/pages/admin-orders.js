document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();
  var fmt = PrintPortFormat.formatPHP;
  var data = PrintPortStore.get();
  var users = data.users || [];
  document.getElementById('adminOrdersTable').innerHTML = (data.orders || []).map(function (o) {
    var u = users.find(function (x) { return x.id === o.userId; });
    return '<tr><td>' + o.id + '</td><td>' + (u ? u.name : '-') + '</td><td>' + o.fileName + '</td><td>' + o.pages + '</td>' +
      '<td>' + fmt(o.amount) + '</td><td>' + o.payment + '</td><td><select class="form-select form-select-sm order-status" data-id="' + o.id + '">' +
      ['pending', 'in_progress', 'completed'].map(function (s) {
        return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + s + '</option>';
      }).join('') + '</select></td><td></td></tr>';
  }).join('');

  document.querySelectorAll('.order-status').forEach(function (sel) {
    sel.addEventListener('change', function () {
      PrintPortStore.updateOrder(sel.getAttribute('data-id'), { status: sel.value });
    });
  });
});
