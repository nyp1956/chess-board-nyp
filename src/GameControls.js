import { boardThemes, pieceStyles } from './pieceSets.js';
import { saveSettings } from './settingsStorage.js';
import { translate } from './i18n.js';
import './chess-game-controls.css';

const SPEEDS = [
  { value: 3000, key: 'controls.speed.slow' },
  { value: 2000, key: 'controls.speed.normal' },
  { value: 1000, key: 'controls.speed.fast' },
];

const SETTINGS_ICON = '<svg class="chess-game-controls__icon" aria-hidden="true" viewBox="0 0 512 512" focusable="false"><path fill="currentColor" d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 0 0 0 160z"></path></svg>';

const ICONS = {
  play: '<polygon points="7,4 20,12 7,20" fill="currentColor" stroke="none"/>',
  pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/>',
  start: '<line x1="5" y1="4" x2="5" y2="20"/><polygon points="19,4 19,20 8,12" fill="currentColor" stroke="none"/>',
  previous: '<polygon points="17,4 17,20 6,12" fill="currentColor" stroke="none"/>',
  next: '<polygon points="7,4 7,20 18,12" fill="currentColor" stroke="none"/>',
  end: '<line x1="19" y1="4" x2="19" y2="20"/><polygon points="5,4 5,20 16,12" fill="currentColor" stroke="none"/>',
  flip: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
};

