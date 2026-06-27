"""
IA Minimax pour les niveaux facile (profondeur 2) et moyen (profondeur 4).

Utilise copy_for_search() (copie sans historique, quasi gratuite grâce
aux bitboards) plutôt que copy() / deepcopy(), ce qui était le principal
goulot d'étranglement de l'ancienne version.
"""

from ia.evaluation import evaluate


def minimax(engine, depth, maximizing, player):
    if depth == 0 or engine.winner is not None:
        return evaluate(engine, player), None

    moves = engine.get_valid_moves()
    if not moves:
        # Plus aucun coup légal : on considère la position comme nulle.
        return 0, None

    best_move = None
    if maximizing:
        best_val = -float('inf')
        for move in moves:
            child = engine.copy_for_search()
            child.make_move(move, save_history=False)
            val, _ = minimax(child, depth - 1, False, player)
            if val > best_val:
                best_val = val
                best_move = move
        return best_val, best_move
    else:
        best_val = float('inf')
        for move in moves:
            child = engine.copy_for_search()
            child.make_move(move, save_history=False)
            val, _ = minimax(child, depth - 1, True, player)
            if val < best_val:
                best_val = val
                best_move = move
        return best_val, best_move


def get_best_move(engine, depth):
    """Retourne le meilleur coup selon Minimax pour le joueur actif."""
    _, move = minimax(engine, depth, True, engine.current_player)
    return move