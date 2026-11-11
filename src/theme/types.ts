import { ImageSourcePropType } from 'react-native';

export type ThemeId = 'blades' | 'wave' | 'cube' | 'quest' | 'pocket' | 'pixel' | 'flat';

export type Gradient = readonly [string, string, ...string[]];

export interface FontSpec {
  /** Loaded font family for normal text. `undefined` means the system font. */
  regular: string | undefined;
  /** Family for emphasised text. */
  strong: string | undefined;
  /** Multiplier on the base size, so wide pixel fonts and narrow ones read the same. */
  scale: number;
  /** Line height as a multiple of font size. */
  leading: number;
  /** Letter spacing as a fraction of font size. */
  tracking: number;
  upper: boolean;
  /** Extra shrink for buttons, tabs and chips, where wide fonts run out of room. Defaults to 1. */
  compact?: number;
  /** Only used with the system font, where weight comes from style rather than a file. */
  systemWeights?: { regular: '300' | '400' | '500'; strong: '600' | '700' | '800' };
}

export type Backdrop = 'rings' | 'ribbon' | 'cubes' | 'stars' | 'dots' | 'scanlines' | 'plain';
export type MeterStyle = 'gloss' | 'segments' | 'flat';
export type HeaderStyle = 'strip' | 'rule' | 'tag' | 'plain';
export type TabStyle = 'blade' | 'glow' | 'cursor' | 'pill';
export type ToastShape = 'pill' | 'card' | 'box';

export interface ThemeColors {
  /** Solid colour behind everything (also the native window background). */
  bg: string;
  bgGradient: Gradient;
  /** Tint for backdrop decorations. */
  backdropA: string;
  backdropB: string;
  panel: Gradient;
  panelBorder: string;
  /** Panel title strip (when the era has one). */
  header: Gradient;
  headerText: string;
  /** Recessed areas: meter tracks, inputs, list rows. */
  inset: string;
  insetBorder: string;
  text: string;
  textDim: string;
  accent: string;
  accentGradient: Gradient;
  accentText: string;
  accentAlt: string;
  hp: string;
  food: string;
  water: string;
  xp: string;
  danger: string;
  gold: string;
  silver: string;
  bronze: string;
  platinum: string;
  tabBar: Gradient;
  tabBorder: string;
  tabIdle: string;
  toast: Gradient;
  toastBorder: string;
  toastText: string;
  toastDim: string;
  /** Scrim behind dialogs. */
  overlay: string;
}

export interface ThemeShape {
  radius: number;
  panelRadius: number;
  border: number;
  /** Glassy highlight across the top half of panels and buttons. */
  gloss: boolean;
  /** Offset block shadow, the pixel-art way. */
  hardShadow: boolean;
  softShadow: boolean;
  meter: MeterStyle;
  header: HeaderStyle;
  tab: TabStyle;
}

export interface Theme {
  id: ThemeId;
  name: string;
  year: string;
  era: string;
  blurb: string;
  /** Alternate app icon registered natively for this era; null means the default icon. */
  appIcon: string | null;
  /** Preview of this era's app icon. */
  iconImage: ImageSourcePropType;
  statusBar: 'light' | 'dark';
  colors: ThemeColors;
  /** `number` is for big figures; eras whose display font has hard-to-read digits set it. */
  fonts: { display: FontSpec; body: FontSpec; number?: FontSpec };
  shape: ThemeShape;
  backdrop: Backdrop;
  toast: {
    place: 'top' | 'bottom';
    shape: ToastShape;
    /** Headline shown over a cleared quest, a milestone and a level-up. */
    quest: string;
    milestone: string;
    level: string;
  };
}
