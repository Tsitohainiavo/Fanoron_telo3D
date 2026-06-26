"""
Fonctions de vérification des règles : alignement, coups valides.
"""

from core.plateau import ADJACENCES, LIGNES_GAGNANTES

def detecter_alignement(board, joueur):
    """Retourne True si `joueur` a trois pions alignés."""
    for ligne in LIGNES_GAGNANTES:
        if all(board[i] == joueur for i in ligne):
            return True
    return False

def coups_placement(board):
    """Retourne la liste des indices libres (phase placement)."""
    return [i for i, case in enumerate(board) if case is None]

def coups_mouvement(board, joueur):
    """
    Retourne la liste des mouvements possibles pour `joueur` :
    (depuis, vers) pour chaque pion pouvant bouger vers une case libre adjacente.
    """
    mouvements = []
    for src, case in enumerate(board):
        if case == joueur:
            for dst in ADJACENCES[src]:
                if board[dst] is None:
                    mouvements.append((src, dst))
    return mouvements