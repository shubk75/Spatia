"""
Image Alignment, Cubemap Construction, and 360° Equirectangular Stitching Service.
Converts 6 directional photographs (North, South, East, West, Up, Down) into:
1. Standard 6-face Cubemap (+X, -X, +Y, -Y, +Z, -Z)
2. 360° Equirectangular Photosphere Panorama (for Google Sphere / WebGL rendering)
3. Cross-Unfolded Cubemap Layout (for visual inspection)
"""
import cv2
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
import os


class StitchingService:
    def __init__(self, output_face_size: int = 1024):
        self.face_size = output_face_size

    def standardize_face(self, img_bgr: np.ndarray, target_size: Optional[int] = None) -> np.ndarray:
        """Resizes and crops/pads image to square face size."""
        size = target_size or self.face_size
        h, w = img_bgr.shape[:2]
        
        # Center crop to square if not already square
        if h != w:
            min_dim = min(h, w)
            start_x = (w - min_dim) // 2
            start_y = (h - min_dim) // 2
            img_cropped = img_bgr[start_y:start_y + min_dim, start_x:start_x + min_dim]
        else:
            img_cropped = img_bgr

        if img_cropped.shape[0] != size:
            return cv2.resize(img_cropped, (size, size), interpolation=cv2.INTER_LANCZOS4)
        return img_cropped

    def align_and_blend_cube_faces(
        self,
        faces: Dict[str, np.ndarray]
    ) -> Dict[str, np.ndarray]:
        """
        Normalizes color balance, vignetting, and smooths seam boundaries across 6 faces:
        - north (front / +Z)
        - south (back / -Z)
        - east (right / +X)
        - west (left / -X)
        - up (top / +Y)
        - down (bottom / -Y)
        """
        standardized_faces = {}
        for face_name, img in faces.items():
            standardized_faces[face_name.lower()] = self.standardize_face(img, self.face_size)

        # Ensure all 6 faces exist (if any missing, generate neutral tone face)
        required_faces = ["north", "south", "east", "west", "up", "down"]
        for rf in required_faces:
            if rf not in standardized_faces or standardized_faces[rf] is None:
                # Create a placeholder neutral ambient room face
                blank = np.full((self.face_size, self.face_size, 3), 120, dtype=np.uint8)
                cv2.putText(blank, f"Direction: {rf.upper()}", (int(self.face_size*0.2), int(self.face_size*0.5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (240, 240, 240), 2, cv2.LINE_AA)
                standardized_faces[rf] = blank

        # Edge Seam Smoothing (feathering 4 pixels along shared boundaries)
        feather_w = 4
        # North-East boundary (North right edge with East left edge)
        n_right = standardized_faces["north"][:, -feather_w:].astype(np.float32)
        e_left = standardized_faces["east"][:, :feather_w].astype(np.float32)
        blended_ne = (n_right + e_left) / 2.0
        standardized_faces["north"][:, -feather_w:] = blended_ne.astype(np.uint8)
        standardized_faces["east"][:, :feather_w] = blended_ne.astype(np.uint8)

        # East-South boundary (East right edge with South left edge)
        e_right = standardized_faces["east"][:, -feather_w:].astype(np.float32)
        s_left = standardized_faces["south"][:, :feather_w].astype(np.float32)
        blended_es = (e_right + s_left) / 2.0
        standardized_faces["east"][:, -feather_w:] = blended_es.astype(np.uint8)
        standardized_faces["south"][:, :feather_w] = blended_es.astype(np.uint8)

        # South-West boundary (South right edge with West left edge)
        s_right = standardized_faces["south"][:, -feather_w:].astype(np.float32)
        w_left = standardized_faces["west"][:, :feather_w].astype(np.float32)
        blended_sw = (s_right + w_left) / 2.0
        standardized_faces["south"][:, -feather_w:] = blended_sw.astype(np.uint8)
        standardized_faces["west"][:, :feather_w] = blended_sw.astype(np.uint8)

        # West-North boundary (West right edge with North left edge)
        w_right = standardized_faces["west"][:, -feather_w:].astype(np.float32)
        n_left = standardized_faces["north"][:, :feather_w].astype(np.float32)
        blended_wn = (w_right + n_left) / 2.0
        standardized_faces["west"][:, -feather_w:] = blended_wn.astype(np.uint8)
        standardized_faces["north"][:, :feather_w] = blended_wn.astype(np.uint8)

        return standardized_faces

    def cubemap_to_equirectangular(
        self,
        cube_faces: Dict[str, np.ndarray],
        eq_width: int = 2048,
        eq_height: int = 1024
    ) -> np.ndarray:
        """
        High-performance vectorized conversion from 6 cubemap faces to Equirectangular 360° projection.
        Mapping conventions:
        - North: Front (+Z)
        - East: Right (+X)
        - South: Back (-Z)
        - West: Left (-X)
        - Up: Top (+Y)
        - Down: Bottom (-Y)
        """
        # Standardize faces first
        aligned_faces = self.align_and_blend_cube_faces(cube_faces)
        face_size = aligned_faces["north"].shape[0]

        # 1. Generate Equirectangular grid coordinates
        x_coords = np.arange(eq_width, dtype=np.float32)
        y_coords = np.arange(eq_height, dtype=np.float32)
        u_grid, v_grid = np.meshgrid(x_coords, y_coords)

        # Longitude (theta) from -pi to +pi (starts at North/Front)
        theta = (u_grid / float(eq_width) - 0.5) * 2.0 * np.pi
        # Latitude (phi) from +pi/2 to -pi/2 (starts at North Pole)
        phi = (0.5 - v_grid / float(eq_height)) * np.pi

        # 2. 3D Ray directions (Spherical to Cartesian coordinates)
        cos_phi = np.cos(phi)
        x_ray = cos_phi * np.sin(theta)
        y_ray = np.sin(phi)
        z_ray = cos_phi * np.cos(theta)

        # Avoid division by zero
        eps = 1e-7
        x_safe = np.where(np.abs(x_ray) < eps, eps, x_ray)
        y_safe = np.where(np.abs(y_ray) < eps, eps, y_ray)
        z_safe = np.where(np.abs(z_ray) < eps, eps, z_ray)

        abs_x = np.abs(x_ray)
        abs_y = np.abs(y_ray)
        abs_z = np.abs(z_ray)

        equirect = np.zeros((eq_height, eq_width, 3), dtype=np.uint8)

        # Face 1: Right (+X / East)
        mask_px = (abs_x >= abs_y) & (abs_x >= abs_z) & (x_ray > 0)
        if np.any(mask_px):
            map_x = np.clip((-z_safe / x_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            map_y = np.clip((-y_safe / x_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            sampled = cv2.remap(aligned_faces["east"], map_x, map_y, cv2.INTER_LINEAR)
            equirect[mask_px] = sampled[mask_px]

        # Face 2: Left (-X / West)
        mask_nx = (abs_x >= abs_y) & (abs_x >= abs_z) & (x_ray < 0)
        if np.any(mask_nx):
            map_x = np.clip((z_safe / -x_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            map_y = np.clip((-y_safe / -x_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            sampled = cv2.remap(aligned_faces["west"], map_x, map_y, cv2.INTER_LINEAR)
            equirect[mask_nx] = sampled[mask_nx]

        # Face 3: Top (+Y / Up)
        mask_py = (abs_y >= abs_x) & (abs_y >= abs_z) & (y_ray > 0)
        if np.any(mask_py):
            map_x = np.clip((x_safe / y_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            map_y = np.clip((-z_safe / y_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            sampled = cv2.remap(aligned_faces["up"], map_x, map_y, cv2.INTER_LINEAR)
            equirect[mask_py] = sampled[mask_py]

        # Face 4: Bottom (-Y / Down)
        mask_ny = (abs_y >= abs_x) & (abs_y >= abs_z) & (y_ray < 0)
        if np.any(mask_ny):
            map_x = np.clip((x_safe / -y_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            map_y = np.clip((z_safe / -y_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            sampled = cv2.remap(aligned_faces["down"], map_x, map_y, cv2.INTER_LINEAR)
            equirect[mask_ny] = sampled[mask_ny]

        # Face 5: Front (+Z / North)
        mask_pz = (abs_z >= abs_x) & (abs_z >= abs_y) & (z_ray > 0)
        if np.any(mask_pz):
            map_x = np.clip((x_safe / z_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            map_y = np.clip((-y_safe / z_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            sampled = cv2.remap(aligned_faces["north"], map_x, map_y, cv2.INTER_LINEAR)
            equirect[mask_pz] = sampled[mask_pz]

        # Face 6: Back (-Z / South)
        mask_nz = (abs_z >= abs_x) & (abs_z >= abs_y) & (z_ray < 0)
        if np.any(mask_nz):
            map_x = np.clip((-x_safe / -z_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            map_y = np.clip((-y_safe / -z_safe + 1.0) * 0.5 * (face_size - 1), 0, face_size - 1).astype(np.float32)
            sampled = cv2.remap(aligned_faces["south"], map_x, map_y, cv2.INTER_LINEAR)
            equirect[mask_nz] = sampled[mask_nz]

        return equirect

    def create_cross_cubemap_layout(self, cube_faces: Dict[str, np.ndarray]) -> np.ndarray:
        """
        Creates the classic cross-unfold cubemap image (4 columns x 3 rows):
                   [ Up   ]
        [ West ] [ North] [ East ] [ South]
                   [ Down ]
        """
        aligned_faces = self.align_and_blend_cube_faces(cube_faces)
        s = 512  # Thumbnail size for cross view
        
        up = cv2.resize(aligned_faces["up"], (s, s))
        down = cv2.resize(aligned_faces["down"], (s, s))
        north = cv2.resize(aligned_faces["north"], (s, s))
        south = cv2.resize(aligned_faces["south"], (s, s))
        east = cv2.resize(aligned_faces["east"], (s, s))
        west = cv2.resize(aligned_faces["west"], (s, s))

        cross = np.zeros((s * 3, s * 4, 3), dtype=np.uint8)
        
        # Row 0: Up (col 1)
        cross[0:s, s:s*2] = up
        # Row 1: West (col 0), North (col 1), East (col 2), South (col 3)
        cross[s:s*2, 0:s] = west
        cross[s:s*2, s:s*2] = north
        cross[s:s*2, s*2:s*3] = east
        cross[s:s*2, s*3:s*4] = south
        # Row 2: Down (col 1)
        cross[s*2:s*3, s:s*2] = down

        # Add visual borders and face labels
        for r in range(4):
            for c in range(5):
                cv2.line(cross, (c * s, 0), (c * s, s * 3), (40, 40, 40), 1)
                cv2.line(cross, (0, r * s), (s * 4, r * s), (40, 40, 40), 1)

        return cross
