import hashlib
from typing import List, Dict, Any
from ..schemas.vector import ChunkInput

class ResumeChunker:
    """
    Splits structured resume data into semantic section-aware chunks.
    Does not use arbitrary character splits, preserving context of experiences, skills, and education.
    """
    @classmethod
    def chunk_structured_resume(cls, resume_id: str, structured_data: Dict[str, Any]) -> List[ChunkInput]:
        chunks: List[ChunkInput] = []
        chunk_idx = 0

        # 1. Professional Summary Chunk
        summary = structured_data.get("summary")
        if summary and isinstance(summary, str) and summary.strip():
            content = f"PROFESSIONAL SUMMARY:\n{summary.strip()}"
            content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
            chunks.append(
                ChunkInput(
                    id=f"{resume_id}-chunk-{chunk_idx}",
                    resume_id=resume_id,
                    content=content,
                    section="summary",
                    chunk_index=chunk_idx,
                    content_hash=content_hash,
                )
            )
            chunk_idx += 1

        # 2. Technical Skills Chunk
        skills = structured_data.get("skills", [])
        if skills and isinstance(skills, list):
            skills_str = ", ".join([str(s) for s in skills if s])
            if skills_str:
                content = f"TECHNICAL SKILLS:\n{skills_str}"
                content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                chunks.append(
                    ChunkInput(
                        id=f"{resume_id}-chunk-{chunk_idx}",
                        resume_id=resume_id,
                        content=content,
                        section="skills",
                        chunk_index=chunk_idx,
                        content_hash=content_hash,
                    )
                )
                chunk_idx += 1

        # 3. Work Experience Chunks (one chunk per experience entry)
        experiences = structured_data.get("experience", [])
        if experiences and isinstance(experiences, list):
            for exp in experiences:
                if not isinstance(exp, dict):
                    continue
                title = exp.get("title", "Software Engineer")
                company = exp.get("company", "Company")
                start_date = exp.get("start_date") or exp.get("startDate") or ""
                end_date = exp.get("end_date") or exp.get("endDate") or ""
                desc = exp.get("description", "")
                techs = exp.get("technologies", [])
                tech_str = f" Technologies used: {', '.join(techs)}." if techs else ""

                content = f"WORK EXPERIENCE:\nRole: {title} at {company} ({start_date} - {end_date})\nDescription: {desc}{tech_str}".strip()
                content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                chunks.append(
                    ChunkInput(
                        id=f"{resume_id}-chunk-{chunk_idx}",
                        resume_id=resume_id,
                        content=content,
                        section="experience",
                        chunk_index=chunk_idx,
                        content_hash=content_hash,
                    )
                )
                chunk_idx += 1

        # 4. Education Chunks
        educations = structured_data.get("education", [])
        if educations and isinstance(educations, list):
            for edu in educations:
                if not isinstance(edu, dict):
                    continue
                institution = edu.get("institution", "University")
                degree = edu.get("degree", "Degree")
                field = edu.get("field_of_study") or edu.get("fieldOfStudy") or ""
                start_date = edu.get("start_date") or edu.get("startDate") or ""
                end_date = edu.get("end_date") or edu.get("endDate") or ""

                content = f"EDUCATION:\n{degree} in {field} from {institution} ({start_date} - {end_date})".strip()
                content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                chunks.append(
                    ChunkInput(
                        id=f"{resume_id}-chunk-{chunk_idx}",
                        resume_id=resume_id,
                        content=content,
                        section="education",
                        chunk_index=chunk_idx,
                        content_hash=content_hash,
                    )
                )
                chunk_idx += 1

        # 5. Technical Projects Chunks
        projects = structured_data.get("projects", [])
        if projects and isinstance(projects, list):
            for proj in projects:
                if not isinstance(proj, dict):
                    continue
                name = proj.get("name", "Project")
                desc = proj.get("description", "")
                techs = proj.get("technologies", [])
                tech_str = f" Built with: {', '.join(techs)}." if techs else ""

                content = f"PROJECT:\n{name}: {desc}{tech_str}".strip()
                content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                chunks.append(
                    ChunkInput(
                        id=f"{resume_id}-chunk-{chunk_idx}",
                        resume_id=resume_id,
                        content=content,
                        section="projects",
                        chunk_index=chunk_idx,
                        content_hash=content_hash,
                    )
                )
                chunk_idx += 1

        return chunks
