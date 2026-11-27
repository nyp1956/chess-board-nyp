# chess-board-nyp

An object-oriented chess board for JavaScript, developed from the board in `chessworkspace`.
The board is a regular DOM element that fills the width of its parent. Its height follows automatically (it is square).

## Getting started

```bash
npm install
npm run dev       # starts the demo page at http://localhost:5173
npm test          # runs the unit tests for ChessGame (node:test)
npm run build     # builds to dist/
```

## Installation

Install it from another project by pointing npm at this folder:

```bash
npm install C:\github\chess-board-nyp
```

The package has an `exports` field, so `import { ChessBoard } from 'chess-board-nyp'` resolves to `src/index.js`.
The board and control bar import their own CSS (`chess-board.css` and `chess-game-controls.css`). Use a bundler such as Vite,
webpack or esbuild, and the CSS is included automatically. If you want to include the CSS yourself, the files are available
as `chess-board-nyp/chess-board.css` and `chess-board-nyp/chess-game-controls.css`.

## Usage

```js
import { ChessBoard } from 'chess-board-nyp';

const board = new ChessBoard(document.querySelector('#board-container'), {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  theme: 'clay',
  pieceStyle: 'standard',
  promotion: 'ask',
  locale: 'en',
  onMove: (move, board) => console.log(move.san),
});

board.flip();
board.configure({ theme: 'forest', controls: false });
board.setLine(fen, ['e4', 'e5', 'Nf3'], 2); // shows a line from fen, positioned after ply 2
board.setBestMove('e2e4');                  // green arrow for a best move; null removes it
board.setHeaders({ Event: 'Tournament', White: 'Hansen', Black: 'Larsen' });

board.element.addEventListener('chessboard:change', (event) => {
  const { reason, ply, total } = event.detail; // reason: 'move' | 'navigate' | 'position' | 'delete'
});
```

### Constructor options

`new ChessBoard(container, options)` throws a `TypeError` if `container` is not an `HTMLElement`.

| Option | Default | Description |
| --- | --- | --- |
| `fen` | start position | Starting position. An invalid FEN throws. |
| `game` | `new ChessGame(fen)` | An existing `ChessGame` to show instead of creating one. |
| `headers` | `{}` | PGN headers used when the game is downloaded. Same as `setHeaders`. |
| `ariaLabel` | translated board label | Accessible label for the board. |
| `flipped` | `false` | Shows the board from Black's side. |
| `draggable` | `true` | Lets the user move pieces by dragging. With `false`, drag and drop is off, but clicking a piece and then a target square still works. |
| `pieceStyle` | `'standard'` | `'standard'` or `'chess24'`. |
| `theme` | `'clay'` | `'clay'`, `'forest'` or `'slate'`. |
| `showCoordinates` | `true` | Shows file and rank labels. |
| `showLastMoveArrow` | `false` | Draws an arrow from the last move's from-square to its to-square. |
| `showBestMoveArrow` | `false` | Shows the arrow set with `setBestMove`. |
| `thinFrame` | `false` | Replaces the wooden frame with a thin outline. File and rank labels are hidden, because they are drawn in the frame. |
| `promotion` | `'ask'` | `'ask'` opens a piece picker. `'q'`, `'r'`, `'b'` or `'n'` promote automatically. |
| `controls` | `true` | Shows the control bar under the board. |
| `keyboard` | `true` | Enables keyboard navigation when the board has focus. |
| `playbackSpeed` | `2000` | Milliseconds between moves during auto-play. Must be greater than 0. |
| `locale` | browser language | `'da'` or `'en'`. Other browser languages use English. An unknown value throws a `RangeError`. |
| `onMove` | `null` | `(move, board)` is called after each successful move. `move` is the chess.js move object. |
| `onSelect` | `null` | `(square, targets)` is called when a piece is selected. |

### Board methods

