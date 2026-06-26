"""
Représentation du plateau de Fanoron-telo.
9 intersections indexées 0-8, adjacences selon le diagramme traditionnel.
"""

# Index des intersections
TL, T, TR = 0, 1, 2
L, C, R = 3, 4, 5
BL, B, BR = 6, 7, 8

INTERSECTIONS = [
    TL, T, TR,
    L, C, R,
    BL, B, BR
]

# Adjacences : pour chaque intersection, liste des voisins directs
ADJACENCES = {
    TL: [T, L, C],
    T:  [TL, TR, C],
    TR: [T, R, C],
    L:  [TL, BL, C],
    C:  [TL, T, TR, L, R, BL, B, BR],
    R:  [TR, BR, C],
    BL: [L, B, C],
    B:  [BL, BR, C],
    BR: [R, B, C]
}

# Toutes les lignes gagnantes (lignes, colonnes, diagonales)
LIGNES_GAGNANTES = [
    [TL, T, TR],    # ligne haut
    [L, C, R],      # ligne milieu
    [BL, B, BR],    # ligne bas
    [TL, L, BL],    # colonne gauche
    [T, C, B],      # colonne milieu
    [TR, R, BR],    # colonne droite
    [TL, C, BR],    # diagonale principale
    [TR, C, BL]     # diagonale secondaire
]