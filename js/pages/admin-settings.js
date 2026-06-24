document.addEventListener('DOMContentLoaded', function () {
  PrintPortAuth.requireRole('admin');
  PrintPortStore.init();
  var s = PrintPortStore.get().settings || {};
  document.getElementById('shopName').value = s.shopName || '';
  document.getElementById('openTime').value = s.openTime || '07:00';
  document.getElementById('closeTime').value = s.closeTime || '18:00';
  document.getElementById('autoDelete').value = s.autoDeleteHours || 48;

  document.getElementById('saveSettings').addEventListener('click', function () {
    PrintPortStore.updateSettings({
      shopName: document.getElementById('shopName').value,
      openTime: document.getElementById('openTime').value,
      closeTime: document.getElementById('closeTime').value,
      autoDeleteHours: parseInt(document.getElementById('autoDelete').value, 10),
    });
    document.querySelectorAll('[data-brand-name]').forEach(function (el) {
      el.textContent = document.getElementById('shopName').value;
    });
    alert('Settings saved.');
  });
});
