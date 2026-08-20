"""
EXIF metadata extraction and orientation normalization service.
"""
from typing import Dict, Any, Optional
from PIL import Image, ExifTags
import io


class ExifService:
    @staticmethod
    def extract_metadata(image_bytes: bytes) -> Dict[str, Any]:
        """
        Parses EXIF metadata from raw image bytes and returns structured dictionary.
        """
        metadata: Dict[str, Any] = {
            "has_exif": False,
            "camera_make": None,
            "camera_model": None,
            "focal_length_mm": None,
            "focal_length_35mm": None,
            "exposure_time": None,
            "f_number": None,
            "iso": None,
            "orientation": 1,
            "orientation_label": "Normal (0°)",
            "width": None,
            "height": None,
            "date_time": None,
            "lens_model": None,
            "software": None
        }

        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                metadata["width"] = img.width
                metadata["height"] = img.height

                exif_raw = img.getexif()
                if not exif_raw:
                    return metadata

                metadata["has_exif"] = True
                
                # Invert ExifTags mapping for fast lookup
                tag_names = {v: k for k, v in ExifTags.TAGS.items()}
                
                for tag_id, value in exif_raw.items():
                    tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                    
                    if tag_name == "Make":
                        metadata["camera_make"] = str(value).strip()
                    elif tag_name == "Model":
                        metadata["camera_model"] = str(value).strip()
                    elif tag_name == "Orientation":
                        metadata["orientation"] = int(value)
                        orient_map = {
                            1: "Normal (0°)",
                            3: "Rotated 180°",
                            6: "Rotated 90° CW",
                            8: "Rotated 90° CCW"
                        }
                        metadata["orientation_label"] = orient_map.get(int(value), f"Custom ({value})")
                    elif tag_name == "DateTime":
                        metadata["date_time"] = str(value)
                    elif tag_name == "Software":
                        metadata["software"] = str(value).strip()
                    elif tag_name == "FocalLength":
                        try:
                            metadata["focal_length_mm"] = float(value)
                        except (ValueError, TypeError):
                            pass
                    elif tag_name == "FocalLengthIn35mmFilm":
                        try:
                            metadata["focal_length_35mm"] = float(value)
                        except (ValueError, TypeError):
                            pass
                    elif tag_name == "ExposureTime":
                        metadata["exposure_time"] = str(value)
                    elif tag_name == "FNumber":
                        try:
                            metadata["f_number"] = float(value)
                        except (ValueError, TypeError):
                            pass
                    elif tag_name == "ISOSpeedRatings":
                        try:
                            metadata["iso"] = int(value)
                        except (ValueError, TypeError):
                            pass
                    elif tag_name == "LensModel":
                        metadata["lens_model"] = str(value).strip()

        except Exception as e:
            metadata["error"] = str(e)

        return metadata

    @staticmethod
    def auto_rotate_image(img: Image.Image) -> Image.Image:
        """
        Applies EXIF orientation transform to make image upright.
        """
        try:
            exif = img.getexif()
            if not exif:
                return img
            orientation = exif.get(0x0112, 1)
            if orientation == 3:
                return img.rotate(180, expand=True)
            elif orientation == 6:
                return img.rotate(270, expand=True)
            elif orientation == 8:
                return img.rotate(90, expand=True)
        except Exception:
            pass
        return img
