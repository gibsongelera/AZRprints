document.addEventListener('DOMContentLoaded', function () {
  var session = PrintPortAuth.requireRole('user');
  if (!session) return;
  PrintPortStore.init();
  var pricing = PrintPortStore.getPricing();
  var fmt = PrintPortFormat.formatPHP;

  document.getElementById('rateDoc').textContent = fmt(pricing.documentBW) + '/page';
  document.getElementById('ratePhoto').textContent = fmt(pricing.photo);
  document.getElementById('rateLarge').textContent = fmt(pricing.largeFormat);

  var state = { type: 'document', file: null, fileName: '', receipt: null, orderId: null };
  var zone = document.getElementById('uploadZone');
  var input = document.getElementById('fileInput');
  var submitBtn = document.getElementById('submitOrder');
  var orderHint = document.getElementById('orderHint');

  var RECEIPT_MAX_BYTES = 1 * 1024 * 1024;
  var RECEIPT_ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
  var pay = PrintPortStore.getPaymentSettings();
  var qrImg = document.getElementById('checkoutQr');
  var qrEmpty = document.getElementById('checkoutQrEmpty');
  var numberDisplay = document.getElementById('payNumberDisplay');
  var accountDisplay = document.getElementById('payAccountDisplay');
  var configBadge = document.getElementById('payConfigBadge');
  var copyBtn = document.getElementById('copyNumberBtn');
  var orderRefDisplay = document.getElementById('orderRefDisplay');
  var copyOrderRefBtn = document.getElementById('copyOrderRefBtn');
  var receiptZone = document.getElementById('receiptZone');
  var receiptInput = document.getElementById('receiptInput');
  var receiptLabel = document.getElementById('receiptLabel');
  var receiptPreview = document.getElementById('receiptPreview');
  var receiptPreviewImg = document.getElementById('receiptPreviewImg');
  var receiptClear = document.getElementById('receiptClear');
  var agreeTerms = document.getElementById('agreeTerms');

  function applyPaymentSettings(settings) {
    pay = settings || PrintPortStore.getPaymentSettings();
    if (pay.qrImage) {
      qrImg.src = pay.qrImage;
      qrImg.hidden = false;
      qrEmpty.hidden = true;
    } else {
      qrImg.removeAttribute('src');
      qrImg.hidden = true;
      qrEmpty.hidden = false;
    }
    numberDisplay.textContent = pay.mobileNumber || 'Not set — contact admin';
    if (accountDisplay) {
      accountDisplay.textContent = pay.accountName
        ? 'Pay to: ' + pay.accountName
        : '';
    }
    if (configBadge) {
      if (pay.isConfigured) {
        configBadge.textContent = 'Ready';
        configBadge.className = 'payment-config-badge ready';
      } else {
        configBadge.textContent = 'Not configured';
        configBadge.className = 'payment-config-badge incomplete';
      }
    }
    updateSubmit();
  }

  applyPaymentSettings(pay);

  PrintPortStore.subscribe(function () {
    applyPaymentSettings(PrintPortStore.getPaymentSettings());
  });

  function copyText(text, btn, doneLabel) {
    if (!text) return;
    function done() {
      btn.classList.add('copied');
      btn.innerHTML = '<i class="bi bi-check2"></i> ' + (doneLabel || 'Copied');
      setTimeout(function () {
        btn.classList.remove('copied');
        btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
      }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (_) {}
      document.body.removeChild(ta);
    }
  }

  copyBtn.addEventListener('click', function () {
    copyText(pay.mobileNumber || '', copyBtn);
  });
  copyOrderRefBtn.addEventListener('click', function () {
    if (!state.orderId) return;
    copyText(state.orderId, copyOrderRefBtn);
  });

  function clearReceipt() {
    state.receipt = null;
    receiptInput.value = '';
    receiptPreview.classList.add('d-none');
    receiptPreviewImg.removeAttribute('src');
    receiptZone.classList.remove('has-file');
    receiptLabel.textContent = 'Upload InstaPay / GCash confirmation screenshot';
    updateSubmit();
  }

  function handleReceiptSelect(file) {
    if (!file) return;
    if (RECEIPT_ALLOWED.indexOf(file.type) === -1) {
      alert('Please upload a PNG, JPG or WEBP screenshot.');
      return;
    }
    if (file.size > RECEIPT_MAX_BYTES) {
      alert('Receipt is too large (max 1MB). Please upload a smaller screenshot.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      state.receipt = String(reader.result);
      receiptPreviewImg.src = state.receipt;
      receiptPreview.classList.remove('d-none');
      receiptZone.classList.add('has-file');
      receiptLabel.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
      updateSubmit();
    };
    reader.onerror = function () { alert('Could not read that image. Try another file.'); };
    reader.readAsDataURL(file);
  }

  receiptZone.addEventListener('click', function () { receiptInput.click(); });
  receiptZone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); receiptInput.click(); }
  });
  receiptZone.addEventListener('dragover', function (e) { e.preventDefault(); receiptZone.classList.add('dragover'); });
  receiptZone.addEventListener('dragleave', function () { receiptZone.classList.remove('dragover'); });
  receiptZone.addEventListener('drop', function (e) {
    e.preventDefault();
    receiptZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleReceiptSelect(e.dataTransfer.files[0]);
  });
  receiptInput.addEventListener('change', function () {
    if (receiptInput.files[0]) handleReceiptSelect(receiptInput.files[0]);
  });
  receiptClear.addEventListener('click', clearReceipt);
  agreeTerms.addEventListener('change', updateSubmit);

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
    calcTotal();
    var reasons = [];
    if (!pay.isConfigured) reasons.push('wait for admin to configure InstaPay / GCash');
    if (!state.fileName) reasons.push('upload a document');
    if (!state.orderId) reasons.push('generate an Order ID (upload a file)');
    if (!state.receipt) reasons.push('attach your payment receipt');
    if (!agreeTerms.checked) reasons.push('accept the Terms');
    submitBtn.disabled = reasons.length > 0;
    if (orderHint) {
      orderHint.textContent = reasons.length
        ? 'To place your order, please ' + reasons.join(', ') + '.'
        : '';
    }
  }

  function setOrderRef(id) {
    state.orderId = id;
    if (id) {
      orderRefDisplay.textContent = id;
      orderRefDisplay.classList.add('ready');
      copyOrderRefBtn.disabled = false;
    } else {
      orderRefDisplay.textContent = 'Upload a document to generate';
      orderRefDisplay.classList.remove('ready');
      copyOrderRefBtn.disabled = true;
    }
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
    setOrderRef('ORD-' + Date.now().toString().slice(-6));
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
    if (!pay.isConfigured) {
      alert('Payment is not configured yet. Please contact the shop admin.');
      return;
    }
    if (!state.fileName) { alert('Please upload a document first.'); return; }
    if (!state.orderId) { alert('Order ID missing. Please re-upload your document.'); return; }
    if (!state.receipt) { alert('Please attach your InstaPay / GCash payment receipt.'); return; }
    if (!agreeTerms.checked) { alert('Please accept the Terms & Privacy Policy.'); return; }

    var pages = parseInt(document.getElementById('pageCount').value, 10) || 1;
    var copies = parseInt(document.getElementById('copies').value, 10) || 1;
    var amount = calcTotal();
    var result = PrintPortStore.addOrder({
      id: state.orderId,
      userId: session.id,
      fileName: state.fileName,
      pages: pages,
      type: state.type,
      color: document.getElementById('colorMode').value,
      copies: copies,
      amount: amount,
      status: 'pending',
      date: new Date().toISOString().slice(0, 10),
      paymentChannel: 'instapay_gcash',
      paymentNumber: pay.mobileNumber || '',
      paymentAccountName: pay.accountName || '',
      receipt: state.receipt,
      receiptUploadedAt: new Date().toISOString(),
      paymentStatus: 'receipt_submitted',
    });
    if (!result) { alert('Could not save your order. Please try a smaller receipt image.'); return; }
    alert('Order ' + state.orderId + ' submitted! Total: ' + PrintPortFormat.formatPHP(amount));
    window.location.href = 'orders.html';
  });

  updateSubmit();
});
