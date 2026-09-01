import re

class TextCleaner:
    """
    Cleans and normalizes extracted resume text.
    Handles repeated whitespace, broken lines, control characters, and header/footer noise.
    """
    @classmethod
    def clean(cls, text: str) -> str:
        if not text:
            return ""

        # 1. Normalize line breaks and tabs
        text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")

        # 2. Remove non-printable control characters (except newlines and standard punctuation)
        text = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)

        # 3. Replace 3 or more consecutive newlines with two newlines
        text = re.sub(r"\n{3,}", "\n\n", text)

        # 4. Collapse multiple inline spaces
        text = re.sub(r"[^\S\n]+", " ", text)

        # 5. Clean up leading/trailing line whitespace
        lines = [line.strip() for line in text.split("\n")]
        cleaned_text = "\n".join(lines).strip()

        return cleaned_text
