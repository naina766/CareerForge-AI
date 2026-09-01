import base64
from typing import Tuple, List
from ..schemas.resume import (
    ResumeExtraction,
    ResumeParseResponse,
)
from .pdf_extractor import PDFTextExtractor
from .text_cleaner import TextCleaner
from .section_detector import SectionDetector
from .deterministic_parser import DeterministicParser
from ..core.config import settings

class ResumeParserService:
    @classmethod
    async def parse_resume(
        cls,
        raw_text: str = None,
        pdf_base64: str = None,
        parser_version: str = "1.0.0",
    ) -> ResumeParseResponse:
        # 1. Text extraction
        extracted_text = ""
        if pdf_base64:
            try:
                pdf_bytes = base64.b64decode(pdf_base64)
                extracted_text = PDFTextExtractor.extract_text(pdf_bytes)
            except Exception as e:
                raise ValueError(f"Failed to decode or parse PDF binary: {str(e)}")
        elif raw_text:
            extracted_text = raw_text
        else:
            raise ValueError("Either raw_text or pdf_base64 must be provided")

        # 2. Text normalization & cleaning
        cleaned_text = TextCleaner.clean(extracted_text)

        if len(cleaned_text.strip()) < 20:
            raise ValueError("TEXT_EXTRACTION_INSUFFICIENT: Extracted text is too short or empty (scanned image or empty PDF)")

        # 3. Section detection
        detected_sections = SectionDetector.list_detected_sections(cleaned_text)

        # 4. Structured extraction
        # Use deterministic parser (which handles mock mode & offline environments)
        structured_data = DeterministicParser.parse(cleaned_text)

        return ResumeParseResponse(
            success=True,
            raw_text=cleaned_text,
            structured_data=structured_data,
            parser_version=parser_version,
            sections_detected=detected_sections,
        )
