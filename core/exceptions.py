class FanoronTeloError(Exception):
    """Exception de base pour le jeu."""
    pass

class IllegalMoveError(FanoronTeloError):
    """Coup invalide."""
    pass

class GamePhaseError(FanoronTeloError):
    """Action hors phase."""
    pass