function icon(name) {
  return `<svg class="chess-game-controls__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

function button(action, labelKey, iconName) {
  return `<button type="button" class="chess-game-controls__button" data-action="${action}" data-i18n-label="${labelKey}">${icon(iconName)}</button>`;
}

const SKIP_KEY_TARGETS = 'input, select, textarea, button, summary';

export default class GameControls {
  #board;
  #root;
  #timer = null;
  #ticking = false;
  #elements;

  constructor(board) {
    this.#board = board;
    this.#root = document.createElement('div');
    this.#root.className = 'chess-game-controls';
    this.#root.setAttribute('role', 'group');
    board.element.after(this.#root);
    this.#root.innerHTML = this.#render();
    this.#elements = this.#collectElements();
    this.#bind();
    this.update();
  }

  get element() {
    return this.#root;
  }

  isPlaying() {
    return this.#timer !== null;
  }

  start() {
    const { game } = this.#board;
    if (game.total() === 0) return;
    if (game.ply() >= game.total()) this.#board.goTo(0);
    this.#timer = window.setInterval(() => this.#tick(), this.#board.settings.playbackSpeed);
    this.update();
  }

  stop() {
    if (this.#timer !== null) window.clearInterval(this.#timer);
    this.#timer = null;
    this.update();
  }

  update() {
    this.#applyLabels();
    const { game } = this.#board;
    const ply = game.ply();
    const total = game.total();
    const playing = this.isPlaying();
    const { play, first, previous, next, last, download, speed, pieceStyle, boardTheme, coordinates, thinFrame, lastMoveArrow, bestMoveArrow, keyboard } = this.#elements;

    first.disabled = ply === 0;
    previous.disabled = ply === 0;
    next.disabled = ply >= total;
    last.disabled = ply >= total;
    play.disabled = total === 0;
    download.disabled = total === 0;

    play.setAttribute('aria-pressed', String(playing));
    this.#setLabel(play, playing ? 'controls.stop' : 'controls.play');
    play.innerHTML = icon(playing ? 'pause' : 'play');

    const settings = this.#board.settings;
    speed.value = String(settings.playbackSpeed);
    pieceStyle.value = settings.pieceStyle;
    boardTheme.value = settings.theme;
    coordinates.checked = settings.showCoordinates;
    thinFrame.checked = settings.thinFrame;
    lastMoveArrow.checked = settings.showLastMoveArrow;
    bestMoveArrow.checked = settings.showBestMoveArrow;
    keyboard.checked = settings.keyboard;
  }

  destroy() {
    this.stop();
    this.#root.remove();
  }

  // Teksterne sættes med #applyLabels, så de kan skifte sprog uden at bygge markup igen.
  #render() {
    const speedOptions = SPEEDS.map(({ value, key }) => `<option value="${value}" data-i18n="${key}"></option>`).join('');
    const styleOptions = Object.keys(pieceStyles).map((key) => `<option value="${key}" data-i18n="controls.pieceStyle.${key}"></option>`).join('');
    const themeOptions = boardThemes.map((key) => `<option value="${key}" data-i18n="controls.theme.${key}"></option>`).join('');

    return `
      <details class="chess-game-controls__settings">
        <summary class="chess-game-controls__button chess-game-controls__summary" data-i18n-label="controls.settings">${SETTINGS_ICON}</summary>
        <div class="chess-game-controls__panel">
          <label><span data-i18n="controls.speed"></span>
            <select data-setting="speed">${speedOptions}</select>
          </label>
          <label><span data-i18n="controls.pieceStyle"></span>
            <select data-setting="piece-style">${styleOptions}</select>
          </label>
          <label><span data-i18n="controls.boardTheme"></span>
            <select data-setting="board-theme">${themeOptions}</select>
          </label>
          <label class="chess-game-controls__check"><input type="checkbox" data-setting="coordinates"> <span data-i18n="controls.coordinates"></span></label>
          <label class="chess-game-controls__check"><input type="checkbox" data-setting="thin-frame"> <span data-i18n="controls.thinFrame"></span></label>
          <label class="chess-game-controls__check"><input type="checkbox" data-setting="last-move-arrow"> <span data-i18n="controls.lastMoveArrow"></span></label>
          <label class="chess-game-controls__check"><input type="checkbox" data-setting="best-move-arrow"> <span data-i18n="controls.bestMoveArrow"></span></label>
          <label class="chess-game-controls__check"><input type="checkbox" data-setting="keyboard"> <span data-i18n="controls.keyboard"></span></label>
        </div>
      </details>
      ${button('play', 'controls.play', 'play')}
      ${button('first', 'controls.start', 'start')}
      ${button('previous', 'controls.back', 'previous')}
      ${button('next', 'controls.forward', 'next')}
      ${button('last', 'controls.end', 'end')}
      ${button('flip', 'controls.flip', 'flip')}
      ${button('download', 'controls.download', 'download')}
    `;
  }

  #applyLabels() {
    const { locale } = this.#board.settings;
    this.#root.setAttribute('aria-label', translate(locale, 'controls.label'));
    for (const element of this.#root.querySelectorAll('[data-i18n]')) {
      element.textContent = translate(locale, element.dataset.i18n);
    }
    for (const element of this.#root.querySelectorAll('[data-i18n-label]')) {
      this.#setLabel(element, element.dataset.i18nLabel);
    }
  }

  #setLabel(element, key) {
    const label = translate(this.#board.settings.locale, key);
    element.title = label;
    element.setAttribute('aria-label', label);
  }

  #collectElements() {
    const q = (selector) => this.#root.querySelector(selector);
    return {
      play: q('[data-action="play"]'),
      first: q('[data-action="first"]'),
      previous: q('[data-action="previous"]'),
      next: q('[data-action="next"]'),
      last: q('[data-action="last"]'),
      flip: q('[data-action="flip"]'),
      download: q('[data-action="download"]'),
      settings: q('.chess-game-controls__settings'),
      speed: q('[data-setting="speed"]'),
      pieceStyle: q('[data-setting="piece-style"]'),
      boardTheme: q('[data-setting="board-theme"]'),
      coordinates: q('[data-setting="coordinates"]'),
      thinFrame: q('[data-setting="thin-frame"]'),
      lastMoveArrow: q('[data-setting="last-move-arrow"]'),
      bestMoveArrow: q('[data-setting="best-move-arrow"]'),
      keyboard: q('[data-setting="keyboard"]'),
    };
  }

  #bind() {
    const { play, first, previous, next, last, flip, download, settings, speed, pieceStyle, boardTheme, coordinates, thinFrame, lastMoveArrow, bestMoveArrow, keyboard } = this.#elements;

    play.addEventListener('click', () => (this.isPlaying() ? this.stop() : this.start()));
    first.addEventListener('click', () => this.#navigate(0));
    previous.addEventListener('click', () => this.#navigate(this.#board.game.ply() - 1));
    next.addEventListener('click', () => this.#navigate(this.#board.game.ply() + 1));
    last.addEventListener('click', () => this.#navigate(this.#board.game.total()));
    flip.addEventListener('click', () => this.#board.flip());
    download.addEventListener('click', () => this.#download());

    document.addEventListener('click', (event) => {
      if (!this.#root.contains(event.target)) settings.open = false;
    });

    speed.addEventListener('change', () => {
      const wasPlaying = this.isPlaying();
      this.#changeSetting({ playbackSpeed: Number(speed.value) });
      if (wasPlaying) {
        this.stop();
        this.start();
      }
    });
    pieceStyle.addEventListener('change', () => this.#changeSetting({ pieceStyle: pieceStyle.value }));
    boardTheme.addEventListener('change', () => this.#changeSetting({ theme: boardTheme.value }));
    coordinates.addEventListener('change', () => this.#changeSetting({ showCoordinates: coordinates.checked }));
    thinFrame.addEventListener('change', () => this.#changeSetting({ thinFrame: thinFrame.checked }));
    lastMoveArrow.addEventListener('change', () => this.#changeSetting({ showLastMoveArrow: lastMoveArrow.checked }));
    bestMoveArrow.addEventListener('change', () => this.#changeSetting({ showBestMoveArrow: bestMoveArrow.checked }));
    keyboard.addEventListener('change', () => this.#changeSetting({ keyboard: keyboard.checked }));

    this.#board.element.addEventListener('chessboard:change', (event) => {
      const { reason } = event.detail;
      // Et 'position' under afspilning kommer fra en lineændring i visningen, ikke fra brugeren.
      const fromTick = reason === 'position' && this.#ticking;
      if (reason !== 'navigate' && !fromTick) this.stop();
      this.update();
    });
    this.#board.element.addEventListener('keydown', (event) => this.#handleKey(event));
  }

  #changeSetting(changes) {
    this.#board.configure(changes);
    saveSettings(this.#board.settings);
  }

  #tick() {
    const { game } = this.#board;
    this.#ticking = true;
    try {
      this.#board.goTo(game.ply() + 1);
    } finally {
      this.#ticking = false;
    }
    if (game.ply() >= game.total()) this.stop();
  }

  #navigate(ply) {
    this.stop();
    this.#board.goTo(ply);
  }

  #handleKey(event) {
    if (!this.#board.settings.keyboard || event.target.matches(SKIP_KEY_TARGETS)) return;
    const { game } = this.#board;
    switch (event.key) {
      case 'Home':
        this.#navigate(0);
        break;
      case 'End':
        this.#navigate(game.total());
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.#navigate(game.ply() - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.#navigate(game.ply() + 1);
        break;
      case ' ':
        event.preventDefault();
        if (this.isPlaying()) this.stop();
        else this.start();
        break;
    }
  }

  #download() {
    const { game } = this.#board;
    if (game.total() === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    const pgn = game.pgn({ Event: 'Chess board', Date: date.replaceAll('-', '.'), ...this.#board.headers });
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `game-${date}.pgn`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
