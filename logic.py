# Logique Métier pure - Prête pour le Web
class FanoronTeloLogic:
    def __init__(self):
        # Plateau vide : None, ou 1 pour Joueur 1, 2 pour Joueur 2
        self.board = { (r, c): None for r in range(3) for c in range(3) }
        self.current_player = 1
        self.phase = 1  # Phase 1: Placement, Phase 2: Mouvement
        self.winner = None

    def get_pions_count(self, player):
        return sum(1 for v in self.board.values() if v == player)

    def check_victory(self, player):
        # Lignes, Colonnes et Diagonales gagnantes
        lines = [
            # Lignes
            [(0,0), (0,1), (0,2)], [(1,0), (1,1), (1,2)], [(2,0), (2,1), (2,2)],
            # Colonnes
            [(0,0), (1,0), (2,0)], [(0,1), (1,1), (2,1)], [(0,2), (1,2), (2,2)],
            # Diagonales
            [(0,0), (1,1), (2,2)], [(0,2), (1,1), (2,0)]
        ]
        for line in lines:
            if all(self.board[pos] == player for pos in line):
                return True
        return False

    def play_turn(self, action_type, start_pos, end_pos):
        """ Gère un tour de jeu de manière purement logique """
        if self.winner:
            return False

        if self.phase == 1:  # PHASE DE PLACEMENT
            if self.board[end_pos] is not None:
                return False
            self.board[end_pos] = self.current_player
            
            if self.check_victory(self.current_player):
                self.winner = self.current_player
                return True
                
            # Vérification de transition de phase
            if self.get_pions_count(1) == 3 and self.get_pions_count(2) == 3:
                self.phase = 2
                
        elif self.phase == 2:  # PHASE DE MOUVEMENT
            from config import ADJACENCY_LIST
            if self.board[start_pos] != self.current_player or self.board[end_pos] is not None:
                return False
            if end_pos not in ADJACENCY_LIST[start_pos]:
                return False
                
            # Exécution du déplacement
            self.board[start_pos] = None
            self.board[end_pos] = self.current_player
            
            if self.check_victory(self.current_player):
                self.winner = self.current_player
                return True

        # Changement de joueur
        self.current_player = 2 if self.current_player == 1 else 1
        return True