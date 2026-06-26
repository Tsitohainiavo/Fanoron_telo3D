from copy import deepcopy
from core.regles import detecter_alignement, coups_placement, coups_mouvement
from core.exceptions import IllegalMoveError, GamePhaseError

class FanoronteloEngine:
    def __init__(self):
        self.reset()

    def reset(self):
        self.board = [None] * 9
        self.current_player = 'X'
        self.phase = 'placement'
        self.winner = None
        self.pieces_placed = {'X': 0, 'O': 0}
        self.history = []      # liste des snapshots (board, current_player, phase, winner, pieces_placed)
        self.future = []       # pour redo

    def _save_state(self):
        """Sauvegarde l'état actuel dans l'historique."""
        self.history.append({
            'board': deepcopy(self.board),
            'current_player': self.current_player,
            'phase': self.phase,
            'winner': self.winner,
            'pieces_placed': deepcopy(self.pieces_placed)
        })
        self.future.clear()    # on efface le futur après un nouveau coup

    def _restore_state(self, state):
        self.board = deepcopy(state['board'])
        self.current_player = state['current_player']
        self.phase = state['phase']
        self.winner = state['winner']
        self.pieces_placed = deepcopy(state['pieces_placed'])

    def undo(self):
        if len(self.history) <= 1:
            return False
        # L'état courant est déjà dans history[-1], on le déplace dans future
        current = self.history.pop()
        self.future.append(current)
        previous = self.history[-1]  # ne pas dépiler, on veut y revenir
        self._restore_state(previous)
        return True

    def redo(self):
        if not self.future:
            return False
        state = self.future.pop()
        self.history.append(state)
        self._restore_state(state)
        return True

    def _switch_player(self):
        self.current_player = 'O' if self.current_player == 'X' else 'X'

    def make_move(self, move):
        if self.winner is not None:
            raise IllegalMoveError("La partie est terminée.")

        self._save_state()  # sauvegarde avant le coup

        if self.phase == 'placement':
            if not isinstance(move, int) or move not in coups_placement(self.board):
                raise IllegalMoveError("Placement invalide.")
            self.board[move] = self.current_player
            self.pieces_placed[self.current_player] += 1

            if detecter_alignement(self.board, self.current_player):
                self.winner = self.current_player
                return True

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
        if self.phase == 'placement':
            return coups_placement(self.board)
        else:
            return coups_mouvement(self.board, self.current_player)

    def copy(self):
        return deepcopy(self)