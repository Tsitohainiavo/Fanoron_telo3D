import eel
from bridge.api import GameAPI

# Init Eel : pointe vers le dossier qui contient index.html
eel.init('web')

# Instance du backend (ton API existante, inchangée)
api = GameAPI()

# --- Fonctions exposées au JavaScript ---
# Elles remplacent exactement les méthodes que tu appelais via pywebview.api

@eel.expose
def start_game(mode, difficulty=None):
    return api.start_game(mode, difficulty)

@eel.expose
def get_state():
    return api.get_state()

@eel.expose
def make_move(move):
    """move peut être un int, une liste [src, dst], ou la chaîne 'ai'."""
    if move == 'ai':
        return api._ai_play()
    else:
        return api.make_move(move)

# --- Lancement ---
if __name__ == '__main__':
    # Ouvre Chrome en mode kiosk (sans barre d'outils) avec la page locale
    # Si tu préfères ton navigateur par défaut, remplace 'chrome' par 'default'
    eel.start('index.html', mode='chrome', port=0, size=(1280, 800))