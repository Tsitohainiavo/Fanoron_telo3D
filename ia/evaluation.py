"""
Heuristique d'évaluation pour Fanoron-telo.
"""

from core.plateau import LIGNES_GAGNANTES

def evaluate(engine, player):
    """
    Évalue la position pour `player` (valeur élevée = favorable).
    Calcule un score basé sur le nombre d'alignements potentiels.
    """
    if engine.winner == player:
        return 10000
    if engine.winner is not None:
        return -10000

    score = 0
    opponent = 'O' if player == 'X' else 'X'

    for line in LIGNES_GAGNANTES:
        pieces = [engine.board[i] for i in line]
        p_cnt = pieces.count(player)
        o_cnt = pieces.count(opponent)

        if o_cnt == 0:
            # Ligne libre pour nous
            if p_cnt == 1:
                score += 10
            elif p_cnt == 2:
                score += 100   # presque gagnant
        if p_cnt == 0:
            if o_cnt == 1:
                score -= 15    # menace adverse simple
            elif o_cnt == 2:
                score -= 120   # menace de victoire adverse

    # Bonus de mobilité (phase mouvement)
    if engine.phase == 'mouvement':
        my_moves = len(engine.get_valid_moves())
        # Changer temporairement de joueur pour évaluer l'adversaire
        engine.current_player = opponent
        opp_moves = len(engine.get_valid_moves())
        engine.current_player = player
        score += (my_moves - opp_moves) * 2

    return score