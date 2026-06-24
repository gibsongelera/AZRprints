/**
 * Demo seed data – Philippine printing shop (ZPPSU)
 */
(function (global) {
  var SEED = {
    brand: { name: "AZR PRINT'S", tagline: 'ZPPSU Printing Services' },
    pricing: {
      documentBW: 2.0,
      documentColor: 5.0,
      photo: 10.0,
      largeFormat: 50.0,
      binding: 25.0,
    },
    paymentMethods: ['GCash', 'Maya', 'InstaPay'],
    users: [
      {
        id: 'admin',
        email: 'admin@zppsu.edu',
        password: 'admin123',
        role: 'admin',
        name: 'Admin Doe',
        staffId: 'ADM-2024-001',
        department: 'IT & Printing Services',
        phone: '+63 912 345 6789',
        redirect: 'admin/dashboard.html',
      },
      {
        id: 'user',
        email: 'student@zppsu.edu',
        password: 'user123',
        role: 'user',
        name: 'Juan Dela Cruz',
        studentId: 'ZPPSU-2024-0145',
        college: 'College of Engineering',
        phone: '+63 917 888 1234',
        credits: 450.0,
        gcash: '0917-888-1234',
        maya: 'juan.delacruz@paymaya.com',
        redirect: 'user/dashboard.html',
      },
    ],
    orders: [
      { id: 'ORD-2401', userId: 'user', fileName: 'Thesis_Chapter1.pdf', pages: 24, type: 'document', color: 'bw', copies: 2, amount: 96.0, status: 'completed', date: '2026-06-18', payment: 'GCash' },
      { id: 'ORD-2402', userId: 'user', fileName: 'Lab_Report.docx', pages: 8, type: 'document', color: 'color', copies: 1, amount: 40.0, status: 'in_progress', date: '2026-06-19', payment: 'Maya' },
      { id: 'ORD-2403', userId: 'user', fileName: 'ID_Photo.jpg', pages: 1, type: 'photo', color: 'color', copies: 4, amount: 40.0, status: 'pending', date: '2026-06-20', payment: 'GCash' },
      { id: 'ORD-2398', userId: 'user', fileName: 'Research_Poster.pdf', pages: 1, type: 'large', color: 'color', copies: 1, amount: 50.0, status: 'completed', date: '2026-06-15', payment: 'InstaPay' },
    ],
    notifications: [
      { id: 1, type: 'success', title: 'Payment received', message: '₱96.00 GCash payment confirmed for ORD-2401.', time: '2 hours ago' },
      { id: 2, type: 'warning', title: 'Low paper stock', message: 'A4 bond paper below 500 sheets. Restock recommended.', time: '5 hours ago' },
      { id: 3, type: 'info', title: 'New order', message: 'Juan Dela Cruz submitted ORD-2403 (₱40.00).', time: 'Today' },
    ],
    settings: {
      shopName: "AZR PRINT'S",
      openTime: '07:00',
      closeTime: '18:00',
      autoDeleteHours: 48,
      gcashNumber: '0917-000-0000',
      mayaNumber: 'azrprints@paymaya.com',
    },
  };

  global.PrintPortSeed = SEED;
})(window);
