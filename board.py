# board.py
"""Rendu 3D du plateau et des pions."""
import arcade
from arcade import Vec3
from constants import NODES_3D, EDGES, BOARD_MATERIAL, P1_COLOR, P2_COLOR

class Board3D:
    def __init__(self, engine):
        self.engine = engine
        # Primitives
        self.node_mesh = arcade.geometry.cylinder(radius=0.15, height=0.05, color=BOARD_MATERIAL)
        self.p1_pion = arcade.geometry.sphere(radius=0.35, color=P1_COLOR)
        self.p2_pion = arcade.geometry.sphere(radius=0.35, color=P2_COLOR)

    def draw(self, camera, time, selected_node=None, valid_targets=None):
        # 1. Arêtes (lignes)
        for a, b in EDGES:
            p1 = Vec3(*NODES_3D[a])
            p2 = Vec3(*NODES_3D[b])
            arcade.draw_line_3d(p1, p2, (200, 180, 140, 255), line_width=3, camera=camera)

        # 2. Intersections (petits disques)
        for node, pos_tuple in NODES_3D.items():
            pos = Vec3(*pos_tuple)
            self.node_mesh.draw(pos=pos, color=BOARD_MATERIAL, camera=camera)

        # 3. Points valides (phase 1)
        if valid_targets and self.engine.phase == 1:
            for n in valid_targets:
                pos = Vec3(*NODES_3D[n]) + Vec3(0, 0.1, 0)
                arcade.draw_circle_3d(pos, 0.3, (100, 255, 100, 150), camera=camera)

        # 4. Pions
        for node, player in self.engine.board.items():
            if player is not None:
                pos = Vec3(*NODES_3D[node]) + Vec3(0, 0.25, 0)  # légèrement au-dessus
                pion = self.p1_pion if player == 1 else self.p2_pion
                pion.draw(pos=pos, camera=camera)
                # Surbrillance si sélectionné
                if node == selected_node:
                    arcade.draw_circle_3d(pos, 0.45, (255, 255, 0, 100), camera=camera)