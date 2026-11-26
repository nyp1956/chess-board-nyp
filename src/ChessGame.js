import { Chess } from 'chess.js';

export default class ChessGame {
  #chess;
  #startFen;
  // Undone moves. The last entry is the next move to redo.
  #future = [];

  constructor(fen = null) {
    this.#chess = fen ? new Chess(fen) : new Chess();
    this.#startFen = this.#chess.fen();
  }

  fen() {
    return this.#chess.fen();
  }

  load(fen) {
    this.#chess.load(fen);
    this.#startFen = this.#chess.fen();
    this.#future = [];
  }

  reset() {
    this.#chess.reset();
    this.#startFen = this.#chess.fen();
    this.#future = [];
  }

  // Replaces the game with a line of SAN moves from fen and moves to ply.
  // Moves after ply stay available for redo. Throws, and keeps the old game, if a move is illegal.
  loadLine(fen, sans, ply = sans.length) {
    const chess = new Chess(fen);
    const startFen = chess.fen();
    for (const san of sans) chess.move(san);
    this.#chess = chess;
    this.#startFen = startFen;
    this.#future = [];
    return this.goTo(ply);
  }

  turn() {
    return this.#chess.turn();
  }

  pieceAt(square) {
    return this.#chess.get(square) ?? null;
  }

  legalMoves(square) {
    return this.#chess.moves({ square, verbose: true });
  }

  legalTargets(square) {
    return this.legalMoves(square).map((move) => move.to);
  }

  move(from, to, promotion = 'q') {
    try {
      const move = this.#chess.move({ from, to, promotion });
      this.#future = [];
      return move;
    } catch {
      return null;
    }
  }

  undo() {
    const move = this.#chess.undo();
    if (move) this.#future.push({ from: move.from, to: move.to, promotion: move.promotion, san: move.san });
    return move;
  }

  redo() {
    const next = this.#future.at(-1);
    if (!next) return null;
    const move = this.#chess.move(next);
    this.#future.pop();
    return move;
  }

  // Moves the position to ply (0 = start position, total() = last move).
  goTo(ply) {
    const target = Math.max(0, Math.min(ply, this.total()));
    while (this.ply() > target) this.undo();
    while (this.ply() < target) this.redo();
    return this.ply();
  }

  ply() {
    return this.#chess.history().length;
  }

  total() {
    return this.ply() + this.#future.length;
  }

  history() {
    return this.#chess.history();
  }

  // Det seneste træk i den aktuelle stilling, eller null i startstillingen.
  lastMove() {
    return this.#chess.history({ verbose: true }).at(-1) ?? null;
  }

  // Sletter de træk, der ligger efter den aktuelle stilling. Returnerer antallet af slettede træk.
  deleteMovesAfterPosition() {
    const count = this.#future.length;
    this.#future = [];
    return count;
  }

  // SAN for the whole line, including moves that were undone.
  line() {
    return [...this.history(), ...this.#future.map((move) => move.san).reverse()];
  }

  // Exports the whole line, including moves that were undone, from the start position.
  pgn(headers = {}) {
    const replay = new Chess(this.#startFen);
    const moves = [...this.#chess.history({ verbose: true }), ...[...this.#future].reverse()];
    for (const { from, to, promotion } of moves) replay.move({ from, to, promotion });
    for (const [key, value] of Object.entries(headers)) replay.setHeader(key, value);
    return replay.pgn();
  }

  status() {
    return {
      inCheck: this.#chess.isCheck(),
      checkmate: this.#chess.isCheckmate(),
      draw: this.#chess.isDraw(),
      gameOver: this.#chess.isGameOver(),
    };
  }
}
