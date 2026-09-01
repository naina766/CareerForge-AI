from fastapi import APIRouter, HTTPException, status
from ...schemas.resume import ResumeParseRequest, ResumeParseResponse
from ...services.resume_parser import ResumeParserService

router = APIRouter(prefix="/resume", tags=["Resume Intelligence"])

@router.post("/parse", response_model=ResumeParseResponse)
async def parse_resume(request: ResumeParseRequest):
    """
    Parses resume text or PDF base64 into structured resume entities (personal, skills, experience, education).
    """
    try:
        result = await ResumeParserService.parse_resume(
            raw_text=request.raw_text,
            pdf_base64=request.pdf_base64,
            parser_version=request.parser_version,
        )
        return result
    except ValueError as ve:
        err_msg = str(ve)
        if "TEXT_EXTRACTION_INSUFFICIENT" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=err_msg
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=err_msg
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume parsing failure: {str(e)}"
        )
