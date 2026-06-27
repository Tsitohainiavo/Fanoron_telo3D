"""
Heuristique d'évaluation pour Fanoron-telo, basée sur les bitboards.

Compter les pions sur une ligne gagnante revient à faire un ET binaire
entre le bitboard du joueur et le masque de la ligne, puis un popcount
(bin(...).count('1')) — beaucoup plus rapide que de boucler sur une liste
Python à chaque appel, ce qui compte quand cette fonction est appelée à
chaque feuille de l'arbre minimax / alpha-bêta.
"""

from core.plateau import LIGNES_MASKS


def _popcount(n):
    return bin(n).count('1')


def evaluate(engine, player):
    """
    Évalue la position pour `player` (score élevé = favorable à `player`).
    """
    if engine.winner == player:
        return 10000
    if engine.winner is not None:
        return -10000

    mes_bits = engine.x_bits if player == 'X' else engine.o_bits
    bits_adverses = engine.o_bits if player == 'X' else engine.x_bits

    score = 0
    for masque in LIGNES_MASKS:
        p_cnt = _popcount(mes_bits & masque)
        o_cnt = _popcount(bits_adverses & masque)

        if o_cnt == 0:
            if p_cnt == 1:
                score += 10
            elif p_cnt == 2:
                score += 100   # presque gagnant
        if p_cnt == 0:
            if o_cnt == 1:
                score -= 15    # menace adverse simple
            elif o_cnt == 2:
                score -= 120   # menace de victoire adverse

    # Bonus de mobilité (utile surtout en phase mouvement)
    if engine.phase == 'mouvement':
        opponent = 'O' if player == 'X' else 'X'
        my_moves = len(engine.get_valid_moves())
        # Bascule temporaire pour évaluer la mobilité adverse, puis on
        # restaure : sans danger, c'est le même appel synchrone.
        engine.current_player = opponent
        opp_moves = len(engine.get_valid_moves())
        engine.current_player = player
        score += (my_moves - opp_moves) * 2

    return score