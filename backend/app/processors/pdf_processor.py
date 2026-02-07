"""
PDF document processor.
Extracts text content from PDF files using PyPDF2.
"""
import io
from typing import Optional, Tuple, List, Dict
from PyPDF2 import PdfReader
from .base import BaseProcessor


class PDFProcessor(BaseProcessor):
    """Processor for PDF documents"""
    
    def extract_text(self, file_content: bytes, filename: str) -> Optional[str]:
        """
        Extract text from PDF file.
        
        Args:
            file_content: PDF file content as bytes
            filename: Original filename
            
        Returns:
            Extracted text content, or None if extraction fails
        """
        text, _ = self.extract_text_with_pages(file_content, filename)
        return text
    
    def extract_text_with_pages(self, file_content: bytes, filename: str) -> Tuple[Optional[str], List[Dict]]:
        """
        Extract text from PDF file with page information.
        
        Args:
            file_content: PDF file content as bytes
            filename: Original filename
            
        Returns:
            Tuple of (extracted_text, page_info_list)
            page_info_list contains: [{"page": 1, "text": "..."}, ...]
        """
        try:
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            
            text_parts = []
            page_info = []
            
            # Extract text from each page
            for page_num, page in enumerate(reader.pages, 1):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        # Clean the page text
                        cleaned_page_text = self.clean_text(page_text)
                        
                        # Add to full text with page marker
                        text_parts.append(f"[Page {page_num}]\n{cleaned_page_text}")
                        
                        # Store page info for search
                        page_info.append({
                            "page": page_num,
                            "text": cleaned_page_text
                        })
                except Exception as e:
                    print(f"Error extracting page {page_num} from {filename}: {e}")
                    continue
            
            if not text_parts:
                return None, []
            
            full_text = "\n\n".join(text_parts)
            return full_text, page_info
        
        except Exception as e:
            print(f"Error processing PDF {filename}: {e}")
            return None, []