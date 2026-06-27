"""
Fonctions de vérification des règles, basées sur des bitboards.

Toutes ces fonctions travaillent directement sur des entiers (bitmasks),
ce qui les rend très rapides à appeler des milliers de fois par seconde
pendant la recherche de l'IA (minimax / alpha-bêta).
"""

from core.plateau import ADJ_MASK, LIGNES_MASKS, MASQUE_PLEIN, NB_CASES


def detecter_alignement(bits_joueur):
    """Retourne True si le bitboard `bits_joueur` contient une ligne gagnante complète."""
    for masque in LIGNES_MASKS:
        if (bits_joueur & masque) == masque:
            return True
    return False


def masque_libre(x_bits, o_bits):
    """Bitmask des cases libres (ni X ni O)."""
    return MASQUE_PLEIN & ~(x_bits | o_bits)


def coups_placement(x_bits, o_bits):
    """Liste des indices de case libres (phase placement)."""
    libre = masque_libre(x_bits, o_bits)
    return [i for i in range(NB_CASES) if libre & (1 << i)]


def coups_mouvement(bits_joueur, x_bits, o_bits):
    """
    Liste des mouvements (src, dst) possibles pour le joueur dont les pions
    sont dans `bits_joueur`, vers une case adjacente libre.
    """
    libre = masque_libre(x_bits, o_bits)
    mouvements = []
    pions = bits_joueur
    while pions:
        src_bit = pions & (-pions)          # isole le bit de poids le plus faible
        src = src_bit.bit_length() - 1
        destinations = ADJ_MASK[src] & libre
        d = destinations
        while d:
            dst_bit = d & (-d)
            dst = dst_bit.bit_length() - 1
            mouvements.append((src, dst))
            d &= d - 1
        pions &= pions - 1
    return mouvements