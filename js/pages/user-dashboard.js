document.addEventListener('DOMContentLoaded', function () {
  var session = PrintPortAuth.requireRole('user');
  if (!session) return;
  PrintPortStore.init();
  var pricing = PrintPortStore.getPricing();
  var fmt = PrintPortFormat.formatPHP;

  document.getElementById('rateDoc').textContent = fmt(pricing.documentBW) + '/page';
  document.getElementById('ratePhoto').textContent = fmt(pricing.photo);
  document.getElementById('rateLarge').textContent = fmt(pricing.largeFormat);

  var state = { type: 'document', file: null, fileName: '' };
  var zone = document.getElementById('uploadZone');
  var input = document.getElementById('fileInput');
  var submitBtn = document.getElementById('submitOrder');

  function calcTotal() {
    var pages = parseInt(document.getElementById('pageCount').value, 10) || 1;
    var copies = parseInt(document.getElementById('copies').value, 10) || 1;
    var color = document.getElementById('colorMode').value;
    var rate = pricing.documentBW;
    if (state.type === 'photo') rate = pricing.photo;
    else if (state.type === 'large') rate = pricing.largeFormat;
    else if (color === 'color') rate = pricing.documentColor;
    var total = rate * pages * copies;
    document.getElementById('sumSubtotal').textContent = fmt(rate * pages);
    document.getElementById('sumCopies').textContent = '×' + copies;
    document.getElementById('sumTotal').textContent = fmt(total);
    return total;
  }

  function updateSubmit() {
    submitBtn.disabled = !state.fileName;
    calcTotal();
  }

  zone.addEventListener('click', function () { input.click(); });
  zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', function () { zone.classList.remove('dragover'); });
  zone.addEventListener('drop', function (e) {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  });
  input.addEventListener('change', function () { if (input.files[0]) setFile(input.files[0]); });

  var pageInput = document.getElementById('pageCount');
  var pageHint = document.getElementById('pageCountHint');
  var detectToken = 0;

  function setPageCount(pages, hint) {
    pageInput.value = pages;
    if (pageHint) pageHint.textContent = hint ? '(' + hint + ')' : '';
    updateSubmit();
  }

  function setFile(file) {
    state.file = file;
    state.fileName = file.name;
    var token = ++detectToken;
    pageInput.disabled = true;
    submitBtn.disabled = true;
    if (pageHint) pageHint.textContent = '(detecting…)';
    document.getElementById('fileLabel').textContent =
      file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB) · detecting pages…';
    zone.classList.add('has-file');

    PrintPortPageCount.detect(file).then(function (result) {
      if (token !== detectToken) return;
      pageInput.disabled = false;
      setPageCount(result.pages, result.label);
      document.getElementById('fileLabel').textContent =
        file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB) · ' +
        result.pages + ' page' + (result.pages === 1 ? '' : 's');
      updateSubmit();
    }).catch(function () {
      if (token !== detectToken) return;
      pageInput.disabled = false;
      setPageCount(1, 'manual — detection failed');
      document.getElementById('fileLabel').textContent =
        file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB) · could not detect pages';
      updateSubmit();
    });
  }

  document.querySelectorAll('#printTypeGroup button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#printTypeGroup button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.type = btn.getAttribute('data-type');
      updateSubmit();
    });
  });

  ['pageCount', 'copies', 'colorMode'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', updateSubmit);
  });

  submitBtn.addEventListener('click', function () {
    var pages = parseInt(document.getElementById('pageCount').value, 10) || 1;
    var copies = parseInt(document.getElementById('copies').value, 10) || 1;
    var amount = calcTotal();
    var id = 'ORD-' + Date.now().toString().slice(-6);
    PrintPortStore.addOrder({
      id: id,
      userId: session.id,
      fileName: state.fileName,
      pages: pages,
      type: state.type,
      color: document.getElementById('colorMode').value,
      copies: copies,
      amount: amount,
      status: 'pending',
      date: new Date().toISOString().slice(0, 10),
      payment: document.getElementById('paymentMethod').value,
    });
    alert('Order ' + id + ' submitted! Total: ' + PrintPortFormat.formatPHP(amount));
    window.location.href = 'orders.html';
  });

  updateSubmit();
});
