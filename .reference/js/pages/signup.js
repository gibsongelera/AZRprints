document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('signupForm');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = document.getElementById('signupError');
    var ok = document.getElementById('signupSuccess');
    if (err) err.classList.add('d-none');
    if (ok) {
      ok.textContent = 'Demo mode: please use student@zppsu.edu / user123 on the login page.';
      ok.classList.remove('d-none');
    }
  });
});
