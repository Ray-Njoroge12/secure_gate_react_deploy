const normalizeBasePath = (basePath = '') => {
  if (!basePath || basePath === '/') {
    return '';
  }

  return basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
};

export const getPublicAssetUrl = (assetPath) => {
  const normalizedAssetPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
  const basePath = normalizeBasePath(process.env.PUBLIC_URL || '');

  return `${basePath}${normalizedAssetPath}`;
};

export const NOTIFICATION_SOUND_MP3 = getPublicAssetUrl('/sounds/notification.mp3');
export const NOTIFICATION_SOUND_OGG = getPublicAssetUrl('/sounds/notification.ogg');