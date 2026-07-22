document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();
  var fmt = PrintPortFormat.formatPHP;
  var tbody = document.getElementById('adminOrdersTable');

  function paymentBadge(status) {
    var map = {
      receipt_submitted: { cls: 'payment-status-badge submitted', label: 'Receipt submitted' },
      verified: { cls: 'payment-status-badge verified', label: 'Verified' },
      rejected: { cls: 'payment-status-badge rejected', label: 'Rejected' },
      legacy: { cls: 'payment-status-badge legacy', label: 'Legacy' },
    };
    var m = map[status] || map.legacy;
    return '<span class="' + m.cls + '">' + m.label + '</span>';
  }

  function render() {
    var data = PrintPortStore.get();
    var users = data.users || [];
    var orders = data.orders || [];

    tbody.innerHTML = orders.map(function (o) {
      var u = users.find(function (x) { return x.id === o.userId; });
      var receiptCell = o.receipt
        ? '<button type="button" class="btn btn-outline-primary btn-sm view-receipt" data-id="' + o.id + '"><i class="bi bi-receipt me-1"></i>View</button>'
        : '<span class="text-muted small">—</span>';

      var actions = '';
      if (o.paymentStatus === 'receipt_submitted') {
        actions =
          '<div class="d-flex gap-1 flex-wrap">' +
          '<button type="button" class="btn btn-success btn-sm verify-pay" data-id="' + o.id + '"><i class="bi bi-check2"></i> Verify</button>' +
          '<button type="button" class="btn btn-outline-danger btn-sm reject-pay" data-id="' + o.id + '"><i class="bi bi-x"></i> Reject</button>' +
          '</div>';
      } else if (o.paymentStatus === 'rejected') {
        actions = '<span class="text-muted small">Awaiting re-upload</span>';
      } else {
        actions = '<span class="text-muted small">—</span>';
      }

      return '<tr><td>' + o.id + '</td><td>' + (u ? u.name : '-') + '</td><td>' + o.fileName + '</td><td>' + o.pages + '</td>' +
        '<td>' + fmt(o.amount) + '</td><td>' + paymentBadge(o.paymentStatus) + '</td><td>' + receiptCell + '</td>' +
        '<td><select class="form-select form-select-sm order-status" data-id="' + o.id + '">' +
        ['pending', 'in_progress', 'completed'].map(function (s) {
          return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + s + '</option>';
        }).join('') + '</select></td><td>' + actions + '</td></tr>';
    }).join('');
  }

  // Event delegation — survives live re-renders without stacking listeners
  tbody.addEventListener('change', function (e) {
    var sel = e.target.closest('.order-status');
    if (!sel) return;
    PrintPortStore.updateOrder(sel.getAttribute('data-id'), { status: sel.value });
  });

  tbody.addEventListener('click', function (e) {
    var viewBtn = e.target.closest('.view-receipt');
    if (viewBtn) {
      var order = PrintPortStore.getOrders().find(function (o) { return o.id === viewBtn.getAttribute('data-id'); });
      if (!order || !order.receipt) return;
      var w = window.open('', '_blank');
      if (!w) { alert('Please allow pop-ups to view the receipt.'); return; }
      w.document.title = 'Receipt · ' + order.id;
      var body = w.document.body;
      body.style.margin = '0';
      body.style.background = '#0f172a';
      body.style.display = 'flex';
      body.style.alignItems = 'center';
      body.style.justifyContent = 'center';
      body.style.minHeight = '100vh';
      var img = w.document.createElement('img');
      img.src = order.receipt;
      img.alt = 'Receipt for ' + order.id;
      img.style.maxWidth = '100%';
      img.style.maxHeight = '100vh';
      body.appendChild(img);
      return;
    }

    var verifyBtn = e.target.closest('.verify-pay');
    if (verifyBtn) {
      var id = verifyBtn.getAttribute('data-id');
      if (!confirm('Mark payment for ' + id + ' as verified and start printing?')) return;
      PrintPortStore.updateOrder(id, { paymentStatus: 'verified', status: 'in_progress' });
      return;
    }

    var rejectBtn = e.target.closest('.reject-pay');
    if (rejectBtn) {
      var rid = rejectBtn.getAttribute('data-id');
      if (!confirm('Reject the receipt for ' + rid + '? The student can re-upload.')) return;
      PrintPortStore.updateOrder(rid, { paymentStatus: 'rejected' });
    }
  });

  render();
  PrintPortStore.subscribe(render);
});
