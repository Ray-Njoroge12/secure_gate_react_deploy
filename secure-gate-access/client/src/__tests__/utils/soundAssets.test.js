describe('soundAssets', () => {
  const originalPublicUrl = process.env.PUBLIC_URL;

  afterEach(() => {
    process.env.PUBLIC_URL = originalPublicUrl;
    jest.resetModules();
  });

  test('builds root-relative asset URL when PUBLIC_URL is empty', () => {
    process.env.PUBLIC_URL = '';
    const { getPublicAssetUrl } = require('../../utils/soundAssets');

    expect(getPublicAssetUrl('/sounds/notification.mp3')).toBe('/sounds/notification.mp3');
    expect(getPublicAssetUrl('sounds/notification.ogg')).toBe('/sounds/notification.ogg');
  });

  test('prefixes asset URL with normalized PUBLIC_URL', () => {
    process.env.PUBLIC_URL = '/secure-gate/';
    const { getPublicAssetUrl } = require('../../utils/soundAssets');

    expect(getPublicAssetUrl('/sounds/notification.mp3')).toBe('/secure-gate/sounds/notification.mp3');
  });

  test('exports notification sound constants with PUBLIC_URL applied', () => {
    process.env.PUBLIC_URL = '/tenant-app';
    const {
      NOTIFICATION_SOUND_MP3,
      NOTIFICATION_SOUND_OGG
    } = require('../../utils/soundAssets');

    expect(NOTIFICATION_SOUND_MP3).toBe('/tenant-app/sounds/notification.mp3');
    expect(NOTIFICATION_SOUND_OGG).toBe('/tenant-app/sounds/notification.ogg');
  });
});
