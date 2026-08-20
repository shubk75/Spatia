"""
Sample Dataset Generator for instant 1-click test drives.
Renders 6-directional images for:
1. Heritage Temple Sanctuary (Historical Frescoes, Archways, Carved Ceiling)
2. Modern Architecture Loft (Living Room, Skyline Windows, Dining, Bookshelves)
Includes realistic simulated defects to demonstrate quality detection and human verification!
"""
import numpy as np
import cv2
import os
from typing import Dict, Any


class SampleDataService:
    @staticmethod
    def generate_procedural_room(room_type: str = "heritage", size: int = 1024) -> Dict[str, np.ndarray]:
        """
        Renders rich, textured 6-face images with simulated visual structures.
        """
        faces = {}
        s = size

        if room_type == "heritage":
            # 1. NORTH (Ancient Altar & Pillar Arch)
            north = np.zeros((s, s, 3), dtype=np.uint8)
            # Wall gradient (warm stone)
            for y in range(s):
                factor = 0.5 + 0.5 * (y / s)
                north[y, :] = (int(35 * factor), int(55 * factor), int(75 * factor))
            # Stone pillars
            cv2.rectangle(north, (int(s*0.15), 0), (int(s*0.28), s), (60, 85, 115), -1)
            cv2.rectangle(north, (int(s*0.72), 0), (int(s*0.85), s), (60, 85, 115), -1)
            # Carved Arch
            cv2.ellipse(north, (int(s*0.5), int(s*0.35)), (int(s*0.32), int(s*0.25)), 0, 180, 360, (75, 105, 140), 12)
            # Center Altar Relic
            cv2.rectangle(north, (int(s*0.38), int(s*0.55)), (int(s*0.62), int(s*0.85)), (45, 70, 95), -1)
            cv2.circle(north, (int(s*0.5), int(s*0.48)), int(s*0.08), (60, 140, 200), -1) # Golden Emblem
            cv2.putText(north, "HERITAGE SANCTUARY [NORTH]", (int(s*0.22), int(s*0.95)), cv2.FONT_HERSHEY_DUPLEX, 0.9, (180, 210, 240), 2)
            faces["north"] = north

            # 2. SOUTH (Arched Portal / Entrance) - with slight overexposure defect on doorway
            south = np.zeros((s, s, 3), dtype=np.uint8)
            for y in range(s):
                south[y, :] = (int(30 + y*0.04), int(45 + y*0.05), int(65 + y*0.07))
            # Arched Entrance
            cv2.rectangle(south, (int(s*0.32), int(s*0.3)), (int(s*0.68), s), (250, 252, 255), -1) # Bright light doorway
            cv2.ellipse(south, (int(s*0.5), int(s*0.3)), (int(s*0.18), int(s*0.18)), 0, 180, 360, (250, 252, 255), -1)
            # Side Torches
            cv2.circle(south, (int(s*0.22), int(s*0.45)), int(s*0.04), (40, 120, 240), -1)
            cv2.circle(south, (int(s*0.78), int(s*0.45)), int(s*0.04), (40, 120, 240), -1)
            cv2.putText(south, "TEMPLE ENTRANCE [SOUTH]", (int(s*0.25), int(s*0.95)), cv2.FONT_HERSHEY_DUPLEX, 0.9, (180, 210, 240), 2)
            faces["south"] = south

            # 3. EAST (Stone Colonnade & Statues)
            east = np.zeros((s, s, 3), dtype=np.uint8)
            for y in range(s):
                east[y, :] = (40, 60, 85)
            # Rows of Colonnades
            for p in [0.15, 0.4, 0.65, 0.9]:
                cv2.rectangle(east, (int(s*(p-0.05)), 0), (int(s*(p+0.05)), s), (55, 80, 110), -1)
            # Decorative frieze
            cv2.line(east, (0, int(s*0.25)), (s, int(s*0.25)), (80, 110, 150), 6)
            cv2.putText(east, "EAST COLONNADE", (int(s*0.32), int(s*0.95)), cv2.FONT_HERSHEY_DUPLEX, 0.9, (180, 210, 240), 2)
            faces["east"] = east

            # 4. WEST (Ancient Painted Fresco) - with localized simulated blur defect
            west = np.zeros((s, s, 3), dtype=np.uint8)
            for y in range(s):
                west[y, :] = (45, 65, 90)
            # Wall Mural Shapes
            cv2.circle(west, (int(s*0.35), int(s*0.45)), int(s*0.18), (80, 120, 160), -1)
            cv2.circle(west, (int(s*0.65), int(s*0.45)), int(s*0.18), (120, 80, 150), -1)
            cv2.rectangle(west, (int(s*0.2), int(s*0.3)), (int(s*0.8), int(s*0.7)), (100, 140, 180), 4)
            # Introduce blur on the left quadrant of the Fresco (defect to be detected!)
            blur_roi = west[int(s*0.25):int(s*0.65), int(s*0.15):int(s*0.55)]
            west[int(s*0.25):int(s*0.65), int(s*0.15):int(s*0.55)] = cv2.GaussianBlur(blur_roi, (45, 45), 25.0)
            cv2.putText(west, "HISTORICAL FRESCO [WEST]", (int(s*0.23), int(s*0.95)), cv2.FONT_HERSHEY_DUPLEX, 0.9, (180, 210, 240), 2)
            faces["west"] = west

            # 5. UP (Carved Stone Ceiling & Skylight Dome)
            up = np.zeros((s, s, 3), dtype=np.uint8)
            for y in range(s):
                for x in range(s):
                    dist = np.sqrt((x - s/2)**2 + (y - s/2)**2) / (s * 0.7)
                    up[y, x] = (int(min(220, 50 + 150 * (1.0 - dist))), int(min(220, 70 + 130 * (1.0 - dist))), int(min(240, 90 + 130 * (1.0 - dist))))
            cv2.circle(up, (int(s*0.5), int(s*0.5)), int(s*0.38), (90, 120, 160), 6)
            cv2.circle(up, (int(s*0.5), int(s*0.5)), int(s*0.2), (180, 210, 240), 4)
            cv2.putText(up, "CEILING DOME [UP]", (int(s*0.32), int(s*0.5)), cv2.FONT_HERSHEY_DUPLEX, 0.8, (230, 240, 255), 2)
            faces["up"] = up

            # 6. DOWN (Ancient Flagstone / Cobblestone Floor)
            down = np.zeros((s, s, 3), dtype=np.uint8)
            for y in range(s):
                down[y, :] = (int(30 + 30 * (y/s)), int(45 + 35 * (y/s)), int(60 + 40 * (y/s)))
            # Stone tile grid
            grid_s = s // 8
            for i in range(8):
                cv2.line(down, (0, i * grid_s), (s, i * grid_s), (45, 60, 75), 2)
                cv2.line(down, (i * grid_s, 0), (i * grid_s, s), (45, 60, 75), 2)
            cv2.circle(down, (int(s*0.5), int(s*0.5)), int(s*0.25), (60, 80, 100), 4)
            cv2.putText(down, "SANCTUARY FLOOR [DOWN]", (int(s*0.25), int(s*0.5)), cv2.FONT_HERSHEY_DUPLEX, 0.8, (160, 190, 220), 2)
            faces["down"] = down

        else:
            # Modern Architecture Loft
            # NORTH: Modern Living Room Sofa & Artwork
            north = np.zeros((s, s, 3), dtype=np.uint8)
            north[:] = (235, 235, 238) # Modern warm white wall
            cv2.rectangle(north, (int(s*0.15), int(s*0.55)), (int(s*0.85), int(s*0.85)), (80, 70, 65), -1) # Grey sofa
            cv2.rectangle(north, (int(s*0.3), int(s*0.15)), (int(s*0.7), int(s*0.45)), (50, 120, 200), -1) # Modern Art Canvas
            cv2.putText(north, "LIVING ROOM [NORTH]", (int(s*0.28), int(s*0.95)), cv2.FONT_HERSHEY_DUPLEX, 0.9, (60, 60, 60), 2)
            faces["north"] = north

            # SOUTH: Dining Table & Open Kitchen
            south = np.zeros((s, s, 3), dtype=np.uint8)
            south[:] = (230, 230, 235)
            cv2.rectangle(south, (int(s*0.2), int(s*0.6)), (int(s*0.8), int(s*0.85)), (40, 90, 160), -1) # Wood dining table
            cv2.rectangle(south, (int(s*0.1), int(s*0.2)), (int(s*0.9), int(s*0.45)), (60, 60, 65), -1) # Kitchen cabinets
            cv2.putText(south, "DINING & KITCHEN [SOUTH]", (int(s*0.25), int(s*0.95)), cv2.FONT_HERSHEY_DUPLEX, 0.9, (60, 60, 60), 2)
            faces["south"] = south

            # EAST: Floor-to-ceiling Skyline Glass Window
            east = np.zeros((s, s, 3), dtype=np.uint8)
            # Sky & Cityscape
            for y in range(int(s*0.7)):
                east[y, :] = (int(240 - y*0.1), int(200 - y*0.1), int(140 - y*0.05)) # Sky
            # Buildings
            for bx in [0.1, 0.3, 0.5, 0.75]:
                cv2.rectangle(east, (int(s*bx), int(s*0.3)), (int(s*(bx+0.15)), int(s*0.7)), (120, 110, 110), -1)
            # Window frames
            cv2.rectangle(east, (int(s*0.05), int(s*0.05)), (int(s*0.95), int(s*0.85)), (30, 30, 30), 8)
            cv2.line(east, (int(s*0.5), int(s*0.05)), (int(s*0.5), int(s*0.85)), (30, 30, 30), 6)
            cv2.putText(east, "CITY BALCONY VIEW [EAST]", (int(s*0.24), int(s*0.95)), cv2.FONT_HERSHEY_DUPLEX, 0.9, (50, 50, 50), 2)
            faces["east"] = east

            # WEST: Bookshelf & Fireplace (with slight blur on bookcase)
            west = np.zeros((s, s, 3), dtype=np.uint8)
            west[:] = (230, 230, 232)
            # Bookshelf
            for i in range(4):
                cv2.rectangle(west, (int(s*0.15), int(s*(0.15 + i*0.12))), (int(s*0.45), int(s*(0.24 + i*0.12))), (130, 90, 60), -1)
            # Fireplace
            cv2.rectangle(west, (int(s*0.55), int(s*0.45)), (int(s*0.88), int(s*0.85)), (40, 40, 45), -1)
            cv2.circle(west, (int(s*0.71), int(s*0.65)), int(s*0.09), (30, 120, 250), -1) # Fire glow
            # Defect on bookshelf
            shelf_roi = west[int(s*0.15):int(s*0.6), int(s*0.12):int(s*0.48)]
            west[int(s*0.15):int(s*0.6), int(s*0.12):int(s*0.48)] = cv2.GaussianBlur(shelf_roi, (35, 35), 20.0)
            cv2.putText(west, "LIBRARY FIREPLACE [WEST]", (int(s*0.22), int(s*0.95)), cv2.FONT_HERSHEY_DUPLEX, 0.9, (60, 60, 60), 2)
            faces["west"] = west

            # UP: Minimalist Recessed Ceiling
            up = np.zeros((s, s, 3), dtype=np.uint8)
            up[:] = (245, 245, 248)
            # Recessed lights
            for lx in [0.25, 0.75]:
                for ly in [0.25, 0.75]:
                    cv2.circle(up, (int(s*lx), int(s*ly)), int(s*0.06), (200, 240, 255), -1)
                    cv2.circle(up, (int(s*lx), int(s*ly)), int(s*0.07), (180, 180, 180), 2)
            cv2.putText(up, "CEILING LIGHTING [UP]", (int(s*0.28), int(s*0.5)), cv2.FONT_HERSHEY_DUPLEX, 0.8, (120, 120, 120), 2)
            faces["up"] = up

            # DOWN: Warm Hardwood Parquet
            down = np.zeros((s, s, 3), dtype=np.uint8)
            for y in range(s):
                down[y, :] = (int(90 + y*0.04), int(130 + y*0.04), int(180 + y*0.03)) # Oak tone
            plank_h = s // 12
            for i in range(12):
                cv2.line(down, (0, i * plank_h), (s, i * plank_h), (70, 100, 140), 2)
            cv2.putText(down, "HARDWOOD FLOOR [DOWN]", (int(s*0.26), int(s*0.5)), cv2.FONT_HERSHEY_DUPLEX, 0.8, (220, 235, 250), 2)
            faces["down"] = down

        return faces
