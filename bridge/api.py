"""
API exposée au JavaScript via pywebview.
"""

from core.moteur import FanoronteloEngine
from ia.minimax import get_best_move as minimax_move
from ia.alphabeta import get_best_move as alphabeta_move
import json

class GameAPI:
    def __init__(self):
        self.engine = FanoronteloEngine()
        self.mode = None          # 'pvp', 'pve', 'demo'
        self.difficulty = None    # 'easy', 'medium', 'hard'
        self.ai_player = None     # 'O' si IA joue les blancs dans pve
        self.ai1 = None
        self.ai2 = None

    def start_game(self, mode, difficulty=None):
        """
        Initialise une nouvelle partie.
        mode: 'pvp', 'pve', 'demo'
        difficulty: pour 'pve' -> 'easy','medium','hard'
        """
        self.engine.reset()
        self.mode = mode
        self.difficulty = difficulty

        if mode == 'pvp':
            return {'status': 'started', 'current_player': 'X'}
        elif mode == 'pve':
            self.ai_player = 'O'  # l'IA joue toujours en second
            if difficulty in ['easy', 'medium', 'hard']:
                return {'status': 'started', 'current_player': 'X'}
            else:
                return {'status': 'error', 'message': 'Difficulté invalide'}
        elif mode == 'demo':
            # IA vs IA : minimax(moyen) vs alphabeta(difficile)
            self.ai_player = None
            self.ai1 = ('X', 'minimax', 'medium')  # joue en premier
            self.ai2 = ('O', 'alphabeta', 'hard')
            return {'status': 'started', 'current_player': 'X'}
        else:
            return {'status': 'error', 'message': 'Mode inconnu'}

    def get_state(self):
        """Retourne l'état complet du plateau et phase."""
        return {
            'board': self.engine.board,
            'current_player': self.engine.current_player,
            'phase': self.engine.phase,
            'winner': self.engine.winner,
            'valid_moves': self.engine.get_valid_moves()
        }

    def make_move(self, move):
        """
        Reçoit un coup du joueur humain (placement: int, mouvement: [src,dst]).
        Exécute le coup puis, si le mode le prévoit, fait jouer l'IA.
        Retourne l'état complet après le(s) coup(s).
        """
        if self.engine.winner is not None:
            return {'error': 'Partie terminée'}

        # Si c'est au tour d'une IA, on refuse le coup humain
        if self.mode == 'pve' and self.engine.current_player == self.ai_player:
            return {'error': "C'est au tour de l'IA"}
        if self.mode == 'demo':
            return {'error': 'Mode démo, pas d intervention humaine'}

        # Conversion du move (JSON -> tuple si nécessaire)
        if isinstance(move, list):
            move = tuple(move)

        try:
            self.engine.make_move(move)
        except Exception as e:
            return {'error': str(e)}

        # Si le coup humain a terminé la partie ou changé de tour, on laisse l'IA jouer
        state = self.get_state()
        if self.engine.winner is None and self._is_ai_turn():
            state = self._ai_play()

        return state

    def _is_ai_turn(self):
        """Vérifie si c'est au tour d'une IA de jouer."""
        if self.mode == 'pve' and self.engine.current_player == self.ai_player:
            return True
        if self.mode == 'demo':
            return True
        return False

    def _ai_play(self):
        """Fait jouer l'IA appropriée et retourne l'état."""
        if self.engine.winner is not None:
            return self.get_state()

        if self.mode == 'pve':
            depth = {'easy': 2, 'medium': 4, 'hard': 6}[self.difficulty]
            if self.difficulty == 'hard':
                move = alphabeta_move(self.engine.copy(), depth)
            else:
                move = minimax_move(self.engine.copy(), depth)
        elif self.mode == 'demo':
            player = self.engine.current_player
            if player == 'X':
                # ai1 = minimax medium
                move = minimax_move(self.engine.copy(), 4)
            else:
                move = alphabeta_move(self.engine.copy(), 6)

        if move is not None:
            self.engine.make_move(move)

        return self.get_state()