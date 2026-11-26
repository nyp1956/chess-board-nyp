import defaultWhiteKing from '../assets/pieces/default/wk.png';
import defaultWhiteQueen from '../assets/pieces/default/wq.png';
import defaultWhiteRook from '../assets/pieces/default/wr.png';
import defaultWhiteBishop from '../assets/pieces/default/wb.png';
import defaultWhiteKnight from '../assets/pieces/default/wn.png';
import defaultWhitePawn from '../assets/pieces/default/wp.png';
import defaultBlackKing from '../assets/pieces/default/bk.png';
import defaultBlackQueen from '../assets/pieces/default/bq.png';
import defaultBlackRook from '../assets/pieces/default/br.png';
import defaultBlackBishop from '../assets/pieces/default/bb.png';
import defaultBlackKnight from '../assets/pieces/default/bn.png';
import defaultBlackPawn from '../assets/pieces/default/bp.png';

import chess24WhiteKing from '../assets/pieces/chess24/wK.png';
import chess24WhiteQueen from '../assets/pieces/chess24/wQ.png';
import chess24WhiteRook from '../assets/pieces/chess24/wR.png';
import chess24WhiteBishop from '../assets/pieces/chess24/wB.png';
import chess24WhiteKnight from '../assets/pieces/chess24/wN.png';
import chess24WhitePawn from '../assets/pieces/chess24/wP.png';
import chess24BlackKing from '../assets/pieces/chess24/bK.png';
import chess24BlackQueen from '../assets/pieces/chess24/bQ.png';
import chess24BlackRook from '../assets/pieces/chess24/bR.png';
import chess24BlackBishop from '../assets/pieces/chess24/bB.png';
import chess24BlackKnight from '../assets/pieces/chess24/bN.png';
import chess24BlackPawn from '../assets/pieces/chess24/bP.png';

export const pieceStyles = {
  standard: {
    K: defaultWhiteKing, Q: defaultWhiteQueen, R: defaultWhiteRook, B: defaultWhiteBishop, N: defaultWhiteKnight, P: defaultWhitePawn,
    k: defaultBlackKing, q: defaultBlackQueen, r: defaultBlackRook, b: defaultBlackBishop, n: defaultBlackKnight, p: defaultBlackPawn,
  },
  chess24: {
    K: chess24WhiteKing, Q: chess24WhiteQueen, R: chess24WhiteRook, B: chess24WhiteBishop, N: chess24WhiteKnight, P: chess24WhitePawn,
    k: chess24BlackKing, q: chess24BlackQueen, r: chess24BlackRook, b: chess24BlackBishop, n: chess24BlackKnight, p: chess24BlackPawn,
  },
};

export const boardThemes = ['clay', 'forest', 'slate'];
