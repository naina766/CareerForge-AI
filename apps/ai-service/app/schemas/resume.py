from typing import List, Optional
from pydantic import BaseModel, Field

class PersonalInformation(BaseModel):
    full_name: Optional[str] = Field(default=None, description="Candidate full name")
    email: Optional[str] = Field(default=None, description="Contact email address")
    phone: Optional[str] = Field(default=None, description="Contact phone number")
    location: Optional[str] = Field(default=None, description="Current city, state, or country")
    linkedin: Optional[str] = Field(default=None, description="LinkedIn profile URL")
    github: Optional[str] = Field(default=None, description="GitHub profile URL")
    portfolio: Optional[str] = Field(default=None, description="Portfolio or personal website URL")

class ExperienceItem(BaseModel):
    company: str = Field(description="Company or organization name")
    title: str = Field(description="Job title or role")
    location: Optional[str] = Field(default=None, description="Job location")
    start_date: Optional[str] = Field(default=None, description="Start date (e.g. '2023-01' or '2023')")
    end_date: Optional[str] = Field(default=None, description="End date (e.g. '2024-05' or 'Present')")
    is_current: bool = Field(default=False, description="Whether this is the current job")
    description: Optional[str] = Field(default=None, description="Bullet points or summary of responsibilities")
    technologies: List[str] = Field(default_factory=list, description="Technologies explicitly mentioned for this role")

class EducationItem(BaseModel):
    institution: str = Field(description="University, college, or school name")
    degree: str = Field(description="Degree or credential (e.g. B.Tech, B.S., Master)")
    field_of_study: Optional[str] = Field(default=None, description="Major, department, or field of study")
    start_date: Optional[str] = Field(default=None, description="Start date")
    end_date: Optional[str] = Field(default=None, description="Graduation or end date")
    grade: Optional[str] = Field(default=None, description="GPA, grade, or percentage if stated")

class ProjectItem(BaseModel):
    name: str = Field(description="Project name or title")
    description: Optional[str] = Field(default=None, description="Project overview and impact")
    technologies: List[str] = Field(default_factory=list, description="Technologies used in project")
    url: Optional[str] = Field(default=None, description="Repository or live URL")

class CertificationItem(BaseModel):
    name: str = Field(description="Certification or license title")
    issuer: Optional[str] = Field(default=None, description="Issuing organization")
    issue_date: Optional[str] = Field(default=None, description="Date issued")

class LanguageItem(BaseModel):
    name: str = Field(description="Language name")
    proficiency: Optional[str] = Field(default=None, description="Proficiency level (e.g. Native, Fluent, Professional)")

class ResumeExtraction(BaseModel):
    personal: PersonalInformation = Field(default_factory=PersonalInformation)
    summary: Optional[str] = Field(default=None, description="Professional summary or bio")
    skills: List[str] = Field(default_factory=list, description="Explicit technical skills extracted from resume")
    experience: List[ExperienceItem] = Field(default_factory=list, description="Chronological work experiences")
    education: List[EducationItem] = Field(default_factory=list, description="Educational background")
    projects: List[ProjectItem] = Field(default_factory=list, description="Technical projects")
    certifications: List[CertificationItem] = Field(default_factory=list, description="Certifications and licenses")
    languages: List[LanguageItem] = Field(default_factory=list, description="Spoken/written languages")

class ResumeParseRequest(BaseModel):
    raw_text: Optional[str] = Field(default=None, description="Extracted resume text")
    pdf_base64: Optional[str] = Field(default=None, description="Base64 encoded PDF binary data")
    parser_version: str = Field(default="1.0.0", description="Parser engine version")

class ResumeParseResponse(BaseModel):
    success: bool = True
    raw_text: str
    structured_data: ResumeExtraction
    parser_version: str = "1.0.0"
    sections_detected: List[str] = Field(default_factory=list)
