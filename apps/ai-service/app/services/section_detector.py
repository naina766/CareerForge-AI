import re
from typing import Dict, List, Tuple

SECTION_PATTERNS = {
    "summary": [
        r"\b(professional\s+summary|summary|profile|about\s+me|career\s+objective|objective)\b"
    ],
    "experience": [
        r"\b(work\s+experience|professional\s+experience|experience|employment\s+history|career\s+history)\b"
    ],
    "education": [
        r"\b(education|academic\s+background|academic\s+credentials|qualifications)\b"
    ],
    "skills": [
        r"\b(technical\s+skills|core\s+competencies|skills\s+&\s+tools|skills|technologies|tech\s+stack)\b"
    ],
    "projects": [
        r"\b(projects|technical\s+projects|personal\s+projects|key\s+projects)\b"
    ],
    "certifications": [
        r"\b(certifications|certificates|licenses|credentials)\b"
    ],
    "languages": [
        r"\b(languages|spoken\s+languages)\b"
    ]
}

class SectionDetector:
    """
    Deterministically detects standard sections in cleaned resume text.
    """
    @classmethod
    def detect_sections(cls, text: str) -> Dict[str, str]:
        lines = text.split("\n")
        detected_sections: Dict[str, List[str]] = {}
        detected_names: List[str] = []

        current_section = "header"
        detected_sections[current_section] = []

        for line in lines:
            trimmed = line.strip()
            if not trimmed:
                continue

            # Check if this line looks like a section header (short line matching known keywords)
            if len(trimmed) < 40:
                matched_section = None
                for section_key, patterns in SECTION_PATTERNS.items():
                    for pattern in patterns:
                        if re.match(f"^{pattern}[:]?$", trimmed, re.IGNORECASE):
                            matched_section = section_key
                            break
                    if matched_section:
                        break

                if matched_section:
                    current_section = matched_section
                    if current_section not in detected_sections:
                        detected_sections[current_section] = []
                    if current_section not in detected_names:
                        detected_names.append(current_section)
                    continue

            detected_sections[current_section].append(trimmed)

        # Merge line arrays into section text blocks
        return {k: "\n".join(v).strip() for k, v in detected_sections.items() if v}

    @classmethod
    def list_detected_sections(cls, text: str) -> List[str]:
        sections = cls.detect_sections(text)
        return [s for s in sections.keys() if s != "header"]
