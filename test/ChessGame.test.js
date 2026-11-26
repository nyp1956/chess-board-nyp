import { test } from 'node:test';
import assert from 'node:assert/strict';
import ChessGame from '../src/ChessGame.js';

test('legalTargets returns the legal destinations of a pawn on e2', () => {
  const game = new ChessGame();
  assert.deepEqual(game.legalTargets('e2').sort(), ['e3', 'e4']);
});

test('move plays a legal move and switches the turn', () => {
  const game = new ChessGame();
  const move = game.move('e2', 'e4');
  assert.equal(move?.san, 'e4');
  assert.equal(game.turn(), 'b');
  assert.equal(game.pieceAt('e4')?.type, 'p');
  assert.equal(game.pieceAt('e2'), null);
});

test('move returns null for an illegal move and leaves the position unchanged', () => {
  const game = new ChessGame();
  const before = game.fen();
  assert.equal(game.move('e2', 'e5'), null);
  assert.equal(game.fen(), before);
});

test('move promotes to a queen by default', () => {
  const game = new ChessGame('8/P7/8/8/8/8/8/k6K w - - 0 1');
  const move = game.move('a7', 'a8');
  assert.equal(move?.promotion, 'q');
  assert.equal(game.pieceAt('a8')?.type, 'q');
});

test('deleteMovesAfterPosition removes only the moves after the current position', () => {
  const game = new ChessGame();
  game.loadLine(game.fen(), ['e4', 'e5', 'Nf3'], 1);
  assert.equal(game.deleteMovesAfterPosition(), 2);
  assert.deepEqual(game.line(), ['e4']);
  assert.equal(game.total(), 1);
  assert.equal(game.deleteMovesAfterPosition(), 0);
});

test('load throws on an invalid FEN', () => {
  const game = new ChessGame();
  assert.throws(() => game.load('not a fen'));
});

test('undo reverts the last move', () => {
  const game = new ChessGame();
  const start = game.fen();
  game.move('e2', 'e4');
  game.undo();
  assert.equal(game.fen(), start);
});

test('goTo moves backward and forward through the line', () => {
  const game = new ChessGame();
  game.move('e2', 'e4');
  game.move('e7', 'e5');
  game.move('g1', 'f3');
  assert.equal(game.goTo(0), 0);
  assert.equal(game.fen(), new ChessGame().fen());
  assert.equal(game.goTo(2), 2);
  assert.equal(game.pieceAt('e5')?.type, 'p');
  assert.equal(game.pieceAt('f3'), null);
  assert.equal(game.goTo(99), 3);
  assert.equal(game.pieceAt('f3')?.type, 'n');
});

test('lastMove returns the move that led to the current position', () => {
  const game = new ChessGame();
  assert.equal(game.lastMove(), null);
  game.move('e2', 'e4');
  game.move('e7', 'e5');
  assert.deepEqual([game.lastMove().from, game.lastMove().to], ['e7', 'e5']);
  game.goTo(1);
  assert.deepEqual([game.lastMove().from, game.lastMove().to], ['e2', 'e4']);
  game.goTo(0);
  assert.equal(game.lastMove(), null);
});

test('a new move after going back discards the undone moves', () => {
  const game = new ChessGame();
  game.move('e2', 'e4');
  game.move('e7', 'e5');
  game.goTo(1);
  game.move('c7', 'c5');
  assert.equal(game.total(), 2);
  assert.deepEqual(game.line(), ['e4', 'c5']);
  assert.equal(game.redo(), null);
});

test('loadLine plays the line up to ply and keeps the rest for redo', () => {
  const game = new ChessGame();
  assert.equal(game.loadLine(new ChessGame().fen(), ['e4', 'e5', 'Nf3'], 2), 2);
  assert.equal(game.pieceAt('e5')?.type, 'p');
  assert.equal(game.pieceAt('f3'), null);
  assert.equal(game.total(), 3);
  assert.equal(game.redo()?.san, 'Nf3');
});

test('loadLine starts from a non-standard position', () => {
  const game = new ChessGame();
  const fen = '8/P7/8/8/8/8/8/k6K w - - 0 1';
  game.loadLine(fen, ['a8=N'], 1);
  assert.equal(game.pieceAt('a8')?.type, 'n');
  assert.equal(game.goTo(0), 0);
  assert.equal(game.fen(), fen);
});

test('loadLine throws on an illegal move and keeps the previous game', () => {
  const game = new ChessGame();
  game.move('e2', 'e4');
  const before = game.fen();
  assert.throws(() => game.loadLine(new ChessGame().fen(), ['e5']));
  assert.equal(game.fen(), before);
});

test('pgn exports the whole line, including undone moves', () => {
  const game = new ChessGame();
  game.move('e2', 'e4');
  game.move('e7', 'e5');
  game.goTo(1);
  const pgn = game.pgn({ Event: 'Test' });
  assert.match(pgn, /\[Event "Test"\]/);
  assert.match(pgn, /1\. e4 e5/);
  assert.equal(game.ply(), 1);
});
