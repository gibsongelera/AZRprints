/**
 * Bootstrap page builder – replaces Tailwind/Stitch output with Bootstrap + seed data
 * Run: node scripts/build-bootstrap.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TPL = path.join(ROOT, 'templates');

function read(name) { return fs.readFileSync(path.join(TPL, name), 'utf8'); }
function apply(tpl, vars) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v), tpl);
}

function base(file) {
  const d = file.split('/').length - 1;
  return d === 0 ? '.' : Array(d).fill('..').join('/');
}

function shell(role, file, title, body, extraScripts) {
  const b = base(file);
  const head = apply(read('head.html'), { BASE: b, TITLE: title });
  const sidebar = apply(read(role === 'admin' ? 'admin-sidebar.html' : 'user-sidebar.html'), { BASE: b });
  const header = apply(read(role === 'admin' ? 'admin-header.html' : 'user-header.html'), { PAGE_TITLE: title });
  const guard = `  <script>PrintPortAuth.requireRole('${role}');</script>`;
  const scripts = apply(read('scripts.html'), {
    BASE: b,
    SCRIPTS: guard + (extraScripts || ''),
  });
  return `${head}
<body>
<div class="app-shell">
${sidebar}
<div class="app-main">
${header}
<main class="app-content">
${body}
</main>
${scripts}
</div>
</div>
</body>
</html>`;
}

function authPage(file, title, body, extraScripts) {
  const b = base(file);
  const head = apply(read('head.html'), { BASE: b, TITLE: title });
  const scripts = apply(read('auth-scripts.html'), { BASE: b, SCRIPTS: extraScripts || '' });
  return `${head}
<body class="auth-page">
${body}
${scripts}
</body>
</html>`;
}

const pages = [
  {
    file: 'login.html',
    build: () => authPage('login.html', 'Login – AZR PRINT\'S', `
<nav class="auth-topbar">
  <div class="container-fluid d-flex align-items-center gap-3">
    <span class="brand-logo"><img src="./assets/azr-prints-logo.png" alt="AZR PRINT'S" class="brand-logo-img"/></span>
    <div>
      <div class="brand-title fw-bold fs-5" data-brand-name>AZR PRINT'S</div>
      <small class="text-white-50">ZPPSU Printing Services</small>
    </div>
  </div>
</nav>
<div class="auth-body flex-grow-1">
  <div class="container-fluid h-100">
    <div class="row h-100 g-0">
      <div class="col-lg-6 auth-hero d-none d-lg-flex flex-column justify-content-center p-5">
        <h2 class="display-6 fw-bold">Streamlining Campus Printing</h2>
        <p class="lead opacity-75">Efficient document management for ZPPSU students and faculty. Pay via GCash, Maya, or InstaPay.</p>
        <span class="badge bg-success align-self-start"><i class="bi bi-circle-fill me-1 small"></i> System Operational</span>
      </div>
      <div class="col-lg-6 d-flex align-items-center justify-content-center p-4 p-md-5 bg-white">
        <div class="w-100" style="max-width:400px">
          <h2 class="h3 fw-bold mb-1">Welcome Back</h2>
          <p class="text-muted mb-4">Sign in to manage your print orders.</p>
          <div class="alert alert-light border mb-3">
            <strong class="d-block mb-2">Demo accounts</strong>
            <div class="small mb-2">Admin: admin@zppsu.edu / admin123
              <button type="button" class="btn btn-link btn-sm p-0 ms-1" data-demo-fill data-demo-email="admin@zppsu.edu" data-demo-password="admin123">Use</button>
            </div>
            <div class="small">Student: student@zppsu.edu / user123
              <button type="button" class="btn btn-link btn-sm p-0 ms-1" data-demo-fill data-demo-email="student@zppsu.edu" data-demo-password="user123">Use</button>
            </div>
          </div>
          <div id="loginError" class="alert alert-danger hidden login-error" role="alert"></div>
          <form id="loginForm">
            <div class="mb-3">
              <label class="form-label" for="userId">Email</label>
              <input class="form-control" id="userId" type="email" placeholder="student@zppsu.edu" required autocomplete="username"/>
            </div>
            <div class="mb-3">
              <label class="form-label" for="password">Password</label>
              <div class="input-group">
                <input class="form-control" id="password" type="password" required autocomplete="current-password"/>
                <button class="btn btn-outline-secondary" type="button" id="togglePassword"><i class="bi bi-eye"></i></button>
              </div>
            </div>
            <button class="btn btn-primary w-100 py-2" type="submit">Login to Dashboard</button>
          </form>
          <p class="text-center text-muted mt-4 mb-0">No account? <a href="signup.html">Sign up here</a></p>
        </div>
      </div>
    </div>
  </div>
</div>`, `
  <script src="./js/pages/login.js"></script>`),
  },
  {
    file: 'signup.html',
    build: () => authPage('signup.html', 'Sign Up – AZR PRINT\'S', `
<nav class="auth-topbar">
  <div class="container-fluid d-flex align-items-center gap-3">
    <span class="brand-logo"><img src="./assets/azr-prints-logo.png" alt="AZR PRINT'S" class="brand-logo-img"/></span>
    <div>
      <div class="brand-title fw-bold fs-5" data-brand-name>AZR PRINT'S</div>
      <small class="text-white-50">ZPPSU Printing Services</small>
    </div>
  </div>
</nav>
<div class="auth-body flex-grow-1">
  <div class="container-fluid h-100">
    <div class="row h-100 g-0">
      <div class="col-lg-5 auth-hero d-none d-lg-flex flex-column justify-content-center p-5">
        <h2 class="display-6 fw-bold">Join AZR PRINT'S</h2>
        <p class="lead opacity-75">Register with your ZPPSU email to submit print jobs online.</p>
      </div>
      <div class="col-lg-7 d-flex align-items-center justify-content-center p-4 p-md-5 bg-white">
        <div class="w-100" style="max-width:440px">
          <h2 class="h3 fw-bold mb-1">Create Account</h2>
          <p class="text-muted mb-4">For demo, use the login accounts or fill the form below.</p>
          <div id="signupError" class="alert alert-danger d-none"></div>
          <div id="signupSuccess" class="alert alert-success d-none"></div>
          <form id="signupForm">
            <div class="mb-3"><label class="form-label">Full Name</label><input class="form-control" id="fullName" required/></div>
            <div class="mb-3"><label class="form-label">ZPPSU ID</label><input class="form-control" id="universityId" placeholder="ZPPSU-2024-0000" required/></div>
            <div class="mb-3"><label class="form-label">University Email</label><input class="form-control" id="email" type="email" required/></div>
            <div class="mb-3"><label class="form-label">Password</label><input class="form-control" id="password" type="password" required/></div>
            <button class="btn btn-primary w-100 py-2" type="submit">Create Account</button>
          </form>
          <p class="text-center text-muted mt-4 mb-0">Already registered? <a href="login.html">Log in here</a></p>
        </div>
      </div>
    </div>
  </div>
</div>`, `
  <script src="./js/pages/signup.js"></script>`),
  },
  {
    file: 'user/dashboard.html',
    role: 'user',
    title: 'New Order',
    extra: `<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
  <script src="../js/page-count.js"></script>
  <script src="../js/pages/user-dashboard.js"></script>`,
    body: `
<div class="row g-4">
  <div class="col-lg-8">
    <div class="upload-zone mb-4" id="uploadZone">
      <input type="file" id="fileInput" class="d-none" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"/>
      <i class="bi bi-cloud-upload display-4 text-primary"></i>
      <h3 class="h5 mt-2">Drag & drop your document or click to browse</h3>
      <p class="text-muted mb-2" id="fileLabel">PDF, DOCX, JPG supported</p>
      <div><span class="badge bg-danger me-1">PDF</span><span class="badge bg-primary me-1">DOCX</span><span class="badge bg-success">JPG</span></div>
    </div>
    <div class="card mb-4"><div class="card-body">
      <h3 class="h6 fw-semibold mb-3">Printing Type</h3>
      <div class="row g-2" id="printTypeGroup">
        <div class="col-4"><button type="button" class="btn btn-outline-primary w-100 active" data-type="document">Document<br><small id="rateDoc">₱2.00/page</small></button></div>
        <div class="col-4"><button type="button" class="btn btn-outline-primary w-100" data-type="photo">Photo<br><small id="ratePhoto">₱10.00</small></button></div>
        <div class="col-4"><button type="button" class="btn btn-outline-primary w-100" data-type="large">Large<br><small id="rateLarge">₱50.00</small></button></div>
      </div>
    </div></div>
    <div class="card"><div class="card-body">
      <h3 class="h6 fw-semibold mb-3">Job Specifications</h3>
      <div class="row g-3">
        <div class="col-md-4"><label class="form-label">Paper Size</label><select class="form-select" id="paperSize"><option>A4</option><option>Letter</option><option>Legal</option></select></div>
        <div class="col-md-4"><label class="form-label">Color</label><select class="form-select" id="colorMode"><option value="bw">Black & White</option><option value="color">Color</option></select></div>
        <div class="col-md-4"><label class="form-label">Copies</label><input type="number" class="form-control" id="copies" min="1" value="1"/></div>
        <div class="col-md-4"><label class="form-label">Pages <small class="text-muted fw-normal" id="pageCountHint"></small></label><input type="number" class="form-control" id="pageCount" min="1" value="1"/></div>
        <div class="col-md-8"><label class="form-label">Payment Method</label><select class="form-select" id="paymentMethod"><option>GCash</option><option>Maya</option><option>InstaPay</option></select></div>
      </div>
    </div></div>
  </div>
  <div class="col-lg-4">
    <div class="card sticky-summary sticky-top" style="top:5rem"><div class="card-body">
      <h3 class="h6 fw-semibold mb-3">Order Summary</h3>
      <dl class="row small mb-0">
        <dt class="col-6 text-muted">Subtotal</dt><dd class="col-6 text-end" id="sumSubtotal">₱0.00</dd>
        <dt class="col-6 text-muted">Copies</dt><dd class="col-6 text-end" id="sumCopies">×1</dd>
        <dt class="col-6 fw-bold">Total</dt><dd class="col-6 text-end fw-bold text-primary" id="sumTotal">₱0.00</dd>
      </dl>
      <button class="btn btn-primary w-100 mt-3" id="submitOrder" disabled>Submit Print Order</button>
    </div></div>
  </div>
</div>`,
  },
  {
    file: 'user/orders.html', role: 'user', title: 'My Orders',
    extra: '<script src="../js/pages/user-orders.js"></script>',
    body: `<div class="d-flex justify-content-between align-items-center mb-4"><h2 class="h4 mb-0">My Orders</h2><a href="dashboard.html" class="btn btn-primary btn-sm"><i class="bi bi-plus-lg"></i> New Order</a></div><div id="ordersList" class="row g-3"></div>`,
  },
  {
    file: 'user/profile.html', role: 'user', title: 'Profile',
    extra: '<script src="../js/pages/user-profile.js"></script>',
    body: `
<div class="row g-4">
  <div class="col-lg-4">
    <div class="card text-center"><div class="card-body">
      <div class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3" style="width:80px;height:80px;font-size:1.75rem" data-session-initials>JD</div>
      <h3 class="h5" data-profile-name>Juan Dela Cruz</h3>
      <p class="text-muted small mb-1" data-profile-id>ZPPSU-2024-0145</p>
      <p class="text-muted small" data-profile-email>student@zppsu.edu</p>
      <p class="text-muted small" data-profile-college>College of Engineering</p>
      <hr/>
      <p class="mb-1">Print Credits</p>
      <p class="h4 text-primary fw-bold" data-profile-credits>₱450.00</p>
    </div></div>
  </div>
  <div class="col-lg-8">
    <div class="card mb-4"><div class="card-body">
      <h3 class="h6 fw-semibold mb-3">Edit Profile</h3>
      <form id="profileForm">
        <div class="row g-3">
          <div class="col-md-6"><label class="form-label">Full Name</label><input class="form-control" id="pfName"/></div>
          <div class="col-md-6"><label class="form-label">Phone (+63)</label><input class="form-control" id="pfPhone" placeholder="+63 9XX XXX XXXX"/></div>
          <div class="col-md-6"><label class="form-label">GCash Number</label><input class="form-control" id="pfGcash"/></div>
          <div class="col-md-6"><label class="form-label">Maya Account</label><input class="form-control" id="pfMaya"/></div>
          <div class="col-12"><label class="form-label">College</label><input class="form-control" id="pfCollege"/></div>
          <div class="col-12"><button type="submit" class="btn btn-primary">Save Changes</button></div>
        </div>
      </form>
      <div id="profileSaved" class="alert alert-success mt-3 d-none">Profile updated successfully.</div>
    </div></div>
  </div>
</div>`,
  },
  {
    file: 'admin/dashboard.html', role: 'admin', title: 'Dashboard',
    extra: '<script src="../js/pages/admin-dashboard.js"></script>',
    body: `
<div class="row g-3 mb-4" id="adminStats"></div>
<div class="row g-4">
  <div class="col-lg-8"><div class="card"><div class="card-header fw-semibold">Recent Orders</div><div class="card-body p-0"><div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Order</th><th>Student</th><th>Amount</th><th>Status</th></tr></thead><tbody id="recentOrders"></tbody></table></div></div></div></div>
  <div class="col-lg-4"><div class="card"><div class="card-header fw-semibold">Quick Credit Top-Up</div><div class="card-body">
    <label class="form-label">Student ID</label><input class="form-control mb-2" id="topupId" placeholder="ZPPSU-2024-0145"/>
    <label class="form-label">Amount (₱)</label><input class="form-control mb-3" id="topupAmount" type="number" min="1" step="0.01"/>
    <button class="btn btn-primary w-100" id="topupBtn">Add Credits</button>
  </div></div></div>
</div>`,
  },
  {
    file: 'admin/orders.html', role: 'admin', title: 'Manage Orders',
    extra: '<script src="../js/pages/admin-orders.js"></script>',
    body: `<div class="card"><div class="card-body p-0"><div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Order ID</th><th>Student</th><th>File</th><th>Pages</th><th>Amount</th><th>Payment</th><th>Status</th><th></th></tr></thead><tbody id="adminOrdersTable"></tbody></table></div></div></div>`,
  },
  {
    file: 'admin/users.html', role: 'admin', title: 'Manage Users',
    extra: '<script src="../js/pages/admin-users.js"></script>',
    body: `<div class="card"><div class="card-body p-0"><div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>Name</th><th>ID</th><th>Email</th><th>Role</th><th>Credits</th></tr></thead><tbody id="usersTable"></tbody></table></div></div></div>`,
  },
  {
    file: 'admin/payments.html', role: 'admin', title: 'Edit Payments',
    extra: '<script src="../js/pages/admin-payments.js"></script>',
    body: `
<div class="row g-4">
  <div class="col-lg-6"><div class="card"><div class="card-header fw-semibold">Per-Page Rates (₱ PHP)</div><div class="card-body">
    <div class="mb-3"><label class="form-label">Document B&W (per page)</label><input class="form-control" id="priceBW" type="number" step="0.01"/></div>
    <div class="mb-3"><label class="form-label">Document Color (per page)</label><input class="form-control" id="priceColor" type="number" step="0.01"/></div>
    <div class="mb-3"><label class="form-label">Photo (per print)</label><input class="form-control" id="pricePhoto" type="number" step="0.01"/></div>
    <div class="mb-3"><label class="form-label">Large Format (base)</label><input class="form-control" id="priceLarge" type="number" step="0.01"/></div>
    <button class="btn btn-primary" id="savePricing">Save Rates</button>
  </div></div></div>
  <div class="col-lg-6"><div class="card"><div class="card-header fw-semibold">Payment Channels</div><div class="card-body">
    <p><i class="bi bi-phone text-success"></i> GCash: <span id="dispGcash"></span></p>
    <p><i class="bi bi-wallet2 text-primary"></i> Maya: <span id="dispMaya"></span></p>
    <p><i class="bi bi-bank text-info"></i> InstaPay: Enabled for ZPPSU accounts</p>
  </div></div></div>
</div>`,
  },
  {
    file: 'admin/notifications.html', role: 'admin', title: 'Notifications',
    extra: '<script src="../js/pages/admin-notifications.js"></script>',
    body: `<div id="notificationsList" class="d-flex flex-column gap-3"></div>`,
  },
  {
    file: 'admin/settings.html', role: 'admin', title: 'Settings',
    extra: '<script src="../js/pages/admin-settings.js"></script>',
    body: `
<div class="card" style="max-width:600px"><div class="card-body">
  <div class="mb-3"><label class="form-label">Shop Name</label><input class="form-control" id="shopName"/></div>
  <div class="row g-3 mb-3"><div class="col"><label class="form-label">Open</label><input class="form-control" id="openTime" type="time"/></div><div class="col"><label class="form-label">Close</label><input class="form-control" id="closeTime" type="time"/></div></div>
  <div class="mb-3"><label class="form-label">Auto-delete files after (hours)</label><input class="form-control" id="autoDelete" type="number"/></div>
  <button class="btn btn-primary" id="saveSettings">Save Settings</button>
</div></div>`,
  },
  {
    file: 'admin/profile.html', role: 'admin', title: 'Admin Profile',
    extra: '<script src="../js/pages/admin-profile.js"></script>',
    body: `
<div class="row g-4">
  <div class="col-lg-4"><div class="card text-center"><div class="card-body">
    <div class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3" style="width:80px;height:80px;font-size:1.75rem" data-session-initials>AD</div>
    <h3 class="h5" data-profile-name>Admin Doe</h3>
    <p class="text-muted small" data-profile-id>ADM-2024-001</p>
    <p class="text-muted small" data-profile-dept>IT & Printing Services</p>
  </div></div></div>
  <div class="col-lg-8"><div class="card"><div class="card-body">
    <form id="adminProfileForm">
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">Full Name</label><input class="form-control" id="apName"/></div>
        <div class="col-md-6"><label class="form-label">Phone (+63)</label><input class="form-control" id="apPhone"/></div>
        <div class="col-md-6"><label class="form-label">Department</label><input class="form-control" id="apDept"/></div>
        <div class="col-12"><button type="submit" class="btn btn-primary">Save Profile</button></div>
      </div>
    </form>
    <div id="adminProfileSaved" class="alert alert-success mt-3 d-none">Profile saved.</div>
  </div></div></div>
</div>`,
  },
];

// Write pages
for (const p of pages) {
  let html;
  if (p.build) html = p.build();
  else html = shell(p.role, p.file, p.title, p.body, p.extra || '');
  const out = path.join(ROOT, p.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html, 'utf8');
  console.log('Built', p.file);
}

fs.writeFileSync(path.join(ROOT, 'index.html'), `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta http-equiv="refresh" content="0;url=login.html"/><title>AZR PRINT'S</title></head>
<body><p>Redirecting to <a href="login.html">login</a>...</p></body></html>`);

console.log('Bootstrap build complete.');
