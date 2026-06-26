# constants.py
"""Géométrie 3D du plateau et constantes visuelles."""

# ---------- Positions des 9 intersections (plan Y=0) ----------
NODES_3D = {
    "NO": (-1, 0,  1), "N": (0, 0,  1), "NE": (1, 0,  1),
    "O":  (-1, 0,  0), "C": (0, 0,  0), "E":  (1, 0,  0),
    "SO": (-1, 0, -1), "S": (0, 0, -1), "SE": (1, 0, -1),
}

# ---------- Connexions entre intersections ----------
EDGES = [
    ("NO","N"),  ("N","NE"), ("SO","S"),  ("S","SE"),
    ("NO","O"),  ("O","SO"), ("NE","E"),  ("E","SE"),
    ("N","C"),   ("C","S"),  ("O","C"),   ("C","E"),
    ("NO","C"),  ("C","SE"), ("NE","C"),  ("C","SO"),
]

# ---------- Lignes gagnantes ----------
WINNING_LINES = [
    ("NO","N","NE"), ("SO","S","SE"), ("NO","O","SO"), ("NE","E","SE"),
    ("N","C","S"),  ("O","C","E"),  ("NO","C","SE"), ("NE","C","SO"),
]

# ---------- Couleurs ----------
BG_COLOR = (18, 18, 30, 255)
BOARD_MATERIAL = (160, 120, 70)
P1_COLOR = (220, 60, 60)
P2_COLOR = (50, 140, 240)
HIGHLIGHT_COLOR = (255, 255, 100, 128)