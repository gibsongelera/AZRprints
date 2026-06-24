document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();
  var p = PrintPortStore.getPricing();
  var s = PrintPortStore.get().settings || {};
  document.getElementById('priceBW').value = p.documentBW;
  document.getElementById('priceColor').value = p.documentColor;
  document.getElementById('pricePhoto').value = p.photo;
  document.getElementById('priceLarge').value = p.largeFormat;
  document.getElementById('dispGcash').textContent = s.gcashNumber || '—';
  document.getElementById('dispMaya').textContent = s.mayaNumber || '—';

  document.getElementById('savePricing').addEventListener('click', function () {
    PrintPortStore.updatePricing({
      documentBW: parseFloat(document.getElementById('priceBW').value),
      documentColor: parseFloat(document.getElementById('priceColor').value),
      photo: parseFloat(document.getElementById('pricePhoto').value),
      largeFormat: parseFloat(document.getElementById('priceLarge').value),
    });
    alert('Pricing saved (₱ PHP).');
  });
});
