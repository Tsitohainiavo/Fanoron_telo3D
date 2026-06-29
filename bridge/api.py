import random
from core.moteur import FanoronteloEngine
from ia.minimax import get_best_move as minimax_move
from ia.alphabeta import get_best_move as alphabeta_move

DIFFICULTY_DEPTHS = {'easy': 2, 'medium': 4, 'hard': 6}


class GameAPI:
    def __init__(self):
        self.engine = FanoronteloEngine()
        self.mode = None
        self.difficulty = None
        self.ai_player = None
        self.ai1 = None
        self.ai2 = None
        self.last_move = None

    def start_game(self, mode, difficulty=None):
        self.engine.reset()
        first_player = random.choice(['X', 'O'])
        self.engine.current_player = first_player
        self.mode = mode
        self.difficulty = difficulty
        self.ai_player = None
        self.ai1 = None
        self.ai2 = None
        self.last_move = None
        print(f"[GameAPI] Nouvelle partie : mode={mode}, difficulty={difficulty}, first={first_player}")

        if mode == 'pvp':
            return {'status': 'started', 'current_player': first_player}
        elif mode == 'pve':
            if difficulty not in DIFFICULTY_DEPTHS:
                self.mode = None
                return {'status': 'error', 'message': 'Difficulté invalide'}
            self.ai_player = 'O' if first_player == 'X' else 'X'
            return {'status': 'started', 'current_player': first_player}
        elif mode == 'demo':
            self.ai1 = ('X', 'minimax', 'medium')
            self.ai2 = ('O', 'alphabeta', 'hard')
            return {'status': 'started', 'current_player': first_player}
        else:
            self.mode = None
            return {'status': 'error', 'message': 'Mode inconnu'}

    def get_state(self):
        return {
            'board': self.engine.board,
            'current_player': self.engine.current_player,
            'phase': self.engine.phase,
            'winner': self.engine.winner,
            'valid_moves': self.engine.get_valid_moves(),
            'last_move': self.last_move
        }

    def make_move(self, move):
        if self.engine.winner is not None:
            return {'error': 'Partie terminée', 'last_move': None}
        if move == 'ai':
            return self._ai_play()
        if self.mode == 'demo':
            return {'error': "Mode démo : pas d'intervention humaine", 'last_move': None}
        if self.mode == 'pve' and self.engine.current_player == self.ai_player:
            return {'error': "C'est au tour de l'IA", 'last_move': None}
        if isinstance(move, list):
            move = tuple(move)
        try:
            self.engine.make_move(move)
            self.last_move = move
        except Exception as e:
            return {'error': str(e), 'last_move': None}
        state = self.get_state()
        if self.engine.winner is None and self._is_ai_turn():
            state = self._ai_play()
        return state

    def _is_ai_turn(self):
        if self.mode == 'demo':
            return True
        if self.mode == 'pve' and self.engine.current_player == self.ai_player:
            return True
        return False

    def _ai_play(self):
        if self.engine.winner is not None:
            return self.get_state()
        if self.mode == 'pve':
            depth = DIFFICULTY_DEPTHS[self.difficulty]
            algo = alphabeta_move if self.difficulty == 'hard' else minimax_move
            move = algo(self.engine.copy_for_search(), depth)
        elif self.mode == 'demo':
            joueur = self.engine.current_player
            if joueur == 'X':
                _, _, diff = self.ai1
                move = minimax_move(self.engine.copy_for_search(), DIFFICULTY_DEPTHS[diff])
            else:
                _, _, diff = self.ai2
                move = alphabeta_move(self.engine.copy_for_search(), DIFFICULTY_DEPTHS[diff])
        else:
            return self.get_state()
        if move is not None:
            self.engine.make_move(move)
            self.last_move = move
        else:
            self.last_move = None
        return self.get_state()

    def undo(self):
        if self.engine.undo():
            self.last_move = None
            return self.get_state()
        return {'error': 'Rien à annuler', 'last_move': None}

    def redo(self):
        if self.engine.redo():
            self.last_move = None
            return self.get_state()
        return {'error': 'Rien à rétablir', 'last_move': None}