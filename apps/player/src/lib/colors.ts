// McMusic Hub brand tokens — "Carbon & Chrome" design system.
// Replaces the neon purple/blue/green three-color cycle inherited from
// McJukebox with a single accent ("ice") used sparingly — "one glowing
// thing per view, never two," per the design system itself.

export const colors = {
  void: '#07080A',     // page background
  carbon: '#0C0E13',   // cards
  panel: '#14171D',    // raised surfaces
  line: '#1D222B',     // borders
  steel: '#8B95A6',    // muted text
  silver: '#C7CFDB',   // body text
  chrome: '#F4F7FB',   // headings
  ice: '#8FE3FF',      // the glow, and only the glow

  // Semantic aliases used across screens, so a screen reads
  // colors.background rather than colors.void directly.
  background: '#07080A',
  card: '#0C0E13',
  cardAlt: '#14171D',
  border: '#1D222B',
  textPrimary: '#F4F7FB',
  textSecondary: '#C7CFDB',
  textMuted: '#8B95A6',
  error: '#ff5c7a',
} as const;

// Five-stop gradient, hard turn at 52% — reads as metal, not flat grey.
// Used for primary buttons and the wordmark/icon chrome fill.
export const chromeGradient = ['#FFFFFF', '#C6D0DE', '#6F7989', '#EAF1F9', '#8E99A9'] as const;
export const chromeGradientCss = 'linear-gradient(180deg, #FFFFFF 0%, #C6D0DE 34%, #6F7989 54%, #EAF1F9 70%, #8E99A9 100%)';

export const fonts = {
  display: 'SpaceGrotesk_700Bold',   // wordmark, screen titles, numerals
  body: 'IBMPlexSans_400Regular',    // all interface text, default weight
  bodyMedium: 'IBMPlexSans_500Medium',
  bodySemiBold: 'IBMPlexSans_600SemiBold',
} as const;

