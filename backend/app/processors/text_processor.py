"""
Text document processor.
Extracts text content from plain text files.
"""
from typing import Optional
from .base import BaseProcessor


class TextProcessor(BaseProcessor):
    """Processor for plain text documents"""
    
    def extract_text(self, file_content: bytes, filename: str) -> Optional[str]:
        """
        Extract text from plain text file.
        
        Args:
            file_content: Text file content as bytes
            filename: Original filename
            
        Returns:
            Extracted text content, or None if extraction fails
        """
        try:
            # Try different encodings
            encodings = ['utf-8', 'utf-16', 'latin-1', 'cp1252']
            
            for encoding in encodings:
                try:
                    text = file_content.decode(encoding)
                    return self.clean_text(text)
                except UnicodeDecodeError:
                    continue
            
            # If all encodings fail, use utf-8 with error handling
            text = file_content.decode('utf-8', errors='ignore')
            return self.clean_text(text)
        
        except Exception as e:
            print(f"Error processing text file {filename}: {e}")
            return None
