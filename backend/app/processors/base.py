"""
Base processor class for document text extraction.
All specific processors inherit from this class.
"""
from abc import ABC, abstractmethod
from typing import Optional


class BaseProcessor(ABC):
    """Abstract base class for document processors"""
    
    @abstractmethod
    def extract_text(self, file_content: bytes, filename: str) -> Optional[str]:
        """
        Extract text content from file bytes.
        
        Args:
            file_content: File content as bytes
            filename: Original filename
            
        Returns:
            Extracted text content, or None if extraction fails
        """
        pass
    
    def clean_text(self, text: str) -> str:
        """
        Clean extracted text by removing extra whitespace and special characters.
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Remove null bytes and other problematic characters
        text = text.replace('\x00', '')
        
        # Normalize whitespace
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(line for line in lines if line)
        
        return text
    
    def truncate_text(self, text: str, max_length: int = 50000) -> str:
        """
        Truncate text to maximum length.
        
        Args:
            text: Text to truncate
            max_length: Maximum character length
            
        Returns:
            Truncated text
        """
        if len(text) <= max_length:
            return text
        
        return text[:max_length] + "... [truncated]"