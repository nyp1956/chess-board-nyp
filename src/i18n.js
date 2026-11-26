export const LOCALES = ['da', 'en'];
// Bruges når browserens sprog ikke findes i LOCALES, og som fallback for manglende oversættelser.
export const DEFAULT_LOCALE = 'en';

export const LOCALE_NAMES = { da: 'Dansk', en: 'English' };

// PGN-tags og SAN-notation holdes på engelsk uanset sprog, da det er formatets standard.
export const MESSAGES = {
  da: {
    'board.label': 'Skakbræt',
    'board.promotion': 'Vælg brik ved forvandling',
    'piece.k': 'Konge',
    'piece.q': 'Dronning',
    'piece.r': 'Tårn',
    'piece.b': 'Løber',
    'piece.n': 'Springer',
    'piece.p': 'Bonde',
    'color.w': 'Hvid',
    'color.b': 'Sort',
    'controls.label': 'Kontrolbjælke',
    'controls.settings': 'Indstillinger',
    'controls.speed': 'Afspilningshastighed',
    'controls.speed.slow': 'Langsom',
    'controls.speed.normal': 'Standard',
    'controls.speed.fast': 'Hurtig',
    'controls.pieceStyle': 'Brikstil',
    'controls.pieceStyle.standard': 'Standard',
    'controls.pieceStyle.chess24': 'Chess24',
    'controls.boardTheme': 'Brættema',
    'controls.theme.clay': 'Terrakotta',
    'controls.theme.forest': 'Skov',
    'controls.theme.slate': 'Skifer',
    'controls.coordinates': 'Koordinater',
    'controls.thinFrame': 'Tynd kant i stedet for træramme',
    'controls.lastMoveArrow': 'Pil fra sidste træk',
    'controls.bestMoveArrow': 'Grøn pil for bedste træk',
    'controls.keyboard': 'Tastatur (piletaster, mellemrum)',
    'controls.language': 'Sprog',
    'controls.play': 'Auto-afspilning',
    'controls.stop': 'Stop afspilning',
    'controls.start': 'Start',
    'controls.back': 'Tilbage',
    'controls.forward': 'Frem',
    'controls.end': 'Slut',
    'controls.flip': 'Vend brættet',
    'controls.download': 'Download PGN',
  },
  en: {
    'board.label': 'Chess board',
    'board.promotion': 'Choose promotion piece',
    'piece.k': 'King',
    'piece.q': 'Queen',
    'piece.r': 'Rook',
    'piece.b': 'Bishop',
    'piece.n': 'Knight',
    'piece.p': 'Pawn',
    'color.w': 'White',
    'color.b': 'Black',
    'controls.label': 'Controls',
    'controls.settings': 'Settings',
    'controls.speed': 'Playback speed',
    'controls.speed.slow': 'Slow',
    'controls.speed.normal': 'Normal',
    'controls.speed.fast': 'Fast',
    'controls.pieceStyle': 'Piece style',
    'controls.pieceStyle.standard': 'Standard',
    'controls.pieceStyle.chess24': 'Chess24',
    'controls.boardTheme': 'Board theme',
    'controls.theme.clay': 'Clay',
    'controls.theme.forest': 'Forest',
    'controls.theme.slate': 'Slate',
    'controls.coordinates': 'Coordinates',
    'controls.thinFrame': 'Thin outline instead of wooden frame',
    'controls.lastMoveArrow': 'Arrow from last move',
    'controls.bestMoveArrow': 'Green arrow for best move',
    'controls.keyboard': 'Keyboard (arrow keys, space)',
    'controls.language': 'Language',
    'controls.play': 'Auto-play',
    'controls.stop': 'Stop playback',
    'controls.start': 'Start',
    'controls.back': 'Back',
    'controls.forward': 'Forward',
    'controls.end': 'End',
    'controls.flip': 'Flip board',
    'controls.download': 'Download PGN',
  },
};

export function isLocale(value) {
  return LOCALES.includes(value);
}

// Tager sprogkoden fra browserens sprog, fx 'da-DK' -> 'da'.
export function detectLocale(language = globalThis.navigator?.language) {
  const code = String(language ?? '').slice(0, 2).toLowerCase();
  return isLocale(code) ? code : DEFAULT_LOCALE;
}

export function translate(locale, key) {
  const messages = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  return messages[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
}
