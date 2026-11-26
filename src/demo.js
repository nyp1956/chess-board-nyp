import { ChessBoard, ChessGame } from './index.js';
import './demo.css';

const DEFAULT_WIDTH = 560;

const DEMO_TEXT = {
  da: {
    'page.title': 'chess-board-nyp – demo',
    'header.intro': 'Brættets størrelse følger det parent-element, det er placeret i.',
    'main.heading': 'Hovedbræt',
    'size.label': 'Bredde på parent:',
    'size.unit': 'px',
    'control.heading': 'Kontrol',
    'control.newGame': 'Nyt spil',
    'fen.label': 'Indlæs FEN',
    'fen.submit': 'Indlæs',
    'fen.error': 'Ugyldig FEN: {message}',
    'bestMove.label': 'Bedste træk (UCI, fx e2e4)',
    'bestMove.submit': 'Vis',
    'bestMove.error': 'Ugyldigt træk: {move}',
    'options.language': 'Sprog for brættet',
    'options.controls': 'Vis kontrolbjælke under brættet',
    'options.promotion': 'Bondeforvandling',
    'promotion.ask': 'Spørg (valg i brættet)',
    'promotion.q': 'Dronning',
    'promotion.r': 'Tårn',
    'promotion.b': 'Løber',
    'promotion.n': 'Springer',
    'options.draggable': 'Tillad træk med musen/fingeren',
    'moves.heading': 'Trækliste',
    'sizes.heading': 'Forskellige parent-bredder',
    'sizes.intro': 'Hvert bræt er uafhængigt og har sit eget spil. Mellem-brættet har kontrolbjælken skjult og viser kun en stilling.',
    'sizes.small': '260 px',
    'sizes.medium': '360 px, forest + chess24, uden kontrol',
    'sizes.full': '100 %, slate, vendt',
    'color.w': 'Hvid',
    'color.b': 'Sort',
    'status.turn': '{color} er til træk.',
    'status.check': '{color} er i skak. {color} er til træk.',
    'status.checkmate': 'Mat. {color} vinder.',
    'status.draw': 'Remis.',
  },
  en: {
    'page.title': 'chess-board-nyp – demo',
    'header.intro': "The board's size follows the parent element it is placed in.",
    'main.heading': 'Main board',
    'size.label': 'Parent width:',
    'size.unit': 'px',
    'control.heading': 'Controls',
    'control.newGame': 'New game',
    'fen.label': 'Load FEN',
    'fen.submit': 'Load',
    'fen.error': 'Invalid FEN: {message}',
    'bestMove.label': 'Best move (UCI, e.g. e2e4)',
    'bestMove.submit': 'Show',
    'bestMove.error': 'Invalid move: {move}',
    'options.language': 'Board language',
    'options.controls': 'Show control bar below the board',
    'options.promotion': 'Pawn promotion',
    'promotion.ask': 'Ask (choose on the board)',
    'promotion.q': 'Queen',
    'promotion.r': 'Rook',
    'promotion.b': 'Bishop',
    'promotion.n': 'Knight',
    'options.draggable': 'Allow moves with mouse/finger',
    'moves.heading': 'Move list',
    'sizes.heading': 'Different parent widths',
    'sizes.intro': 'Each board is independent and has its own game. The medium board has the control bar hidden and shows only a position.',
    'sizes.small': '260 px',
    'sizes.medium': '360 px, forest + chess24, no controls',
    'sizes.full': '100 %, slate, flipped',
    'color.w': 'White',
    'color.b': 'Black',
    'status.turn': '{color} to move.',
    'status.check': '{color} is in check. {color} to move.',
    'status.checkmate': 'Checkmate. {color} wins.',
    'status.draw': 'Draw.',
  },
};