- `setPosition(fen)`: loads a FEN. An invalid FEN throws. Clears the selection.
- `setLine(fen, sans, ply = sans.length)`: shows a line of SAN moves from `fen` and positions the board after `ply` moves. Returns the ply. If a move is illegal, the throw leaves the previous game in place. Moves after `ply` can be redone.
- `reset()`: returns to the standard start position.
- `goTo(ply)`: moves to a ply, where 0 is the start position and `game.total()` is the last move. Returns the ply.
- `undo()` and `redo()`: return the move that was undone or redone, or `null`.
- `makeMove(from, to)`: makes a move and returns it, or `null` if the move is illegal. With `promotion: 'ask'`, a promotion move opens the piece picker and returns `null`.
- `select(square)`: selects a piece. Returns `true` if it was selected. Only pieces of the side to move can be selected. Calls `onSelect`.
- `clearSelection()`: removes the selection and the highlighted targets.
- `flip()`: toggles `flipped`.
- `configure(changes)`: changes settings. Invalid values throw a `RangeError`, and no settings change. Does not emit `chessboard:change`.
- `setHeaders(headers)`: replaces the PGN headers used for download. The new headers are not merged with the old ones.
- `setBestMove(uci)`: sets a best move, described under [Analysis arrows](#analysis-arrows).
- `previewMove(from, to, promotion = 'q')`: shows the position after a move without changing the game. Returns `false` for an illegal move. The preview disappears when the position changes, or when `clearPreview()` is called. Use it for hover previews.
- `clearPreview()`: removes the preview.
- `deleteMovesAfterPosition()`: deletes the moves after the current position. Returns the number of deleted moves and emits `chessboard:change` with `reason: 'delete'` if any were deleted.
- `render()`: redraws the board. The methods above already redraw, so you rarely need it.
- `destroy()`: removes the board and its control bar from the page.

Read-only properties:

- `element`: the board's DOM element. Listen for `chessboard:change` on it.
- `game`: the `ChessGame` instance.
- `selectedSquare`: the selected square, or `null`.
- `settings`: a copy of the current settings.
- `headers`: a copy of the PGN headers.

### Events

`chessboard:change` bubbles up from `board.element`. Its `detail` contains `reason`, `ply` and `total`:

| `reason` | Emitted by |
| --- | --- |
| `'move'` | A move made with `makeMove`, by the user, or from the picker. |
| `'navigate'` | `goTo`, `undo`, `redo`, and the navigation buttons or keys. |
| `'position'` | `setPosition`, `reset` and `setLine`. |
| `'delete'` | `deleteMovesAfterPosition`, when moves were deleted. |

### Game state (`ChessGame`)

`ChessBoard` uses `ChessGame` for game state. You can use it on its own, and pass it in with the `game` option.

```js
import { ChessGame } from 'chess-board-nyp';

const game = new ChessGame(); // optional FEN argument
game.move('e2', 'e4');        // returns the chess.js move, or null if the move is illegal
game.pgn({ Event: 'Test' });  // exports the game as PGN
```

- `fen()`, `load(fen)`, `reset()`: read or set the position.
- `loadLine(fen, sans, ply)`: replaces the game with a line of SAN moves from `fen`.
- `turn()`: `'w'` or `'b'`.
- `pieceAt(square)`: `{ type, color }` for the piece, or `null`.
- `legalMoves(square)`: the legal moves from `square`, as chess.js verbose moves.
- `legalTargets(square)`: the squares that a piece on `square` can move to.
- `move(from, to, promotion = 'q')`: makes a move, or returns `null` if it is illegal. Making a new move discards any moves that were undone.
- `undo()`, `redo()`: return the move, or `null`.
- `deleteMovesAfterPosition()`: deletes the moves that were undone (the moves after the current position). Returns how many were deleted.
- `goTo(ply)`, `ply()`, `total()`: navigation and move counts.
- `history()`: SAN moves up to the current position.
- `line()`: SAN for the whole line, including moves that were undone.
- `lastMove()`: the last move in the current position, or `null` at the start.
- `pgn(headers)`: PGN for the whole line, including undone moves.
- `status()`: `{ inCheck, checkmate, draw, gameOver }`.

### Moving pieces

- Mouse: uses native HTML5 drag and drop. The user can also click a piece and then click a legal target square.
- Touch and pen: use pointer drag with a ghost piece.
- Only pieces of the side to move can be moved. With `draggable: false`, dragging is off, but click-to-move still works.

### Keyboard

When `keyboard` is on, the board can receive focus. Keys are ignored when focus is on an `input`, `select`, `textarea`, `button` or `summary`.

- `Home` and `End`: go to the start or the last move.
- `←` and `→`: go to the previous or next move.
- `Space`: start or stop auto-play.

While the promotion picker is open, `Escape` closes it.

### Control bar

`GameControls` is created automatically when `controls` is `true`. It is placed after the board. The buttons are, in order:
Settings, Auto-play, Start, Back, Forward, End, Flip board, and Download PGN. The Settings panel contains playback speed, piece style, theme,
coordinates, thin frame, last-move arrow and keyboard.

You can create a control bar yourself with `new GameControls(board)`. Set `controls: false` on the board first, so you don't get two control bars. The class has `element`, `isPlaying()`, `start()`, `stop()`, `update()` and `destroy()`.

### Localization

`locale` controls the text on the board (aria labels, the promotion picker, piece alt text) and in the control bar. Set it in the constructor, or
change it at any time with `board.configure({ locale })`, including during auto-play. The default is the browser language: Danish for `da`, and
English for everything else.

The language is not saved, and it cannot be changed from the Settings panel. Translations are in `src/i18n.js`. To add a language, add it there and to `LOCALES`.

### PGN download

The downloaded PGN always uses English tags (`Event`, `White`, ...) and English piece letters in SAN (K, Q, R, B, N), so other programs can read it. The
default `Event` is `Chess board`, and the file name is always `game-<date>.pgn`. Headers from `setHeaders` or the `headers` option override the defaults.

### Saved settings

Changes made in the Settings panel are saved in `localStorage` under `chess-board-nyp:settings`. The saved keys are `playbackSpeed`, `pieceStyle`,
`theme`, `showCoordinates`, `showLastMoveArrow` and `keyboard`. When a board is created, saved values take priority over the constructor options. Invalid or unknown saved values are ignored.
`locale`, `promotion`, `flipped`, `showBestMoveArrow` and `thinFrame` are not saved.

### Analysis arrows

An analysis program can show a best move with `board.setBestMove('e2e4')`. Moves use UCI: the from-square and to-square, plus an optional promotion piece such as `e7e8q`.
The arrow is drawn in green from the from-square to the to-square. It only appears when `showBestMoveArrow` is `true` (the default is `false`), so the user chooses whether to see it.

The arrow belongs to the position it was set for. It is only shown while the board is in that position, so it disappears after a move, after navigating
to another position, or after a different position is loaded. Navigating back to that position shows it again. The analysis program must call `setBestMove`
again for each new position. Passing `null` removes the arrow. An invalid move throws a `TypeError`.

### Styling

The board's size comes from CSS on its parent element, for example `#board-container { width: 400px; }`.

### Exports

`boardThemes` is an array of theme names: `['clay', 'forest', 'slate']`. `pieceStyles` is an object with the keys `standard` and `chess24`. Each style maps the piece letters (`K`, `Q`, `R`, `B`, `N`, `P` for white and `k`, `q`, `r`, `b`, `n`, `p` for black) to image URLs.

## Project structure

- `src/ChessBoard.js` – the board: rendering, mouse, touch and keyboard input, and the public API.
- `src/ChessGame.js` – wrapper around chess.js that holds game state, navigation, legal moves and PGN.
- `src/GameControls.js` + `src/chess-game-controls.css` – the control bar under the board.
- `src/settingsStorage.js` – saves and loads the Settings panel values (not the language) in `localStorage`.
- `src/i18n.js` – translations (Danish and English) and `translate`.
- `src/pieceSets.js` – piece styles and board themes.
- `src/chess-board.css` – styling. Themes are set with the classes `chess-board--clay|forest|slate`.
- `src/index.js` – exports the public classes and constants.
- `index.html` + `src/demo.js` – demo page with controls, move list, FEN loading and several board sizes.
- `test/ChessGame.test.js` – tests for the game logic
