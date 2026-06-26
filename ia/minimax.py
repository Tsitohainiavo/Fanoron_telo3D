"""
IA Minimax pour les niveaux facile (profondeur 2) et moyen (profondeur 4).
"""

from ia.evaluation import evaluate

def minimax(engine, depth, maximizing, player, max_depth):
    if depth == 0 or engine.winner is not None:
        return evaluate(engine, player), None

    moves = engine.get_valid_moves()
    if not moves:
        # plus de coups légaux -> nul / défaite ?
        return 0, None

    best_move = None
    if maximizing:
        max_eval = -float('inf')
        for move in moves:
            child = engine.copy()
            child.make_move(move)
            eval_child, _ = minimax(child, depth-1, False, player, max_depth)
            if eval_child > max_eval:
                max_eval = eval_child
                best_move = move
        return max_eval, best_move
    else:
        min_eval = float('inf')
        for move in moves:
            child = engine.copy()
            child.make_move(move)
            eval_child, _ = minimax(child, depth-1, True, player, max_depth)
            if eval_child < min_eval:
                min_eval = eval_child
                best_move = move
        return min_eval, best_move

def get_best_move(engine, depth):
    """Retourne le meilleur coup selon Minimax."""
    _, move = minimax(engine, depth, True, engine.current_player, depth)
    return move