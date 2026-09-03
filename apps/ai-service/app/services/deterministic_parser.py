import re
from typing import List, Optional
from ..schemas.resume import (
    ResumeExtraction,
    PersonalInformation,
    ExperienceItem,
    EducationItem,
    ProjectItem,
    CertificationItem,
    LanguageItem,
)
from .section_detector import SectionDetector

COMMON_SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js", "Express", "Next.js",
    "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
    "Git", "REST API", "GraphQL", "FastAPI", "Django", "Flask", "Tailwind CSS",
    "HTML5", "CSS3", "Java", "C++", "Go", "Rust", "SQL", "Prisma", "CI/CD", "Kafka"
]

class DeterministicParser:
    """
    Deterministic fallback parser using regex heuristics and section parsing.
    Acts as a fallback when LLM is offline or in mock mode.
    """
    @classmethod
    def parse(cls, text: str) -> ResumeExtraction:
        sections = SectionDetector.detect_sections(text)
        header_text = sections.get("header", "")
        full_text = text

        # 1. Email extraction
        email_match = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", full_text)
        email = email_match.group(0) if email_match else None

        # 2. Phone extraction
        phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", full_text)
        phone = phone_match.group(0) if phone_match else None

        # 3. LinkedIn & GitHub
        linkedin_match = re.search(r"(https?://)?(www\.)?linkedin\.com/in/[\w-]+", full_text, re.IGNORECASE)
        linkedin = linkedin_match.group(0) if linkedin_match else None

        github_match = re.search(r"(https?://)?(www\.)?github\.com/[\w-]+", full_text, re.IGNORECASE)
        github = github_match.group(0) if github_match else None

        # 4. Name extraction (first line in header that is not email/phone)
        full_name = None
        for line in header_text.split("\n"):
            line = line.strip()
            if line and not re.search(r"(@|http|www|\d{5,})", line) and len(line) < 40:
                full_name = line
                break

        # 5. Skills extraction from skills section or full text
        skills_text = sections.get("skills", full_text)
        found_skills = []
        for skill in COMMON_SKILLS:
            # Case-insensitive word boundary match
            if re.search(rf"\b{re.escape(skill)}\b", skills_text, re.IGNORECASE):
                if skill not in found_skills:
                    found_skills.append(skill)

        # 6. Experience extraction
        experience_items: List[ExperienceItem] = []
        exp_text = sections.get("experience", "")
        if exp_text:
            # Split into chunks based on bullet points or double newlines
            exp_blocks = [b.strip() for b in exp_text.split("\n\n") if b.strip()]
            for block in exp_blocks[:5]:
                lines = [l.strip() for l in block.split("\n") if l.strip()]
                if lines:
                    title_line = lines[0]
                    company = title_line.split(" - ")[0] if " - " in title_line else title_line
                    role = title_line.split(" - ")[1] if " - " in title_line else None
                    desc = "\n".join(lines[1:]) if len(lines) > 1 else None

                    experience_items.append(
                        ExperienceItem(
                            company=company[:60],
                            title=role[:60] if role else company[:60],
                            description=desc,
                            technologies=[s for s in found_skills if s.lower() in block.lower()]
                        )
                    )

        # 7. Education extraction
        education_items: List[EducationItem] = []
        edu_text = sections.get("education", "")
        if edu_text:
            edu_lines = [l.strip() for l in edu_text.split("\n") if l.strip()]
            if edu_lines:
                education_items.append(
                    EducationItem(
                        institution=edu_lines[0][:80],
                        degree=edu_lines[1][:80] if len(edu_lines) > 1 else None,
                        field_of_study=None
                    )
                )

        return ResumeExtraction(
            personal=PersonalInformation(
                full_name=full_name,
                email=email,
                phone=phone,
                linkedin=linkedin,
                github=github,
            ),
            summary=sections.get("summary"),
            skills=found_skills,
            experience=experience_items,
            education=education_items,
            projects=[],
            certifications=[],
            languages=[]
        )
