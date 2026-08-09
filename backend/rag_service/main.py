import os
from typing import Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from rag_engine import init_pgvector_db, split_resume_text, store_resume_chunks, evaluate_resume_vs_jd

app = FastAPI(
    title="RAG Resume vs. Job Description Matcher API",
    description="Python RAG Service powered by Groq API, pgvector, and LangChain text splitters.",
    version="1.0.0"
)

@app.on_event("startup")
def on_startup():
    init_pgvector_db()

class EmbedResumePayload(BaseModel):
    studentId: int
    resumeText: str
    metadata: Optional[Dict[str, Any]] = None

class MatchJDPayload(BaseModel):
    studentId: int
    jobDescription: str
    topK: Optional[int] = 5

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "python-rag-service"}

@app.post("/api/rag/embed-resume")
def embed_resume(payload: EmbedResumePayload):
    if not payload.resumeText or not payload.resumeText.strip():
        raise HTTPException(status_code=400, detail="resumeText cannot be empty")
    
    chunks = split_resume_text(payload.resumeText, chunk_size=800, chunk_overlap=150)
    if not chunks:
        raise HTTPException(status_code=400, detail="No text chunks extracted from resume")
    
    count = store_resume_chunks(payload.studentId, chunks, payload.metadata or {})
    return {
        "success": True,
        "studentId": payload.studentId,
        "chunksStored": count,
        "message": f"Successfully stored {count} vector chunks for student {payload.studentId}"
    }

@app.post("/api/rag/match-jd")
def match_jd(payload: MatchJDPayload):
    if not payload.jobDescription or not payload.jobDescription.strip():
        raise HTTPException(status_code=400, detail="jobDescription cannot be empty")
    
    try:
        res = evaluate_resume_vs_jd(payload.studentId, payload.jobDescription, top_k=payload.topK or 5)
        return {
            "success": True,
            "studentId": payload.studentId,
            "retrievedChunksCount": res["retrieved_chunks_count"],
            "analysis": res["analysis"]
        }
    except ValueError as err:
        raise HTTPException(status_code=404, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
