# Paramètres & Esthétique Futuriste
from ursina import color, Vec3

# Configuration de la fenêtre
WINDOW_TITLE = "Fanoron-Telo 3D // Cyber-Edition"
DEBUG_MODE = False

# Couleurs Cyberpunk / Futuristes
COLOR_BOARD = color.hex("#0d1117")      # Sombre métallique
COLOR_LINES = color.hex("#00f0ff")      # Néon Cyan
COLOR_PLAYER_1 = color.hex("#ff007f")   # Néon Rose / Magenta
COLOR_PLAYER_2 = color.hex("#00ff66")   # Néon Vert Émeraude
COLOR_HOVER = color.hex("#ffffff")      # Blanc éclatant au survol

# Positions des 9 intersections sur le plateau 3D (Matrice 3x3)
# On mappe les coordonnées (ligne, col) en coordonnées 3D (X, Y, Z)
GRID_POSITIONS = {
    (row, col): Vec3(col - 1, 0, 1 - row) * 2  # Espacement de 2 unités
    for row in range(3)
    for col in range(3)
}

# Connexions autorisées pour les mouvements (Adjacences du Fanoron-telo)
# Le centre (1,1) est connecté à tout le monde. Les diagonales sont incluses.
ADJACENCY_LIST = {
    (0,0): [(0,1), (1,0), (1,1)],
    (0,1): [(0,0), (0,2), (1,1)],
    (0,2): [(0,1), (1,2), (1,1)],
    (1,0): [(0,0), (2,0), (1,1)],
    (1,1): [(0,0), (0,1), (0,2), (1,0), (1,2), (2,0), (2,1), (2,2)],
    (1,2): [(0,2), (2,2), (1,1)],
    (2,0): [(1,0), (2,1), (1,1)],
    (2,1): [(2,0), (2,2), (1,1)],
    (2,2): [(2,1), (1,2), (1,1)]
}