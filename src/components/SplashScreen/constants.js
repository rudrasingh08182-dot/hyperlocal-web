export const DEFAULT_DURATION = 3000;
export const LOW_END_DURATION = 2200;

export const PARTICLE_COUNT = { high: 180, medium: 120, low: 60 };

export const FOOD_EMOJIS = [
  '🍕','🍔','🍟','🌭','🍿','🥓','🥚','🥞','🧇','🥐','🥨','🥯','🥖','🧀',
  '🥗','🥙','🥪','🌮','🌯','🫔','🥫','🍖','🍗','🥩','🍠','🥟','🥠','🥡',
  '🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍢','🍣','🍤','🍥','🍡','🍦',
  '🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯',
  '🍼','🥛','☕','🫖','🍵','🧃','🥤','🧋','🍶','🍾','🍷','🍸','🍹',
  '🍺','🍻','🥂','🥃','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐',
  '🍈','🍒','🍑','🍍','🥝','🥥','🥑','🍆','🥔','🥕','🌽','🌶️','🫑',
  '🥒','🥬','🥦','🧄','🧅','🍄','🥜','🫘','🌰','🍞',
];

export const DEVICE_TIER = { high: 6, medium: 4, low: 0 };

export const COLORS = {
  bgStart: '#1a0a2e', bgMid: '#2e1065', bgEnd: '#0f0620',
  primary: 0x7c3aed, secondary: 0xa855f7, accent: 0xd8b4fe, glow: 0x8b5cf6,
  textPrimary: '#ffffff', textSecondary: 'rgba(216,180,254,0.8)',
  progressBar: '#a855f7', skipButton: 'rgba(255,255,255,0.12)',
};

export const RING_COLORS = [0x7c3aed, 0xa855f7, 0xc084fc, 0xe9d5ff];

export const getDeviceTier = () => {
  const cores = navigator.hardwareConcurrency || 4;
  if (cores >= DEVICE_TIER.high) return 'high';
  if (cores >= DEVICE_TIER.medium) return 'medium';
  return 'low';
};

export const getDevicePixelRatio = () => {
  const dpr = window.devicePixelRatio || 1;
  const isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent);
  return isMobile ? Math.min(dpr, 1.5) : Math.min(dpr, 2);
};