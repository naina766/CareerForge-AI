from pydantic import BaseModel, Field
from typing import Optional

class HealthResponseData(BaseModel):
    status: str = Field(default="ok", example="ok")
    service: str = Field(default="ai-service", example="ai-service")
    version: str = Field(default="1.0.0", example="1.0.0")
    environment: str = Field(default="development", example="development")
    provider: str = Field(default="mock", example="mock")

class HealthMeta(BaseModel):
    correlationId: Optional[str] = None
    requestId: Optional[str] = None
    timestamp: str

class HealthResponse(BaseModel):
    success: bool = True
    data: HealthResponseData
    meta: HealthMeta
