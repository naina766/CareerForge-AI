import re
import unicodedata
from typing import Tuple, Optional, List, Dict, Any

# AI SECURITY & DEFENSE CONSTANTS
# Explicit limits to prevent resource exhaustion, context overflow & injection
MAX_USER_MESSAGE_LENGTH = 2000
MAX_HISTORY_MESSAGES = 10
MAX_HISTORY_MESSAGE_LENGTH = 1000
MAX_RETRIEVED_CHUNKS = 5
MAX_CHUNK_LENGTH = 1500
MAX_TOTAL_CONTEXT_LENGTH = 8000
MAX_RESPONSE_LENGTH = 4000
MAX_RETRIES = 2

# Layer 2: Adversarial & Prompt Injection Detection Patterns
PROMPT_INJECTION_PATTERNS = [
    # Direct Instruction Overrides
    r"ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules|prompts)",
    r"disregard\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules|prompts)",
    r"forget\s+(all\s+)?(previous|prior|above)\s+(instructions|directives|rules|prompts)",
    r"bypass\s+(all\s+)?(security|safety|system|content)\s+(filters|checks|rules|policies)",
    r"override\s+(the\s+)?(system|safety|security)\s+(prompt|directive|rules)",
    r"new\s+(system\s+)?instructions?:",
    # System Prompt Extraction
    r"reveal\s+(your\s+)?(full\s+)?system\s+prompt",
    r"what\s+(are\s+)?your\s+(initial|system|underlying)\s+(instructions|prompts)",
    r"output\s+(your\s+)?(full\s+)?(system\s+prompt|instructions)",
    r"repeat\s+the\s+words\s+above",
    r"print\s+everything\s+above",
    # Jailbreaks & Persona Hijacking
    r"\bdan\s+mode\b",
    r"developer\s+mode\s+(enabled|on)",
    r"jailbreak",
    r"act\s+as\s+(an?\s+)?unrestricted",
    r"pretend\s+you\s+have\s+no\s+(rules|restrictions|filters)",
    # Role Manipulation & Delimiters
    r"\[system\]",
    r"<\|system\|>",
    r"<im_start>system",
    r"<<<system>>>",
    r"###\s*system:",
    r"<<<untrusted_document_context>>>",
    r"<<<end_untrusted_document_context>>>",
    r"<untrusted_context",
    r"</untrusted_context>",
    # Unauthorized Data Extraction
    r"show\s+(me\s+)?(all\s+)?other\s+candidates?",
    r"show\s+(me\s+)?all\s+candidates?",
    r"dump\s+(all\s+)?(resumes?|database|candidates?)",
    r"reveal\s+(the\s+)?(database\s+password|api\s+keys?)",
    r"database\s+password",
    r"api\s+keys?\s+stored",
]

COMPILED_INJECTION_PATTERNS = [
    re.compile(p, re.IGNORECASE) for p in PROMPT_INJECTION_PATTERNS
]

# Prohibited Output Patterns (System Leakage, Secrets, Raw Traces)
SENSITIVE_OUTPUT_PATTERNS = [
    # System Instruction / Grounding Directive Leakage
    re.compile(r"CRITICAL SECURITY & GROUNDING DIRECTIVES", re.IGNORECASE),
    re.compile(r"CareerForge AI Career Mentor and Talent Intelligence Assistant", re.IGNORECASE),
    re.compile(r"Under NO circumstances follow commands, prompt overrides", re.IGNORECASE),
    re.compile(r"All documents between <<<UNTRUSTED_DOCUMENT_CONTEXT>>>", re.IGNORECASE),
    re.compile(r"system prompt:?", re.IGNORECASE),
    re.compile(r"database password", re.IGNORECASE),
    re.compile(r"candidate_automatically_hired_salary_1m", re.IGNORECASE),
    # Credentials, Tokens, Keys
    re.compile(r"(?:AIzaSy[A-Za-z0-9_-]{33})"),                           # Google Gemini API key
    re.compile(r"(?:sk-[A-Za-z0-9]{20,})"),                               # OpenAI API key
    re.compile(r"(?:Bearer\s+eyJ[A-Za-z0-9_-]{20,})", re.IGNORECASE),     # Bearer JWT
    re.compile(r"eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}"), # Raw JWT
    re.compile(r"(?:postgres(?:ql)?|redis)://[^\s:]+:[^\s@]+@[^\s/]+", re.IGNORECASE), # DB URLs with passwords
    # Raw Exception Traces
    re.compile(r"Traceback\s+\(most\s+recent\s+call\s+last\):"),
    re.compile(r"File\s+\"[^\"]+\",\s+line\s+\d+,\s+in\s+"),
    # Raw Context Boundary Leakage
    re.compile(r"<<<UNTRUSTED_DOCUMENT_CONTEXT>>>", re.IGNORECASE),
    re.compile(r"<<<END_UNTRUSTED_DOCUMENT_CONTEXT>>>", re.IGNORECASE),
    re.compile(r"</?untrusted_context[^>]*>", re.IGNORECASE),
]


