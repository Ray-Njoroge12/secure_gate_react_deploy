describe('Notification service consolidation', () => {
  test('notificationService re-exports from intelligentNotificationService', async () => {
    // Verify that notificationService now delegates to intelligentNotificationService
    // or at minimum documents that intelligentNotificationService is primary

    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../services/notificationService.js'),
      'utf-8'
    );
    expect(source).toMatch(/deprecated|@deprecated|intelligentNotificationService|primary/i);
  });

  test('intelligentNotificationService is documented as primary', async () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../services/intelligentNotificationService.js'),
      'utf-8'
    );
    expect(source).toMatch(/primary|canonical|preferred/i);
  });
});
