# Moteur Graphique 3D Immersif
from ursina import *
import config

class GameView:
    def __init__(self, logic_engine):
        self.logic = logic_engine
        self.selected_pion_pos = None
        
        # Conteneur principal pour permettre une rotation à 360° globale
        self.board_anchor = Entity()
        
        self.create_environment()
        self.create_board()
        self.create_intersections()
        self.pion_entities = {}

    def create_environment(self):
        # Caméra positionnée en hauteur pour une belle vue 3D plongeante
        camera.position = (0, 7, -9)
        camera.rotation_x = 35
        
        # Lumière ambiante style SF
        DirectionalLight(y=3, z=-3, shadow_map_resolution=(2048, 2048))
        AmbientLight(color=color.rgba(100, 100, 150, 255))

    def create_board(self):
        # Socle du plateau futuriste
        Entity(parent=self.board_anchor, model='cube', scale=(5, 0.2, 5), 
               color=config.COLOR_BOARD, texture='noise')
        
        # Lignes du réseau lumineuses
        # Horizontales et Verticales
        for i in [-2, 0, 2]:
            Entity(parent=self.board_anchor, model='cube', position=(0, 0.1, i), scale=(4, 0.02, 0.05), color=config.COLOR_LINES)
            Entity(parent=self.board_anchor, model='cube', position=(i, 0.1, 0), scale=(0.05, 0.02, 4), color=config.COLOR_LINES)
        # Diagonales
        Entity(parent=self.board_anchor, model='cube', position=(0, 0.1, 0), rotation_y=45, scale=(5.6, 0.02, 0.05), color=config.COLOR_LINES)
        Entity(parent=self.board_anchor, model='cube', position=(0, 0.1, 0), rotation_y=-45, scale=(5.6, 0.02, 0.05), color=config.COLOR_LINES)

    def create_intersections(self):
        self.nodes = {}
        for (r, c), pos in config.GRID_POSITIONS.items():
            # Intersections cliquables invisibles (ou légèrement lumineuses)
            node = Button(
                parent=self.board_anchor,
                model='sphere',
                position=pos + Vec3(0, 0.1, 0),
                scale=0.3,
                color=color.clear,
                highlight_color=config.COLOR_HOVER,
                pressed_color=config.COLOR_LINES
            )
            node.grid_pos = (r, c)
            node.on_click = lambda n=node: self.on_node_clicked(n.grid_pos)
            self.nodes[(r, c)] = node

    def spawn_pion_3d(self, grid_pos, player):
        # Utilisation de 'sphere' avec un scale aplati sur l'axe Y -> donne un jeton rond parfait et lisse
        pion_color = config.COLOR_PLAYER_1 if player == 1 else config.COLOR_PLAYER_2
        
        # Le Pion principal (Jeton néon)
        pion = Entity(
            parent=self.board_anchor,
            model='sphere',
            position=config.GRID_POSITIONS[grid_pos] + Vec3(0, 0.15, 0),
            scale=(0.6, 0.15, 0.6),  # Élargi en X/Z, écrasé en Y
            color=pion_color
        )
        
        # Un petit anneau ou cœur lumineux au centre pour le style cyber
        Entity(
            parent=pion, # Attaché au pion principal
            model='sphere',
            position=Vec3(0, 0.5, 0),
            scale=(0.4, 0.2, 0.4),
            color=color.white
        )
        
        self.pion_entities[grid_pos] = pion

    def update_visuals(self):
        # Supprime les anciens pions
        for ent in self.pion_entities.values():
            destroy(ent)
        self.pion_entities.clear()

        # Recrée les pions selon la matrice logique
        for pos, player in self.logic.board.items():
            if player is not None:
                self.spawn_pion_3d(pos, player)

        # Mises en surbrillance si sélectionné
        if self.selected_pion_pos and self.selected_pion_pos in self.pion_entities:
            self.pion_entities[self.selected_pion_pos].animate_y(0.6, duration=0.1)

    def on_node_clicked(self, grid_pos):
        if self.logic.winner:
            return

        current_cell = self.logic.board[grid_pos]

        if self.logic.phase == 1:
            # Phase de placement
            if self.logic.play_turn(action_type=1, start_pos=None, end_pos=grid_pos):
                self.update_visuals()
                
        elif self.logic.phase == 2:
            # Phase de mouvement
            if self.selected_pion_pos is None:
                if current_cell == self.logic.current_player:
                    self.selected_pion_pos = grid_pos
                    self.update_visuals()
            else:
                # Si on clique sur le même pion, on désélectionne
                if grid_pos == self.selected_pion_pos:
                    self.selected_pion_pos = None
                    self.update_visuals()
                    return
                
                # Tente de déplacer
                success = self.logic.play_turn(action_type=2, start_pos=self.selected_pion_pos, end_pos=grid_pos)
                if success:
                    self.selected_pion_pos = None
                self.update_visuals()

        if self.logic.winner:
            print_on_screen(f"JOUEUR {self.logic.winner} GAGNE !", scale=2, position=(-0.2, 0.3), duration=10)