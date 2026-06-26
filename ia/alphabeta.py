"""
IA Alpha-Beta pour le niveau difficile (profondeur 6).
"""

from ia.evaluation import evaluate

def alphabeta(engine, depth, alpha, beta, maximizing, player, max_depth):
    if depth == 0 or engine.winner is not None:
        return evaluate(engine, player), None

    moves = engine.get_valid_moves()
    if not moves:
        return 0, None

    best_move = None
    if maximizing:
        max_eval = -float('inf')
        for move in moves:
            child = engine.copy()
            child.make_move(move)
            eval_child, _ = alphabeta(child, depth-1, alpha, beta, False, player, max_depth)
            if eval_child > max_eval:
                max_eval = eval_child
                best_move = move
            alpha = max(alpha, eval_child)
            if beta <= alpha:
                break
        return max_eval, best_move
    else:
        min_eval = float('inf')
        for move in moves:
            child = engine.copy()
            child.make_move(move)
            eval_child, _ = alphabeta(child, depth-1, alpha, beta, True, player, max_depth)
            if eval_child < min_eval:
                min_eval = eval_child
                best_move = move
            beta = min(beta, eval_child)
            if beta <= alpha:
                break
        return min_eval, best_move

def get_best_move(engine, depth):
    """Retourne le meilleur coup avec élagage alpha-beta."""
    _, move = alphabeta(engine, depth, -float('inf'), float('inf'),
                        True, engine.current_player, depth)
    return move