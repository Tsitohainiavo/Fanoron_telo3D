from ursina import *
import config
from logic import FanoronTeloLogic
from view import GameView

# Initialisation d'Ursina
app = Ursina(title=config.WINDOW_TITLE, development_mode=config.DEBUG_MODE)
window.fps_counter.enabled = True

# Instanciation de notre architecture
logic_engine = FanoronTeloLogic()
view_engine = GameView(logic_engine)

# Variables pour stocker la rotation fluide
rotation_speed = 150

def update():
    """ Boucle principale de rendu d'Ursina - Gère les entrées temps réel et l'optimisation """
    # Rotation 100% libre à 360 degrés à l'aide des flèches directionnelles ou Q/D
    if held_keys['arrow_left'] or held_keys['q']:
        view_engine.board_anchor.rotation_y += rotation_speed * time.dt
    if held_keys['arrow_right'] or held_keys['d']:
        view_engine.board_anchor.rotation_y -= rotation_speed * time.dt
    if held_keys['arrow_up'] or held_keys['z']:
        view_engine.board_anchor.rotation_x += rotation_speed * time.dt
    if held_keys['arrow_down'] or held_keys['s']:
        view_engine.board_anchor.rotation_x -= rotation_speed * time.dt

# Lancement de l'application desktop
app.run()