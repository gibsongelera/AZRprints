/**
 * Philippine Peso formatting
 */
(function (global) {
  function formatPHP(amount) {
    var n = Number(amount) || 0;
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parsePHP(str) {
    if (typeof str === 'number') return str;
    return parseFloat(String(str).replace(/[₱,\s]/g, '')) || 0;
  }

  global.PrintPortFormat = { formatPHP: formatPHP, parsePHP: parsePHP };
})(window);
