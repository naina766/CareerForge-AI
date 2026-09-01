import io
from typing import Optional
import pypdf

class PDFTextExtractor:
    """
    Extracts raw text content from PDF bytes using pypdf.
    Abstracted to support alternative engines (e.g. pdfplumber or OCR) in future phases.
    """
    @classmethod
    def extract_text(cls, pdf_bytes: bytes) -> str:
        if not pdf_bytes:
            raise ValueError("Empty PDF bytes provided for extraction")

        try:
            reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
            pages_text = []

            for page_idx, page in enumerate(reader.pages):
                page_content = page.extract_text()
                if page_content:
                    pages_text.append(page_content)

            full_text = "\n\n".join(pages_text).strip()
            return full_text
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF document: {str(e)}")
