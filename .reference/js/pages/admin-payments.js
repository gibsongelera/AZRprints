document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();

  var p = PrintPortStore.getPricing();
  document.getElementById('priceBW').value = p.documentBW;
  document.getElementById('priceColor').value = p.documentColor;
  document.getElementById('pricePhoto').value = p.photo;
  document.getElementById('priceLarge').value = p.largeFormat;

  document.getElementById('savePricing').addEventListener('click', function () {
    PrintPortStore.updatePricing({
      documentBW: parseFloat(document.getElementById('priceBW').value),
      documentColor: parseFloat(document.getElementById('priceColor').value),
      photo: parseFloat(document.getElementById('pricePhoto').value),
      largeFormat: parseFloat(document.getElementById('priceLarge').value),
    });
    alert('Pricing saved (₱ PHP).');
  });

  var MAX_BYTES = 1 * 1024 * 1024;
  var ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

  var numberInput = document.getElementById('payNumber');
  var accountInput = document.getElementById('payAccountName');
  var qrFile = document.getElementById('qrFile');
  var qrPreview = document.getElementById('qrPreview');
  var qrEmpty = document.getElementById('qrEmpty');
  var uploadBtn = document.getElementById('qrUploadBtn');
  var clearBtn = document.getElementById('qrClearBtn');
  var saveBtn = document.getElementById('savePayment');
  var updatedLabel = document.getElementById('payUpdated');
  var statusBadge = document.getElementById('payStatusBadge');

  var pendingQr;

  function renderQr(dataUrl) {
    if (dataUrl) {
      qrPreview.src = dataUrl;
      qrPreview.hidden = false;
      qrEmpty.hidden = true;
    } else {
      qrPreview.removeAttribute('src');
      qrPreview.hidden = true;
      qrEmpty.hidden = false;
    }
  }

  function renderUpdated(iso) {
    if (!iso) { updatedLabel.textContent = ''; return; }
    var d = new Date(iso);
    updatedLabel.textContent = isNaN(d.getTime()) ? '' : 'Last updated ' + d.toLocaleString('en-PH');
  }

  function updateStatusBadge(settings) {
    if (!statusBadge) return;
    if (settings && settings.isConfigured) {
      statusBadge.textContent = 'Ready for checkout';
      statusBadge.className = 'payment-config-badge ready';
    } else {
      statusBadge.textContent = 'Incomplete';
      statusBadge.className = 'payment-config-badge incomplete';
    }
  }

  var current = PrintPortStore.getPaymentSettings();
  numberInput.value = current.mobileNumber || '';
  accountInput.value = current.accountName || '';
  renderQr(current.qrImage || '');
  renderUpdated(current.updatedAt);
  updateStatusBadge(current);

  uploadBtn.addEventListener('click', function () { qrFile.click(); });

  qrFile.addEventListener('change', function () {
    var file = qrFile.files && qrFile.files[0];
    if (!file) return;
    if (ALLOWED.indexOf(file.type) === -1) {
      alert('Please choose a PNG, JPG, WEBP or GIF image.');
      qrFile.value = '';
      return;
    }
    if (file.size > MAX_BYTES) {
      alert('Image is too large (max 1MB). Please compress it and try again.');
      qrFile.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      pendingQr = String(reader.result);
      renderQr(pendingQr);
    };
    reader.onerror = function () { alert('Could not read that image. Try another file.'); };
    reader.readAsDataURL(file);
    qrFile.value = '';
  });

  clearBtn.addEventListener('click', function () {
    pendingQr = '';
    renderQr('');
  });

  saveBtn.addEventListener('click', function () {
    var number = numberInput.value.trim();
    var effectiveQr = pendingQr !== undefined ? pendingQr : (current.qrImage || '');
    if (!number) {
      alert('InstaPay / GCash number is required.');
      return;
    }
    if (!effectiveQr) {
      alert('Please upload an InstaPay / GCash QR code image.');
      return;
    }

    var patch = {
      mobileNumber: number,
      accountName: accountInput.value,
    };
    if (pendingQr !== undefined) patch.qrImage = pendingQr;

    var result = PrintPortStore.updatePaymentSettings(patch);
    if (!result.ok) {
      alert(result.error || 'Could not save payment settings.');
      return;
    }
    pendingQr = undefined;
    current = result.settings;
    renderUpdated(result.settings.updatedAt);
    updateStatusBadge(result.settings);
    alert('Payment settings saved. Students will see the new QR and number at checkout.');
  });

  PrintPortStore.subscribe(function () {
    var next = PrintPortStore.getPaymentSettings();
    // Don't overwrite an in-progress QR pick
    if (pendingQr !== undefined) return;
    current = next;
    numberInput.value = next.mobileNumber || '';
    accountInput.value = next.accountName || '';
    renderQr(next.qrImage || '');
    renderUpdated(next.updatedAt);
    updateStatusBadge(next);
  });
});
