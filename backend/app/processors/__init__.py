"""
Processor factory module.
Routes documents to appropriate processor based on file type.
"""
from typing import Optional, Tuple, List, Dict
from .base import BaseProcessor
from .pdf_processor import PDFProcessor
from .docx_processor import DOCXProcessor
from .text_processor import TextProcessor
from .excel_processor import ExcelProcessor
from .ppt_processor import PowerPointProcessor
from .image_processor import ImageProcessor


class ProcessorFactory:
    """Factory class for creating appropriate document processors"""

    def __init__(self):
        _image = ImageProcessor()
        self.processors = {
            'pdf': PDFProcessor(),
            'doc': DOCXProcessor(),  # Note: .doc files may need special handling
            'docx': DOCXProcessor(),
            'txt': TextProcessor(),
            'xlsx': ExcelProcessor(),
            'xls': ExcelProcessor(),
            'pptx': PowerPointProcessor(),
            'ppt': PowerPointProcessor(),
            # Image formats — OCR via pytesseract
            'jpg': _image,
            'jpeg': _image,
            'png': _image,
            'gif': _image,
            'bmp': _image,
            'tiff': _image,
            'tif': _image,
            'webp': _image,
        }
    
    def get_processor(self, filename: str) -> Optional[BaseProcessor]:
        """
        Get appropriate processor for a file based on its extension.
        
        Args:
            filename: Name of the file
            
        Returns:
            Processor instance, or None if file type not supported
        """
        if not filename:
            return None
        
        extension = filename.lower().split('.')[-1]
        return self.processors.get(extension)
    
    def process_document(self, file_content: bytes, filename: str) -> Tuple[Optional[str], List[Dict]]:
        """
        Process a document and extract its text content with page information.
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            
        Returns:
            Tuple of (extracted_text, page_info)
            - extracted_text: Text content or None if processing fails
            - page_info: List of dicts with page numbers and text (PDFs only)
                        Format: [{"page": 1, "text": "..."}, ...]
        """
        processor = self.get_processor(filename)
        
        if processor is None:
            print(f"No processor found for file: {filename}")
            return None, []
        
        try:
            # Check if processor supports page extraction (PDF)
            if hasattr(processor, 'extract_text_with_pages'):
                text, page_info = processor.extract_text_with_pages(file_content, filename)
            else:
                # For non-PDF files, just extract text
                text = processor.extract_text(file_content, filename)
                page_info = []
            
            if text:
                # Truncate if necessary
                text = processor.truncate_text(text)
                return text, page_info
            
            return None, []
        
        except Exception as e:
            print(f"Error processing document {filename}: {e}")
            return None, []
    
    def process_document_text_only(self, file_content: bytes, filename: str) -> Optional[str]:
        """
        Process a document and extract only text (backward compatibility).
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            
        Returns:
            Extracted text content, or None if processing fails
        """
        text, _ = self.process_document(file_content, filename)
        return text


# Singleton instance
_processor_factory = None


def get_processor_factory() -> ProcessorFactory:
    """Get or create ProcessorFactory singleton instance"""
    global _processor_factory
    if _processor_factory is None:
        _processor_factory = ProcessorFactory()
    return _processor_factory