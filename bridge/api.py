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

    def start_game(self, mode, difficulty=None):
        self.engine.reset()
        self.mode = mode
        self.difficulty = difficulty
        self.ai_player = None
        self.ai1 = None
        self.ai2 = None
        print(f"[GameAPI] Nouvelle partie : mode={mode}, difficulty={difficulty}")

        if mode == 'pvp':
            return {'status': 'started', 'current_player': 'X'}

        elif mode == 'pve':
            if difficulty not in DIFFICULTY_DEPTHS:
                # On annule l'état : pas question de laisser une partie
                # "pve" démarrée avec une difficulté invalide, ça faisait
                # planter le premier appel IA (KeyError sur self.difficulty).
                self.mode = None
                return {'status': 'error', 'message': 'Difficulté invalide'}
            self.ai_player = 'O'
            return {'status': 'started', 'current_player': 'X'}

        elif mode == 'demo':
            self.ai_player = None
            self.ai1 = ('X', 'minimax', 'medium')
            self.ai2 = ('O', 'alphabeta', 'hard')
            return {'status': 'started', 'current_player': 'X'}

        else:
            self.mode = None
            return {'status': 'error', 'message': 'Mode inconnu'}

    def get_state(self):
        return {
            'board': self.engine.board,
            'current_player': self.engine.current_player,
            'phase': self.engine.phase,
            'winner': self.engine.winner,
            'valid_moves': self.engine.get_valid_moves()
        }

    def make_move(self, move):
        print(f"[GameAPI] make_move reçu : {move}")
        if self.engine.winner is not None:
            return {'error': 'Partie terminée'}

        # Si le frontend demande un coup d'IA (quel que soit le mode)
        if move == 'ai':
            print("[GameAPI] IA va jouer (appel direct)...")
            return self._ai_play()

        # Sinon, c'est un coup humain -> vérifier les droits
        if self.mode == 'demo':
            return {'error': "Mode démo : pas d'intervention humaine"}
        if self.mode == 'pve' and self.engine.current_player == self.ai_player:
            return {'error': "C'est au tour de l'IA"}

        if isinstance(move, list):
            move = tuple(move)

        try:
            self.engine.make_move(move)
        except Exception as e:
            return {'error': str(e)}

        state = self.get_state()
        # Si après le coup humain l'IA doit jouer, on la déclenche
        if self.engine.winner is None and self._is_ai_turn():
            print("[GameAPI] IA va jouer après coup humain...")
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
            # copy_for_search() : copie sans historique, beaucoup plus
            # rapide que l'ancien engine.copy() (deepcopy de tout l'objet).
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
            print(f"[GameAPI] IA joue : {move}")
            self.engine.make_move(move)
        else:
            print("[GameAPI] Aucun coup possible pour l'IA !")
        return self.get_state()

    def undo(self):
        if self.engine.undo():
            return self.get_state()
        return {'error': 'Rien à annuler'}

    def redo(self):
        if self.engine.redo():
            return self.get_state()
        return {'error': 'Rien à rétablir'}