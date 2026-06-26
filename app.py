import eel
from bridge.api import GameAPI

# Initialise Eel avec le dossier frontend
eel.init('web')

# Instance du moteur
api = GameAPI()

# --- Fonctions exposées au JavaScript ---

@eel.expose
def start_game(mode, difficulty=None):
    """Lance une nouvelle partie."""
    return api.start_game(mode, difficulty)

@eel.expose
def get_state():
    """Retourne l'état complet du jeu."""
    return api.get_state()

@eel.expose
def make_move(move):
    """
    Exécute un coup.
    move : int (placement), [src, dst] (mouvement), ou 'ai' pour déclencher l'IA.
    """
    if move == 'ai':
        return api._ai_play()
    else:
        return api.make_move(move)

# --- Lancement de l'application ---
if __name__ == '__main__':
    eel.start('index.html', mode='chrome', port=0, size=(1280, 800))