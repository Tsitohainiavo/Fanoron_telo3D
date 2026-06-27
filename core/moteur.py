"""
Moteur de jeu Fanoron-telo.

État interne représenté par DEUX entiers (bitboards) : x_bits et o_bits.
Chacun contient 9 bits, un par intersection. C'est ce qui permet :

  - une copie d'état quasi instantanée (copier deux int, pas une liste
    Python + un dict, et surtout pas tout l'historique d'annulation),
  - des tests d'alignement / génération de coups en quelques opérations
    binaires plutôt qu'en boucles sur des listes.

L'interface publique (`board`, `make_move`, `get_valid_moves`, `undo`,
`redo`, `copy`) reste compatible avec le reste du projet (bridge/api.py,
ia/minimax.py, ia/alphabeta.py) : seul l'intérieur a changé.
"""

from core.plateau import ADJ_MASK, NB_CASES
from core.regles import detecter_alignement, masque_libre, coups_placement, coups_mouvement
from core.exceptions import IllegalMoveError, GamePhaseError


class FanoronteloEngine:

    __slots__ = (
        'x_bits', 'o_bits', 'current_player', 'phase', 'winner',
        'pieces_placed', 'history', 'future'
    )

    def __init__(self):
        self.reset()

    def reset(self):
        self.x_bits = 0
        self.o_bits = 0
        self.current_player = 'X'
        self.phase = 'placement'
        self.winner = None
        self.pieces_placed = {'X': 0, 'O': 0}
        self.history = []   # pile de snapshots légers (tuples), pour undo
        self.future = []    # pile de snapshots, pour redo

    # ------------------------------------------------------------------
    # Représentation "classique" pour l'extérieur (frontend JS, debug)
    # ------------------------------------------------------------------
    @property
    def board(self):
        """Liste de 9 cases : 'X', 'O' ou None. Reconstruite à la demande
        à partir des bitboards (pas stockée, pour ne jamais désynchroniser
        les deux représentations)."""
        result = [None] * NB_CASES
        for i in range(NB_CASES):
            masque = 1 << i
            if self.x_bits & masque:
                result[i] = 'X'
            elif self.o_bits & masque:
                result[i] = 'O'
        return result

    def _bits_du_joueur(self, joueur):
        return self.x_bits if joueur == 'X' else self.o_bits

    # ------------------------------------------------------------------
    # Historique (undo / redo)
    # ------------------------------------------------------------------
    def _snapshot(self):
        """Capture l'état courant sous forme de tuple immuable (très
        léger à empiler/copier, contrairement à un deepcopy de listes)."""
        return (
            self.x_bits, self.o_bits, self.current_player, self.phase,
            self.winner, self.pieces_placed['X'], self.pieces_placed['O']
        )

    def _restaurer(self, snap):
        (self.x_bits, self.o_bits, self.current_player, self.phase,
         self.winner, px, po) = snap
        self.pieces_placed = {'X': px, 'O': po}

    def undo(self):
        """Annule le dernier coup joué. Retourne False s'il n'y a rien à annuler."""
        if not self.history:
            return False
        # On sauvegarde l'état courant (celui d'AVANT l'annulation) pour
        # pouvoir y revenir avec redo().
        self.future.append(self._snapshot())
        etat_precedent = self.history.pop()
        self._restaurer(etat_precedent)
        return True

    def redo(self):
        """Rejoue le dernier coup annulé. Retourne False s'il n'y a rien à rétablir."""
        if not self.future:
            return False
        self.history.append(self._snapshot())
        etat_suivant = self.future.pop()
        self._restaurer(etat_suivant)
        return True

    def _switch_player(self):
        self.current_player = 'O' if self.current_player == 'X' else 'X'

    # ------------------------------------------------------------------
    # Coups
    # ------------------------------------------------------------------
    def make_move(self, move, save_history=True):
        """
        Joue un coup.
          - phase 'placement' : move = int (indice de case 0-8)
          - phase 'mouvement' : move = (src, dst)

        `save_history=False` permet à l'IA de jouer des coups pendant sa
        recherche sans alourdir la pile d'annulation (elle utilise de
        toute façon des copies jetables, voir copy_for_search()).
        """
        if self.winner is not None:
            raise IllegalMoveError("La partie est terminée.")

        if save_history:
            self.history.append(self._snapshot())
            self.future.clear()

        joueur = self.current_player

        if self.phase == 'placement':
            if not isinstance(move, int) or not (0 <= move < NB_CASES):
                raise IllegalMoveError("Placement invalide.")

            case_bit = 1 << move
            libre = masque_libre(self.x_bits, self.o_bits)
            if not (libre & case_bit):
                raise IllegalMoveError("Placement invalide.")

            if joueur == 'X':
                self.x_bits |= case_bit
            else:
                self.o_bits |= case_bit
            self.pieces_placed[joueur] += 1

            if detecter_alignement(self._bits_du_joueur(joueur)):
                self.winner = joueur
                return True

            if self.pieces_placed['X'] == 3 and self.pieces_placed['O'] == 3:
                self.phase = 'mouvement'

            self._switch_player()
            return False

        elif self.phase == 'mouvement':
            try:
                src, dst = move
            except (TypeError, ValueError):
                raise IllegalMoveError("Mouvement invalide.")

            if not (isinstance(src, int) and isinstance(dst, int)
                    and 0 <= src < NB_CASES and 0 <= dst < NB_CASES):
                raise IllegalMoveError("Mouvement invalide.")

            src_bit, dst_bit = 1 << src, 1 << dst
            bits_joueur = self._bits_du_joueur(joueur)
            libre = masque_libre(self.x_bits, self.o_bits)

            if not (bits_joueur & src_bit):
                raise IllegalMoveError("Mouvement invalide : pas votre pion.")
            if not (libre & dst_bit):
                raise IllegalMoveError("Mouvement invalide : case occupée.")
            if not (ADJ_MASK[src] & dst_bit):
                raise IllegalMoveError("Mouvement invalide : case non adjacente.")

            if joueur == 'X':
                self.x_bits = (self.x_bits & ~src_bit) | dst_bit
            else:
                self.o_bits = (self.o_bits & ~src_bit) | dst_bit

            if detecter_alignement(self._bits_du_joueur(joueur)):
                self.winner = joueur
                return True

            self._switch_player()
            return False

        else:
            raise GamePhaseError("Phase inconnue.")

    def get_valid_moves(self):
        if self.phase == 'placement':
            return coups_placement(self.x_bits, self.o_bits)
        else:
            bits_joueur = self._bits_du_joueur(self.current_player)
            return coups_mouvement(bits_joueur, self.x_bits, self.o_bits)

    # ------------------------------------------------------------------
    # Copies
    # ------------------------------------------------------------------
    def copy(self):
        """Copie complète, avec son propre historique indépendant.
        Utilisée côté UI (l'API garde un seul moteur "officiel" mais on
        pourrait vouloir une copie complète ailleurs)."""
        clone = FanoronteloEngine.__new__(FanoronteloEngine)
        clone.x_bits = self.x_bits
        clone.o_bits = self.o_bits
        clone.current_player = self.current_player
        clone.phase = self.phase
        clone.winner = self.winner
        clone.pieces_placed = dict(self.pieces_placed)
        clone.history = list(self.history)
        clone.future = list(self.future)
        return clone

    def copy_for_search(self):
        """
        Copie ultra-légère destinée à la recherche IA : on ne copie PAS
        l'historique d'annulation (totalement inutile pendant une recherche
        minimax/alpha-bêta, et c'était la cause principale de la lenteur
        de l'ancienne version, qui faisait un deepcopy() de tout l'objet,
        historique compris, à CHAQUE nœud de l'arbre de recherche).

        Ici, une copie ne coûte que la copie de deux entiers + quelques
        attributs scalaires : c'est quasiment gratuit, même appelé des
        centaines de milliers de fois.
        """
        clone = FanoronteloEngine.__new__(FanoronteloEngine)
        clone.x_bits = self.x_bits
        clone.o_bits = self.o_bits
        clone.current_player = self.current_player
        clone.phase = self.phase
        clone.winner = self.winner
        clone.pieces_placed = dict(self.pieces_placed)
        clone.history = []
        clone.future = []
        return clone

    def cle_zobrist(self):
        """Clé compacte identifiant intégralement l'état du jeu (utilisée
        par la table de transposition de l'alpha-bêta)."""
        return (self.x_bits, self.o_bits, self.current_player, self.phase)