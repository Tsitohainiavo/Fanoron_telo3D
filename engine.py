# engine.py
"""Moteur de jeu Fanoron-telo avec phases de placement et mouvement."""
from constants import NODES_3D, WINNING_LINES, EDGES

class FanoronteloEngine:
    def __init__(self):
        self.board = {node: None for node in NODES_3D}   # None, 1 ou 2
        self.phase = 1                  # 1 = placement, 2 = mouvement
        self.tour = 1                   # 1 ou 2
        self.pions_places = {1: 0, 2: 0}
        self.winner = None
        self.history = []               # pile pour undo/redo (états complets)

    def reset(self):
        self.board = {node: None for node in NODES_3D}
        self.phase = 1
        self.tour = 1
        self.pions_places = {1: 0, 2: 0}
        self.winner = None
        self.history.clear()

    def save_state(self):
        """Sauvegarde l'état actuel pour undo."""
        self.history.append({
            'board': dict(self.board),
            'phase': self.phase,
            'tour': self.tour,
            'pions_places': dict(self.pions_places),
            'winner': self.winner
        })

    def undo(self):
        if not self.history:
            return False
        state = self.history.pop()
        self.board = state['board']
        self.phase = state['phase']
        self.tour = state['tour']
        self.pions_places = state['pions_places']
        self.winner = state['winner']
        return True

    def get_valid_placements(self):
        """Retourne la liste des nœuds libres (phase 1)."""
        if self.phase != 1:
            return []
        return [n for n, p in self.board.items() if p is None]

    def get_valid_moves(self, src):
        """Retourne les destinations possibles pour le pion en src (phase 2)."""
        if self.phase != 2 or self.board.get(src) != self.tour:
            return []
        moves = []
        for a, b in EDGES:
            if a == src and self.board[b] is None:
                moves.append(b)
            elif b == src and self.board[a] is None:
                moves.append(a)
        return moves

    def place_pion(self, node):
        """Place un pion en phase 1. Retourne True si le coup est valide."""
        if self.phase != 1 or self.board[node] is not None or self.winner:
            return False
        self.save_state()
        self.board[node] = self.tour
        self.pions_places[self.tour] += 1
        if self._check_win(self.tour):
            self.winner = self.tour
            return True
        if self.pions_places[1] == 3 and self.pions_places[2] == 3:
            self.phase = 2
        self.tour = 2 if self.tour == 1 else 1
        return True

    def move_pion(self, src, dst):
        """Déplace un pion en phase 2. Retourne True si valide."""
        if self.phase != 2 or self.board.get(src) != self.tour or self.winner:
            return False
        if dst not in self.get_valid_moves(src):
            return False
        self.save_state()
        self.board[src] = None
        self.board[dst] = self.tour
        if self._check_win(self.tour):
            self.winner = self.tour
            return True
        self.tour = 2 if self.tour == 1 else 1
        return True

    def _check_win(self, player):
        """Vérifie si le joueur 'player' a aligné 3 pions."""
        for line in WINNING_LINES:
            if all(self.board[n] == player for n in line):
                return True
        return False