const mainFrame = document.querySelector('#main-board-frame');
const sizeInput = document.querySelector('#size');
const sizeOutput = document.querySelector('#size-output');
const statusEl = document.querySelector('#status');
const currentFenEl = document.querySelector('#current-fen');
const moveListEl = document.querySelector('#move-list');
const fenForm = document.querySelector('#fen-form');
const fenInput = document.querySelector('#fen-input');
const fenError = document.querySelector('#fen-error');
const bestMoveForm = document.querySelector('#best-move-form');
const bestMoveInput = document.querySelector('#best-move-input');
const bestMoveError = document.querySelector('#best-move-error');
const promotionSelect = document.querySelector('#promotion');
const languageSelect = document.querySelector('#language');
const controlsInput = document.querySelector('#controls');
const draggableInput = document.querySelector('#draggable');
const newGameButton = document.querySelector('#new-game');

let demoLocale;

const game = new ChessGame();
const board = new ChessBoard(mainFrame, {
  game,
  promotion: promotionSelect.value,
  controls: controlsInput.checked,
  draggable: draggableInput.checked,
});
const boards = [board, ...createSecondaryBoards()];

applyLanguage(board.settings.locale);
setMainWidth(DEFAULT_WIDTH);

sizeInput.addEventListener('input', () => setMainWidth(Number(sizeInput.value)));
languageSelect.addEventListener('change', () => changeLanguage(languageSelect.value));
promotionSelect.addEventListener('change', () => board.configure({ promotion: promotionSelect.value }));
controlsInput.addEventListener('change', () => board.configure({ controls: controlsInput.checked }));
draggableInput.addEventListener('change', () => board.configure({ draggable: draggableInput.checked }));

mainFrame.addEventListener('chessboard:change', refresh);

newGameButton.addEventListener('click', () => {
  fenError.textContent = '';
  board.reset();
});

fenForm.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    board.setPosition(fenInput.value.trim());
    fenError.textContent = '';
    fenInput.value = '';
  } catch (error) {
    fenError.textContent = t('fen.error', { message: error.message });
  }
});

// Tomt felt fjerner pilen.
bestMoveForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const uci = bestMoveInput.value.trim().toLowerCase();
  try {
    board.setBestMove(uci || null);
    bestMoveError.textContent = '';
  } catch {
    bestMoveError.textContent = t('bestMove.error', { move: uci });
  }
});

function setMainWidth(width) {
  mainFrame.style.width = `${width}px`;
  sizeInput.value = String(width);
  sizeOutput.textContent = String(width);
}

function refresh() {
  const status = game.status();
  const turn = t(`color.${game.turn()}`);
  const opponent = t(`color.${game.turn() === 'w' ? 'b' : 'w'}`);

  if (status.checkmate) statusEl.textContent = t('status.checkmate', { color: opponent });
  else if (status.draw) statusEl.textContent = t('status.draw');
  else if (status.inCheck) statusEl.textContent = t('status.check', { color: turn });
  else statusEl.textContent = t('status.turn', { color: turn });

  currentFenEl.textContent = game.fen();

  const line = game.line();
  const ply = game.ply();
  moveListEl.replaceChildren(...line.map((san, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = san;
    if (index + 1 === ply) button.setAttribute('aria-current', 'step');
    button.addEventListener('click', () => board.goTo(index + 1));
    item.append(button);
    return item;
  }));
}

function createSecondaryBoards() {
  return [
    new ChessBoard(document.querySelector('#board-small')),
    new ChessBoard(document.querySelector('#board-medium'), {
      theme: 'forest',
      pieceStyle: 'chess24',
      controls: false,
    }),
    new ChessBoard(document.querySelector('#board-full'), {
      theme: 'slate',
      flipped: true,
    }),
  ];
}

function changeLanguage(locale) {
  applyLanguage(locale);
}

function applyLanguage(locale) {
  demoLocale = locale;
  for (const instance of boards) instance.configure({ locale });
  languageSelect.value = locale;
  document.documentElement.lang = locale;
  document.title = t('page.title');
  for (const element of document.querySelectorAll('[data-demo-i18n]')) {
    element.textContent = t(element.dataset.demoI18n);
  }
  refresh();
}

function t(key, values = {}) {
  return DEMO_TEXT[demoLocale][key].replace(/\{(\w+)\}/g, (_, name) => values[name]);
}
