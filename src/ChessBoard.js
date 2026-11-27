import ChessGame from './ChessGame.js';
import GameControls from './GameControls.js';
import { boardThemes, pieceStyles } from './pieceSets.js';
import { loadSavedSettings } from './settingsStorage.js';
import { detectLocale, isLocale, translate } from './i18n.js';
import './chess-board.css';

const FILES = 'abcdefgh';
const DRAG_THRESHOLD_PX = 4;
const PROMOTION_PIECES = ['q', 'r', 'b', 'n'];
const SVG_NS = 'http://www.w3.org/2000/svg';
// Rammen er 0.3 felter bred på hver side, så brættet måler 8.6 felter i hver retning.
const FRAME_UNITS = 0.3;
const UCI_PATTERN = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

const DEFAULT_SETTINGS = {
  flipped: false,
  draggable: true,
  pieceStyle: 'standard',
  theme: 'clay',
  showCoordinates: true,
  showLastMoveArrow: false,
  showBestMoveArrow: false,
  thinFrame: false,
  promotion: 'ask',
  controls: true,
  keyboard: true,
  playbackSpeed: 2000,
  locale: detectLocale(),
};

export default class ChessBoard {
  #game;
  #settings;
  #selected = null;
  #targets = [];
  #hovered = null;
  #drag = null;
  #press = null;
  #controls = null;
  #wrapper;
  #headers;
  #customAriaLabel;
  #promotionDialog = null;
  #promotionKeydown = null;
  #bestMove = null;
  #preview = null;

