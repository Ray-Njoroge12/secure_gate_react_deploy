let sharedAudioContext = null;

const getAudioContextClass = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.AudioContext || window.webkitAudioContext || null;
};

const getAudioContext = async () => {
  const AudioContextClass = getAudioContextClass();

  if (!AudioContextClass) {
    return null;
  }

  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContextClass();
  }

  if (sharedAudioContext.state === 'suspended') {
    try {
      await sharedAudioContext.resume();
    } catch {
      return null;
    }
  }

  return sharedAudioContext;
};

export const supportsNotificationAudio = () => Boolean(getAudioContextClass());

export const playNotificationTone = async ({
  frequency = 880,
  duration = 0.12,
  volume = 0.035
} = {}) => {
  const context = await getAudioContext();

  if (!context) {
    return false;
  }

  try {
    const startAt = context.currentTime;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(440, frequency * 0.75), startAt + duration);

    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(startAt);
    oscillator.stop(startAt + duration);

    oscillator.onended = () => {
      oscillator.disconnect();
      gainNode.disconnect();
    };

    return true;
  } catch {
    return false;
  }
};

export const closeAudioContext = async () => {
  if (sharedAudioContext) {
    try {
      await sharedAudioContext.close();
    } catch {
      // ignore — context may already be closed
    } finally {
      sharedAudioContext = null;
    }
  }
};

export const triggerVisualNotificationFallback = () => {
  if (typeof document === 'undefined') return;
  const bell = document.querySelector('[data-notification-bell]');
  if (!bell) return;
  bell.classList.remove('notification-pulse');
  // Force reflow so re-adding the class triggers the animation
  void bell.offsetWidth;
  bell.classList.add('notification-pulse');
};
