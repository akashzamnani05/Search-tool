"""
Image processor using OCR (pytesseract + Pillow).
Extracts text from image files (.jpg, .jpeg, .png, .gif, .bmp, .tiff, .webp).
"""
import io
from typing import Optional, Tuple, List, Dict
from PIL import Image
import pytesseract
from .base import BaseProcessor


class ImageProcessor(BaseProcessor):
    """Processor for image files using OCR"""

    def extract_text(self, file_content: bytes, filename: str) -> Optional[str]:
        text, _ = self.extract_text_with_pages(file_content, filename)
        return text

    def extract_text_with_pages(self, file_content: bytes, filename: str) -> Tuple[Optional[str], List[Dict]]:
        """
        Extract text from an image using OCR.

        Args:
            file_content: Image file content as bytes
            filename: Original filename

        Returns:
            Tuple of (extracted_text, page_info)
            page_info is always a single entry since images are one page.
        """
        try:
            image = Image.open(io.BytesIO(file_content))

            # Tesseract works best on RGB or grayscale images
            if image.mode not in ('RGB', 'L'):
                image = image.convert('RGB')

            raw_text = pytesseract.image_to_string(image)
            cleaned = self.clean_text(raw_text)

            if not cleaned:
                print(f"  No text found via OCR in image: {filename}")
                return None, []

            return cleaned, [{"page": 1, "text": cleaned}]

        except Exception as e:
            print(f"  Error processing image {filename}: {e}")
            return None, []
