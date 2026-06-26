# main.py
"""Fanoron-telo 3D – application desktop."""
import arcade
from arcade import Vec3
from engine import FanoronteloEngine
from camera import OrbitCamera
from board import Board3D
import math

SCREEN_WIDTH = 1280
SCREEN_HEIGHT = 720
TITLE = "Fanoron-telo 3D"

class FanoronGame(arcade.Window):
    def __init__(self):
        super().__init__(SCREEN_WIDTH, SCREEN_HEIGHT, TITLE, resizable=True,
                         antialiasing=True, enable_polling=True)
        self.engine = FanoronteloEngine()
        self.camera = OrbitCamera()
        self.board = Board3D(self.engine)
        self.selected_node = None
        self.valid_targets = []
        self.message = "Tour du Joueur 1 – Phase 1 : Placez un pion"
        self.mouse_x = 0
        self.mouse_y = 0

    def on_draw(self):
        self.clear(arcade.color.BLACK)
        cam = self.camera.get_camera()
        self.board.draw(cam, self.time, self.selected_node, self.valid_targets)
        # Message 2D en haut à gauche
        arcade.draw_text(self.message, 20, self.height - 40, arcade.color.WHITE, 16)

    def on_update(self, delta_time):
        pass

    def on_mouse_press(self, x, y, button, modifiers):
        if button == arcade.MOUSE_BUTTON_LEFT:
            self.camera.start_drag(x, y)
        # Clic droit pour intéraction avec le plateau (à implémenter via picking 3D)
        elif button == arcade.MOUSE_BUTTON_RIGHT:
            self.handle_click(x, y)

    def handle_click(self, x, y):
        """Picking 3D simple par rayon (à améliorer)."""
        # On récupère le rayon caméra -> souris
        cam = self.camera.get_camera()
        ray = cam.unproject(Vec3(x, y, 0.5))  # approximation
        # On cherche le nœud le plus proche
        closest_node = None
        closest_dist = float('inf')
        for node, pos_tuple in NODES_3D.items():
            pos = Vec3(*pos_tuple)
            dist = math.dist(ray, pos)  # simplifié, non fonctionnel sans vraie projection
            if dist < 1.0 and dist < closest_dist:
                closest_dist = dist
                closest_node = node
        if closest_node:
            self.node_clicked(closest_node)

    def node_clicked(self, node):
        """Réagit à un clic sur un nœud."""
        if self.engine.winner:
            return
        if self.engine.phase == 1:
            if self.engine.place_pion(node):
                self.valid_targets = []
                self.selected_node = None
                if self.engine.winner:
                    self.message = f"Joueur {self.engine.winner} a gagné !"
                elif self.engine.phase == 2:
                    self.message = f"Tour du Joueur {self.engine.tour} – Phase 2 : Déplacez un pion"
                else:
                    self.message = f"Tour du Joueur {self.engine.tour} – Phase 1 : Placez un pion"
        else:  # phase 2
            if self.selected_node is None:
                if self.engine.board.get(node) == self.engine.tour:
                    self.selected_node = node
                    self.valid_targets = self.engine.get_valid_moves(node)
            else:
                if node in self.valid_targets:
                    self.engine.move_pion(self.selected_node, node)
                    self.selected_node = None
                    self.valid_targets = []
                    if self.engine.winner:
                        self.message = f"Joueur {self.engine.winner} a gagné !"
                    else:
                        self.message = f"Tour du Joueur {self.engine.tour} – Phase 2 : Déplacez un pion"
                elif self.engine.board.get(node) == self.engine.tour:
                    self.selected_node = node
                    self.valid_targets = self.engine.get_valid_moves(node)
                else:
                    self.selected_node = None
                    self.valid_targets = []

    def on_mouse_release(self, x, y, button, modifiers):
        if button == arcade.MOUSE_BUTTON_LEFT:
            self.camera.stop_drag()

    def on_mouse_motion(self, x, y, dx, dy):
        self.mouse_x, self.mouse_y = x, y
        self.camera.update(x, y)

    def on_mouse_scroll(self, x, y, scroll_x, scroll_y):
        self.camera.zoom(scroll_y)

    def on_key_press(self, key, modifiers):
        if key == arcade.key.R:
            self.engine.reset()
            self.message = "Tour du Joueur 1 – Phase 1 : Placez un pion"
            self.selected_node = None
            self.valid_targets = []
        elif key == arcade.key.U:
            if self.engine.undo():
                self.message = f"Tour du Joueur {self.engine.tour} – Phase {self.engine.phase}"
                self.selected_node = None
                self.valid_targets = []
        elif key == arcade.key.ESCAPE:
            self.close()

def main():
    game = FanoronGame()
    game.run()

if __name__ == "__main__":
    main()