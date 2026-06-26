import eel
from bridge.api import GameAPI

# Init Eel
eel.init('web')

api = GameAPI()

@eel.expose
def start_game(mode, difficulty=None):
    print(f"[Python] start_game appelé : mode={mode}, difficulty={difficulty}")
    result = api.start_game(mode, difficulty)
    print(f"[Python] start_game retourne : {result}")
    return result

@eel.expose
def get_state():
    state = api.get_state()
    print(f"[Python] get_state -> {state['current_player']}, phase={state['phase']}")
    return state

@eel.expose
def make_move(move):
    print(f"[Python] make_move appelé : move={move}")
    result = api.make_move(move)
    print(f"[Python] make_move retourne : {result}")
    return result

@eel.expose
def undo():
    print("[Python] undo appelé")
    return api.undo()

@eel.expose
def redo():
    print("[Python] redo appelé")
    return api.redo()

if __name__ == '__main__':
    # 'default' ouvre le navigateur par défaut (Chrome, avec F12 possible)
    # Vous pouvez aussi forcer 'chrome' si besoin, mais 'default' est plus simple pour déboguer.
    eel.start('index.html', mode='chrome', port=0, size=(1280, 800))