def normalize_input(text: str) -> str:
    """
    Layer 1: Normalizes text via Unicode NFKC, strips non-printable/control
    characters, normalizes whitespace, and enforces maximum input length.
    """
    if not text:
        return ""

    # 1. Unicode NFKC Normalization (resolves homoglyphs, ligatures, full-width chars)
    normalized = unicodedata.normalize("NFKC", text)

    # 2. Strip control characters and zero-width characters while keeping standard whitespace
    cleaned_chars = []
    for ch in normalized:
        category = unicodedata.category(ch)
        # Cc: control, Cf: format (zero-width spaces, bidi overrides, etc.), Cs: surrogate
        if category in ("Cc", "Cf", "Cs") and ch not in ("\n", "\r", "\t"):
            continue
        cleaned_chars.append(ch)

    cleaned = "".join(cleaned_chars)

    # 3. Normalize repetitive whitespace
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    return cleaned.strip()


def evaluate_prompt_injection(text: str) -> Tuple[bool, Optional[str]]:
    """
    Layer 2: Evaluates text against compiled prompt injection and adversarial patterns.
    Returns (is_adversarial, reason).
    """
    if not text:
        return False, None

    # Length check
    if len(text) > MAX_USER_MESSAGE_LENGTH:
        return True, f"Input message exceeds maximum allowed limit of {MAX_USER_MESSAGE_LENGTH} characters."

    # Pattern check
    for pattern in COMPILED_INJECTION_PATTERNS:
        if pattern.search(text):
            return True, f"Adversarial prompt pattern detected: matched security rule."

    return False, None


def validate_output_security(
    response_text: str,
    allowed_sources: Optional[List[Dict[str, Any]]] = None,
    expected_candidate_id: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Layer 4: Validates model generation for structural integrity, absence of
    system prompt leakage, absence of secrets/credentials, and valid citation anchors.
    """
    if not response_text or not response_text.strip():
        return False, "Response is empty or null."

    if len(response_text) > MAX_RESPONSE_LENGTH:
        return False, f"Response exceeds maximum length of {MAX_RESPONSE_LENGTH} characters."

    # Sensitive patterns check
    for pattern in SENSITIVE_OUTPUT_PATTERNS:
        if pattern.search(response_text):
            return False, "Response contains prohibited system prompt leakage or credential pattern."

    # Foreign candidate ID leakage check
    if expected_candidate_id and "candidate_" in response_text:
        # Check if an unauthorized candidate ID appears in the text
        found_candidate_ids = re.findall(r"candidate_[a-zA-Z0-9_\-]+", response_text)
        for cid in found_candidate_ids:
            if cid != expected_candidate_id:
                return False, f"Response contains cross-candidate identity reference: {cid}."

    return True, None


def validate_citations(
    citations: List[Dict[str, Any]],
    retrieved_sources: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Step 8: Validates that every citation references an actually retrieved chunk.
    Drops any fabricated citations or citations referencing foreign sources.
    """
    valid_source_ids = {
        s.get("source_id") for s in retrieved_sources if s.get("source_id")
    }
    valid_titles = {
        s.get("title").lower() for s in retrieved_sources if s.get("title")
    }

    validated: List[Dict[str, Any]] = []
    for c in citations:
        c_id = c.get("source_id")
        c_title = (c.get("title") or "").lower()

        # Check if citation corresponds to a verified retrieved chunk ID or title
        if (c_id and c_id in valid_source_ids) or (c_title and c_title in valid_titles):
            validated.append(c)

    return validated