  constructor(container, options = {}) {
    if (!(container instanceof HTMLElement)) {
      throw new TypeError('ChessBoard needs a container element');
    }
    this.#game = options.game ?? new ChessGame(options.fen);
    this.#headers = { ...options.headers };
    this.#customAriaLabel = options.ariaLabel ?? null;
    const saved = loadSavedSettings((key, value) => this.#isValidSetting(key, value));
    this.#settings = { ...DEFAULT_SETTINGS, ...pickSettings(options), ...saved };
    this.#validateSettings(this.#settings);
    this.onMove = options.onMove ?? null;
    this.onSelect = options.onSelect ?? null;

    this.#wrapper = document.createElement('div');
    this.#wrapper.className = 'chess-board-wrapper';
    this.element = document.createElement('div');
    this.element.setAttribute('role', 'region');
    this.#wrapper.append(this.element);
    container.append(this.#wrapper);

    this.element.addEventListener('pointerdown', this.#handlePointerDown);
    this.element.addEventListener('pointermove', this.#handlePointerMove);
    this.element.addEventListener('pointerup', this.#handlePointerUp);
    this.element.addEventListener('pointercancel', this.#handlePointerCancel);
    this.element.addEventListener('dragstart', this.#handleDragStart);
    this.element.addEventListener('dragover', this.#handleDragOver);
    this.element.addEventListener('drop', this.#handleDrop);
    this.element.addEventListener('dragend', this.#handleDragEnd);

    this.render();
    this.#syncControls();
  }

  get game() {
    return this.#game;
  }

  get selectedSquare() {
    return this.#selected;
  }

  get settings() {
    return { ...this.#settings };
  }

  // PGN headers used when the game is downloaded. They override the defaults.
  get headers() {
    return { ...this.#headers };
  }

  setHeaders(headers = {}) {
    this.#headers = { ...headers };
  }

  configure(changes = {}) {
    const next = { ...this.#settings, ...pickSettings(changes) };
    this.#validateSettings(next);
    this.#settings = next;
    this.render();
    this.#syncControls();
  }

  flip() {
    this.configure({ flipped: !this.#settings.flipped });
  }

  setPosition(fen) {
    this.#game.load(fen);
    this.#selected = null;
    this.#targets = [];
    this.render();
    this.#emit('position');
  }

  reset() {
    this.#game.reset();
    this.#selected = null;
    this.#targets = [];
    this.render();
    this.#emit('position');
  }

  // Shows a line of SAN moves from fen, positioned at ply (default: the last move).
  setLine(fen, sans, ply = sans.length) {
    this.#game.loadLine(fen, sans, ply);
    this.#selected = null;
    this.#targets = [];
    this.render();
    this.#emit('position');
    return this.#game.ply();
  }

  // Viser et bedste træk (UCI, fx 'e2e4' eller 'e7e8q') som grøn pil i den aktuelle stilling. null fjerner pilen.
  // Pilen vises kun, når settings.showBestMoveArrow er sand, og forsvinder når stillingen ændres.
  setBestMove(uci) {
    if (uci === null) {
      this.#bestMove = null;
    } else {
      if (!UCI_PATTERN.test(uci)) throw new TypeError(`Invalid UCI move: ${uci}`);
      this.#bestMove = { uci, position: positionKey(this.#game.fen()) };
    }
    this.render();
  }

  // Viser stillingen efter et træk uden at ændre spillet. Visningen forsvinder, når stillingen ændres.
  // Returnerer false, hvis trækket er ulovligt.
  previewMove(from, to, promotion = 'q') {
    const game = new ChessGame(this.#game.fen());
    if (!game.move(from, to, promotion)) return false;
    this.#preview = { position: positionKey(this.#game.fen()), game };
    this.render();
    return true;
  }

  clearPreview() {
    if (!this.#preview) return;
    this.#preview = null;
    this.render();
  }

  // Sletter de træk, der ligger efter den aktuelle stilling. Returnerer antallet af slettede træk.
  deleteMovesAfterPosition() {
    const count = this.#game.deleteMovesAfterPosition();
    if (count > 0) {
      this.render();
      this.#emit('delete');
    }
    return count;
  }

  goTo(ply) {
    this.#game.goTo(ply);
    this.#selected = null;
    this.#targets = [];
    this.render();
    this.#emit('navigate');
    return this.#game.ply();
  }

  select(square) {
    const piece = this.#game.pieceAt(square);
    if (!piece || piece.color !== this.#game.turn()) return false;
    this.#selected = square;
    this.#targets = this.#game.legalTargets(square);
    this.render();
    this.onSelect?.(square, [...this.#targets]);
    return true;
  }

  clearSelection() {
    this.#selected = null;
    this.#targets = [];
    this.render();
  }

  // Ved promotion: 'ask' åbner et valg af brik og returnerer null. Ellers bruges settings.promotion.
  makeMove(from, to) {
    if (this.#settings.promotion === 'ask') {
      if (!this.#isPromotion(from, to)) return this.#applyMove(from, to, 'q');
      this.#openPromotion(from, to);
      return null;
    }
    return this.#applyMove(from, to, this.#settings.promotion);
  }

  #applyMove(from, to, promotion) {
    const move = this.#game.move(from, to, promotion);
    this.#selected = null;
    this.#targets = [];
    this.render();
    if (move) {
      this.onMove?.(move, this);
      this.#emit('move');
    }
    return move;
  }

  undo() {
    const move = this.#game.undo();
    this.#selected = null;
    this.#targets = [];
    this.render();
    if (move) this.#emit('navigate');
    return move;
  }

  redo() {
    const move = this.#game.redo();
    this.#selected = null;
    this.#targets = [];
    this.render();
    if (move) this.#emit('navigate');
    return move;
  }

  render() {
    this.#closePromotion();
    const { flipped, pieceStyle, theme, showCoordinates, thinFrame, keyboard, locale } = this.#settings;
    this.element.setAttribute('aria-label', this.#customAriaLabel ?? translate(locale, 'board.label'));
    this.element.className = [
      'chess-board',
      `chess-board--${theme}`,
      `chess-board--pieces-${pieceStyle}`,
      flipped && 'chess-board--flipped',
      !showCoordinates && 'chess-board--no-coordinates',
      thinFrame && 'chess-board--thin-frame',
    ].filter(Boolean).join(' ');
    if (keyboard) this.element.tabIndex = 0;
    else this.element.removeAttribute('tabindex');
    this.element.replaceChildren(...this.#buildCells(), ...this.#buildArrows());
  }

  // Stillingen der vises: forhåndsvisningen, hvis den gælder for den aktuelle stilling, ellers selve spillet.
  #displayGame() {
    return this.#preview?.position === positionKey(this.#game.fen()) ? this.#preview.game : this.#game;
  }

  #buildArrows() {
    const { showLastMoveArrow, showBestMoveArrow, flipped, thinFrame } = this.#settings;
    const frame = thinFrame ? 0 : FRAME_UNITS;
    const arrows = [];
    const shown = this.#displayGame();
    const lastMove = showLastMoveArrow ? shown.lastMove() : null;
    if (lastMove) {
      arrows.push(arrowElement('chess-board__arrow chess-board__arrow--last-move', arrowMarkup(lastMove.from, lastMove.to, flipped, frame), frame));
    }
    const bestMove = showBestMoveArrow && shown === this.#game ? this.#currentBestMove() : null;
    if (bestMove) {
      arrows.push(arrowElement('chess-board__arrow chess-board__arrow--best', arrowMarkup(bestMove.slice(0, 2), bestMove.slice(2, 4), flipped, frame), frame));
    }
    return arrows;
  }

  #currentBestMove() {
    if (this.#bestMove?.position !== positionKey(this.#game.fen())) return null;
    return this.#bestMove.uci;
  }

  destroy() {
    this.#controls?.destroy();
    this.#controls = null;
    this.#drag?.ghost?.remove();
    this.#drag = null;
    this.#press = null;
    this.#wrapper.remove();
  }

  #isPromotion(from, to) {
    const piece = this.#game.pieceAt(from);
    const lastRank = piece?.color === 'w' ? '8' : '1';
    return piece?.type === 'p' && to[1] === lastRank && this.#game.legalTargets(from).includes(to);
  }

  // Vinduet dækker brættet. Valget sker først, når brikken er valgt.
  #openPromotion(from, to) {
    const color = this.#game.pieceAt(from).color;
    const { pieceStyle, locale } = this.#settings;
    const activePieces = pieceStyles[pieceStyle];

    const backdrop = document.createElement('div');
    backdrop.className = 'chess-board__promotion';
    const dialog = document.createElement('div');
    dialog.className = 'chess-board__promotion-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', translate(locale, 'board.promotion'));
    for (const type of PROMOTION_PIECES) {
      const name = translate(locale, `piece.${type}`);
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'chess-board__promotion-choice';
      choice.title = name;
      choice.setAttribute('aria-label', name);
      const image = document.createElement('img');
      image.src = activePieces[color === 'w' ? type.toUpperCase() : type];
      image.alt = '';
      choice.append(image);
      choice.addEventListener('click', () => this.#choosePromotion(from, to, type));
      dialog.append(choice);
    }
    backdrop.append(dialog);
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) this.#cancelPromotion();
    });
    // Lyttes på dokumentet, så Escape virker uanset hvor fokus står. Piletaster navigerer ikke brættet.
    this.#promotionKeydown = (event) => {
      event.stopPropagation();
      if (event.key === 'Escape') this.#cancelPromotion();
    };
    document.addEventListener('keydown', this.#promotionKeydown, true);
    this.element.append(backdrop);
    this.#promotionDialog = backdrop;
    // Udskudt, fordi brættets mousedown-standard ellers flytter fokus tilbage til brættet.
    setTimeout(() => {
      if (this.#promotionDialog === backdrop) dialog.querySelector('button').focus({ preventScroll: true });
    });
  }

  #choosePromotion(from, to, promotion) {
    this.#closePromotion();
    this.#applyMove(from, to, promotion);
  }

  #cancelPromotion() {
    this.#closePromotion();
    this.clearSelection();
  }

  #closePromotion() {
    this.#promotionDialog?.remove();
    this.#promotionDialog = null;
    if (this.#promotionKeydown) document.removeEventListener('keydown', this.#promotionKeydown, true);
    this.#promotionKeydown = null;
  }

  #syncControls() {
    if (this.#settings.controls && !this.#controls) {
      this.#controls = new GameControls(this);
    } else if (!this.#settings.controls && this.#controls) {
      this.#controls.destroy();
      this.#controls = null;
    } else {
      this.#controls?.update();
    }
  }

  // Dispatches chessboard:change so controls and host pages can react.
  // reason: 'move' | 'navigate' | 'position' | 'delete'
  #emit(reason) {
    this.element.dispatchEvent(new CustomEvent('chessboard:change', {
      bubbles: true,
      detail: { reason, ply: this.#game.ply(), total: this.#game.total() },
    }));
  }

  #buildCells() {
    const { flipped, pieceStyle, locale } = this.#settings;
    const files = flipped ? [...FILES].reverse() : [...FILES];
    const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const cells = [
      createCell('span', 'chess-board__corner chess-board__corner--top-left', 1, 1),
      createCell('span', 'chess-board__corner chess-board__corner--top-right', 10, 1),
      createCell('span', 'chess-board__corner chess-board__corner--bottom-left', 1, 10),
      createCell('span', 'chess-board__corner chess-board__corner--bottom-right', 10, 10),
    ];

    files.forEach((file, column) => {
      cells.push(createLabel(file, 'top', column + 2, 1));
      cells.push(createLabel(file, 'bottom', column + 2, 10));
    });
    ranks.forEach((rank, row) => {
      cells.push(createLabel(String(rank), 'left', 1, row + 2));
      cells.push(createLabel(String(rank), 'right', 10, row + 2));
    });

    const activePieces = pieceStyles[pieceStyle];
    const shown = this.#displayGame();
    ranks.forEach((rank, row) => {
      files.forEach((file, column) => {
        const name = `${file}${rank}`;
        const isDark = (FILES.indexOf(file) + rank) % 2 === 1;
        const square = createCell('div', `chess-board__square ${isDark ? 'chess-board__square--dark' : 'chess-board__square--light'}`, column + 2, row + 2);
        square.dataset.square = name;
        if (name === this.#selected) square.classList.add('chess-board__square--selected');
        if (this.#targets.includes(name)) square.classList.add('chess-board__square--target');
        if (name === this.#hovered) square.classList.add('chess-board__square--hover');

        const piece = shown.pieceAt(name);
        if (piece) {
          const symbol = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
          const image = document.createElement('img');
          image.className = 'chess-board__piece';
          if (this.#drag?.from === name) image.classList.add('chess-board__piece--dragging');
          image.draggable = this.#canMoveFrom(name);
          image.src = activePieces[symbol];
          image.alt = `${translate(locale, `color.${piece.color}`)} ${translate(locale, `piece.${piece.type}`)}`;
          square.append(image);
        }
        cells.push(square);
      });
    });
    return cells;
  }

  #handlePointerDown = (event) => {
    // Klik på valget af brik må ikke også ramme brættet under vinduet.
    if (event.button !== 0 || this.#promotionDialog) return;
    const square = this.#squareAt(event.clientX, event.clientY);
    if (!square) return;
    if (this.element.tabIndex >= 0) this.element.focus({ preventScroll: true });

    if (this.#selected && this.#targets.includes(square)) {
      this.makeMove(this.#selected, square);
      return;
    }

    const piece = this.#game.pieceAt(square);
    if (!piece || piece.color !== this.#game.turn()) {
      if (this.#selected) this.clearSelection();
      return;
    }

    const wasSelected = this.#selected === square;
    if (!this.#settings.draggable) {
      if (wasSelected) this.clearSelection();
      else this.select(square);
      return;
    }
    // Mus bruger native HTML5 drag. Markeringen sættes ved pointerup, hvis brikken ikke trækkes.
    if (event.pointerType === 'mouse') {
      this.#press = { pointerId: event.pointerId, square, wasSelected };
      return;
    }
    if (!wasSelected) this.select(square);
    this.#beginDrag(event, square, wasSelected);
  };

  #handlePointerMove = (event) => {
    const drag = this.#matchDrag(event);
    if (!drag) return;

    if (!drag.moved) {
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (distance < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      drag.ghost.hidden = false;
    }
    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
    this.#setHovered(this.#squareAt(event.clientX, event.clientY));
  };

  #handlePointerUp = (event) => {
    if (this.#promotionDialog) return;
    const press = this.#press;
    if (press?.pointerId === event.pointerId) {
      this.#press = null;
      if (press.wasSelected) this.clearSelection();
      else this.select(press.square);
      return;
    }

    const drag = this.#matchDrag(event);
    if (!drag) return;

    const target = this.#squareAt(event.clientX, event.clientY);
    this.#endDrag(drag);

    if (!drag.moved) {
      if (drag.wasSelected) this.clearSelection();
      else this.render();
      return;
    }
    if (target === drag.from) this.render();
    else if (target && this.#targets.includes(target)) this.makeMove(drag.from, target);
    else this.clearSelection();
  };

  #handlePointerCancel = (event) => {
    if (this.#press?.pointerId === event.pointerId) this.#press = null;
    const drag = this.#matchDrag(event);
    if (!drag) return;
    this.#endDrag(drag);
    this.clearSelection();
  };

  #beginDrag(event, square, wasSelected) {
    const pieceElement = this.element.querySelector(`[data-square="${square}"] .chess-board__piece`);
    const rect = pieceElement.getBoundingClientRect();
    const ghost = pieceElement.cloneNode();
    ghost.className = 'chess-board__piece chess-board__piece--ghost';
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.hidden = true;
    document.body.append(ghost);

    this.#drag = {
      pointerId: event.pointerId,
      from: square,
      wasSelected,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      ghost,
    };
    this.element.setPointerCapture(event.pointerId);
    this.render();
    this.element.querySelector(`[data-square="${square}"] .chess-board__piece`)?.classList.add('chess-board__piece--dragging');
  }

  #handleDragStart = (event) => {
    const square = squareOf(event.target);
    if (!square || !this.#canMoveFrom(square)) {
      event.preventDefault();
      return;
    }
    if (this.#drag && !this.#drag.native) this.#endDrag(this.#drag);
    this.#press = null;
    this.#drag = { native: true, from: square };
    this.#selected = square;
    this.#targets = this.#game.legalTargets(square);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', square);
    // Felterne opdateres først efter dragstart, så kilde-brikken ikke fjernes fra DOM under træk.
    setTimeout(() => this.#refreshHighlights());
    this.onSelect?.(square, [...this.#targets]);
  };

  #handleDragOver = (event) => {
    if (!this.#drag?.native) return;
    const square = squareOf(event.target);
    this.#setHovered(square);
    if (this.#targets.includes(square)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  };

  #handleDrop = (event) => {
    const drag = this.#drag;
    if (!drag?.native) return;
    event.preventDefault();
    const square = squareOf(event.target);
    this.#drag = null;
    this.#hovered = null;
    if (this.#targets.includes(square)) this.makeMove(drag.from, square);
    else this.clearSelection();
  };

  // Kører også ved annulleret træk. Ved et gennemført træk er kilde-brikken allerede fjernet fra DOM.
  #handleDragEnd = () => {
    if (!this.#drag?.native) return;
    this.#drag = null;
    this.#hovered = null;
    this.clearSelection();
  };

  #endDrag(drag) {
    this.#drag = null;
    this.#hovered = null;
    drag.ghost.remove();
    if (this.element.hasPointerCapture(drag.pointerId)) {
      this.element.releasePointerCapture(drag.pointerId);
    }
  }

  #matchDrag(event) {
    const drag = this.#drag;
    return drag && drag.pointerId === event.pointerId ? drag : null;
  }

  #setHovered(square) {
    const next = this.#targets.includes(square) ? square : null;
    if (next === this.#hovered) return;
    this.element.querySelector('.chess-board__square--hover')?.classList.remove('chess-board__square--hover');
    this.#hovered = next;
    if (next) this.element.querySelector(`[data-square="${next}"]`)?.classList.add('chess-board__square--hover');
  }

  #canMoveFrom(square) {
    const piece = this.#game.pieceAt(square);
    return this.#settings.draggable && !!piece && piece.color === this.#game.turn();
  }

  #refreshHighlights() {
    for (const square of this.element.querySelectorAll('[data-square]')) {
      const name = square.dataset.square;
      square.classList.toggle('chess-board__square--selected', name === this.#selected);
      square.classList.toggle('chess-board__square--target', this.#targets.includes(name));
      square.classList.toggle('chess-board__square--hover', name === this.#hovered);
      square.querySelector('.chess-board__piece')?.classList.toggle('chess-board__piece--dragging', name === this.#drag?.from);
    }
  }

  #squareAt(x, y) {
    const element = document.elementFromPoint(x, y);
    if (!element || !this.element.contains(element)) return null;
    return element.closest('[data-square]')?.dataset.square ?? null;
  }

  #isValidSetting(key, value) {
    if (typeof value !== typeof DEFAULT_SETTINGS[key]) return false;
    try {
      this.#validateSettings({ ...DEFAULT_SETTINGS, [key]: value });
      return true;
    } catch {
      return false;
    }
  }

  #validateSettings({ pieceStyle, theme, promotion, playbackSpeed, locale }) {
    if (!pieceStyles[pieceStyle]) throw new RangeError(`Unknown piece style: ${pieceStyle}`);
    if (!boardThemes.includes(theme)) throw new RangeError(`Unknown board theme: ${theme}`);
    if (![...PROMOTION_PIECES, 'ask'].includes(promotion)) throw new RangeError(`Unknown promotion piece: ${promotion}`);
    if (!(playbackSpeed > 0)) throw new RangeError(`Playback speed must be positive: ${playbackSpeed}`);
    if (!isLocale(locale)) throw new RangeError(`Unknown locale: ${locale}`);
  }
}

function pickSettings(source) {
  const picked = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  return picked;
}

// Midtpunkt af et felt i SVG-enheder, med samme grid som brættet. Øverste række er rank 8 (eller 1 ved flipped).
function squareCenter(square, flipped, frame) {
  const file = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  const column = flipped ? 7 - file : file;
  const row = flipped ? rank - 1 : 8 - rank;
  return { x: frame + column + 0.5, y: frame + row + 0.5 };
}

function arrowElement(className, markup, frame) {
  const size = 8 + 2 * frame;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = markup;
  return svg;
}

// Klokketal (halvtræk og træknummer) ignoreres, så samme stilling altid giver samme nøgle.
function positionKey(fen) {
  return fen.split(' ').slice(0, 4).join(' ');
}

function arrowMarkup(fromSquare, toSquare, flipped, frame) {
  const from = squareCenter(fromSquare, flipped, frame);
  const to = squareCenter(toSquare, flipped, frame);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const ux = (to.x - from.x) / length;
  const uy = (to.y - from.y) / length;
  const headLength = 0.42;
  const headHalfWidth = 0.26;
  const baseX = to.x - ux * headLength;
  const baseY = to.y - uy * headLength;
  const tip = `${to.x.toFixed(3)},${to.y.toFixed(3)}`;
  const left = `${(baseX - uy * headHalfWidth).toFixed(3)},${(baseY + ux * headHalfWidth).toFixed(3)}`;
  const right = `${(baseX + uy * headHalfWidth).toFixed(3)},${(baseY - ux * headHalfWidth).toFixed(3)}`;
  return `<line class="chess-board__arrow-shaft" x1="${from.x.toFixed(3)}" y1="${from.y.toFixed(3)}" x2="${baseX.toFixed(3)}" y2="${baseY.toFixed(3)}"/>`
    + `<polygon class="chess-board__arrow-head" points="${tip} ${left} ${right}"/>`;
}

function createCell(tagName, className, column, row) {
  const cell = document.createElement(tagName);
  cell.className = className;
  cell.style.gridColumn = String(column);
  cell.style.gridRow = String(row);
  return cell;
}

function createLabel(text, side, column, row) {
  const label = createCell('span', `chess-board__notation chess-board__notation--${side}`, column, row);
  label.textContent = text;
  return label;
}

function squareOf(target) {
  return target instanceof Element ? target.closest('[data-square]')?.dataset.square ?? null : null;
}
