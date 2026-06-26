"""
Moteur de jeu Fanoron-telo : état, règles, phases.
"""

from copy import deepcopy
from core.regles import detecter_alignement, coups_placement, coups_mouvement
from core.exceptions import IllegalMoveError, GamePhaseError

class FanoronteloEngine:
    def __init__(self):
        # 'X' commence toujours
        self.reset()

    def reset(self):
        self.board = [None] * 9          # None, 'X', 'O'
        self.current_player = 'X'
        self.phase = 'placement'         # 'placement' ou 'mouvement'
        self.winner = None
        self.pieces_placed = {'X': 0, 'O': 0}

    def _switch_player(self):
        self.current_player = 'O' if self.current_player == 'X' else 'X'

    def make_move(self, move):
        """
        Exécute un coup. `move` dépend de la phase :
        - placement : int (indice de la case)
        - mouvement : tuple (src, dst)
        Retourne True si le coup termine la partie (victoire).
        """
        if self.winner is not None:
            raise IllegalMoveError("La partie est terminée.")

        if self.phase == 'placement':
            if not isinstance(move, int) or move not in coups_placement(self.board):
                raise IllegalMoveError("Placement invalide.")
            self.board[move] = self.current_player
            self.pieces_placed[self.current_player] += 1

            if detecter_alignement(self.board, self.current_player):
                self.winner = self.current_player
                return True

            # Passage en phase mouvement une fois les 6 pions placés
            if self.pieces_placed['X'] == 3 and self.pieces_placed['O'] == 3:
                self.phase = 'mouvement'

            self._switch_player()
            return False

        elif self.phase == 'mouvement':
            src, dst = move
            if (src, dst) not in coups_mouvement(self.board, self.current_player):
                raise IllegalMoveError("Mouvement invalide.")

            self.board[src] = None
            self.board[dst] = self.current_player

            if detecter_alignement(self.board, self.current_player):
                self.winner = self.current_player
                return True

            self._switch_player()
            return False

        else:
            raise GamePhaseError("Phase inconnue.")

    def get_valid_moves(self):
        """Retourne les coups légaux pour le joueur courant."""
        if self.phase == 'placement':
            return coups_placement(self.board)
        else:
            return coups_mouvement(self.board, self.current_player)

    def copy(self):
        """Retourne une copie profonde de l'état (pour l'IA)."""
        return deepcopy(self)