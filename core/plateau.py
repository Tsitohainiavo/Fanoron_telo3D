"""
Représentation bit à bit (bitboard) du plateau de Fanoron-telo.

9 intersections indexées 0-8 :

    0 1 2
    3 4 5
    6 7 8

Chaque position du plateau est représentée par UN SEUL bit dans un entier
de 9 bits (valeurs 0..511). Un joueur possède donc un bitboard (un int)
où le bit i est à 1 si et seulement si il a un pion sur la case i.

Cette représentation permet de :
- copier un état de jeu quasi gratuitement (copier un entier, pas une liste)
- tester un alignement avec un simple ET binaire au lieu d'une boucle Python
- générer les coups avec des masques précalculés

C'est la base de l'optimisation demandée pour l'IA (minimax / alpha-bêta).
"""

NB_CASES = 9
MASQUE_PLEIN = 0b1_1111_1111  # 9 bits à 1 -> toutes les cases (0x1FF)

# Alias lisibles des positions (comme dans l'ancienne version liste)
TL, T, TR = 0, 1, 2
L,  C,  R = 3, 4, 5
BL, B, BR = 6, 7, 8

# Adjacences "humaines" (utilisées uniquement pour construire les masques
# ci-dessous, et pour le débogage / les tests).
_ADJACENCES_BRUTES = {
    TL: [T, L, C],
    T:  [TL, TR, C],
    TR: [T, R, C],
    L:  [TL, BL, C],
    C:  [TL, T, TR, L, R, BL, B, BR],
    R:  [TR, BR, C],
    BL: [L, B, C],
    B:  [BL, BR, C],
    BR: [R, B, C],
}

# ADJ_MASK[i] = bitmask des voisins directs de la case i (calculé une fois,
# au chargement du module, pour ne jamais refaire le calcul pendant la
# recherche IA).
ADJ_MASK = [0] * NB_CASES
for _case, _voisins in _ADJACENCES_BRUTES.items():
    _m = 0
    for _v in _voisins:
        _m |= (1 << _v)
    ADJ_MASK[_case] = _m

# Lignes gagnantes sous forme de positions (lisible, utile pour le debug
# et pour exposer une info au frontend si besoin un jour).
LIGNES_GAGNANTES = [
    [TL, T, TR],   # ligne haut
    [L, C, R],     # ligne milieu
    [BL, B, BR],   # ligne bas
    [TL, L, BL],   # colonne gauche
    [T, C, B],     # colonne milieu
    [TR, R, BR],   # colonne droite
    [TL, C, BR],   # diagonale principale
    [TR, C, BL],   # diagonale secondaire
]

# Les mêmes lignes, sous forme de masques bit à bit -> c'est CETTE version
# qui est utilisée par le moteur et l'IA pour aller vite.
LIGNES_MASKS = [sum(1 << i for i in ligne) for ligne in LIGNES_GAGNANTES]


def bit(case):
    """Retourne le masque correspondant à une case unique."""
    return 1 << case


def cases_de(bits):
    """Retourne la liste des indices de case présents dans le bitmask `bits`.
    Utile pour le débogage / les tests, pas utilisé dans la boucle chaude."""
    return [i for i in range(NB_CASES) if bits & (1 << i)]