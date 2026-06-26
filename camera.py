# camera.py
"""Caméra orbitale libre avec souris (Arcade 3D)."""
import arcade
from arcade import Camera3D, Vec3
import math

class OrbitCamera:
    def __init__(self, distance=5.0):
        self.distance = distance
        self.theta = 0.0           # rotation horizontale
        self.phi = math.radians(60) # élévation
        self.target = Vec3(0, 0.5, 0)  # centre du plateau
        self.last_x = 0
        self.last_y = 0
        self.dragging = False

    def start_drag(self, x, y):
        self.dragging = True
        self.last_x = x
        self.last_y = y

    def stop_drag(self):
        self.dragging = False

    def update(self, mouse_x, mouse_y):
        if self.dragging:
            dx = mouse_x - self.last_x
            dy = mouse_y - self.last_y
            self.theta -= dx * 0.005
            self.phi -= dy * 0.005
            self.phi = max(0.1, min(math.pi/2 - 0.1, self.phi))  # empêche de passer sous le sol
            self.last_x = mouse_x
            self.last_y = mouse_y

    def zoom(self, delta):
        self.distance = max(2.0, min(20.0, self.distance - delta * 0.5))

    def get_camera(self):
        # Position de l'œil en coordonnées sphériques
        x = self.target.x + self.distance * math.sin(self.phi) * math.cos(self.theta)
        y = self.target.y + self.distance * math.cos(self.phi)
        z = self.target.z + self.distance * math.sin(self.phi) * math.sin(self.theta)
        eye = Vec3(x, y, z)
        up = Vec3(0, 1, 0)
        cam = Camera3D()
        cam.look_at(eye, self.target, up)
        return cam