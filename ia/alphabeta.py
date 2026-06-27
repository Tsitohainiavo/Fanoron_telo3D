"""
IA Alpha-Bêta pour le niveau difficile (profondeur 6).

Deux optimisations par rapport à l'ancienne version :
  1. copy_for_search() au lieu de copy() : copie sans historique, quasi
     gratuite grâce aux bitboards (cf. core/moteur.py).
  2. Table de transposition : comme l'état complet se résume à un tuple
     d'entiers (cle_zobrist()), on peut mémoriser le résultat d'une
     position déjà analysée à la même profondeur et éviter de la
     recalculer si on la retombe dessus par un autre ordre de coups.
"""

from ia.evaluation import evaluate

EXACT, LOWER, UPPER = 0, 1, 2


def alphabeta(engine, depth, alpha, beta, maximizing, player, table):
    if engine.winner is not None or depth == 0:
        return evaluate(engine, player), None

    cle = engine.cle_zobrist() + (depth,)
    entree = table.get(cle)
    if entree is not None:
        val, flag, move_memo = entree
        if flag == EXACT:
            return val, move_memo
        elif flag == LOWER and val > alpha:
            alpha = val
        elif flag == UPPER and val < beta:
            beta = val
        if alpha >= beta:
            return val, move_memo

    moves = engine.get_valid_moves()
    if not moves:
        return 0, None

    alpha_orig, beta_orig = alpha, beta
    best_move = None

    if maximizing:
        best_val = -float('inf')
        for move in moves:
            child = engine.copy_for_search()
            child.make_move(move, save_history=False)
            val, _ = alphabeta(child, depth - 1, alpha, beta, False, player, table)
            if val > best_val:
                best_val = val
                best_move = move
            if val > alpha:
                alpha = val
            if alpha >= beta:
                break
    else:
        best_val = float('inf')
        for move in moves:
            child = engine.copy_for_search()
            child.make_move(move, save_history=False)
            val, _ = alphabeta(child, depth - 1, alpha, beta, True, player, table)
            if val < best_val:
                best_val = val
                best_move = move
            if val < beta:
                beta = val
            if alpha >= beta:
                break

    if best_val <= alpha_orig:
        flag = UPPER
    elif best_val >= beta_orig:
        flag = LOWER
    else:
        flag = EXACT
    table[cle] = (best_val, flag, best_move)

    return best_val, best_move


def get_best_move(engine, depth):
    """Retourne le meilleur coup avec élagage alpha-bêta + table de transposition."""
    table = {}
    _, move = alphabeta(engine, depth, -float('inf'), float('inf'),
                         True, engine.current_player, table)
    return move