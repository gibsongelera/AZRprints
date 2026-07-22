(function () {
  if (!global.PrintPortStore) return;
  PrintPortStore.init();
  var brand = PrintPortStore.getBrand();
  var settings = PrintPortStore.getSettings();
  var name = settings.shopName || brand.name || "AZR PRINT'S";
  document.querySelectorAll('[data-brand-name]').forEach(function (el) {
    el.textContent = name;
  });
})(window);
