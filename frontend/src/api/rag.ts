import { API_BASE_URL, AUTH_TOKEN_KEY } from '../config';

export interface SkillMatch {
  skill: string;
  resume_evidence: string;
}

export interface MissingSkillGap {
  skill_or_requirement: string;
  impact: 'High' | 'Medium' | 'Low' | string;
  recommendation: string;
}

export interface RAGMatchOutput {
  match_score: number;
  verdict: 'Strong Match' | 'Moderate Match' | 'Weak Match' | string;
  executive_summary: string;
  matching_skills: SkillMatch[];
  missing_skills_and_gaps: MissingSkillGap[];
}

export interface CandidateRankItem {
  rank: number;
  student_id: number;
  name: string;
  usn: string;
  college_email?: string;
  cgpa?: number;
  placed?: boolean;
  confidence_score: number;
  verdict: string;
  executive_summary: string;
  matching_skills: SkillMatch[];
  missing_skills_and_gaps: MissingSkillGap[];
}

export interface MatchJDResponse {
  success: boolean;
  studentId: number;
  retrievedChunksCount: number;
  analysis: RAGMatchOutput;
  message?: string;
}

export interface BatchMatchResponse {
  success: boolean;
  jobDescription: string;
  totalEvaluated: number;
  candidates: CandidateRankItem[];
  message?: string;
}

export interface EmbedResumeResponse {
  success: boolean;
  studentId: number;
  chunksStored: number;
  message: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function embedStudentResume(
  studentId: number,
  resumeText: string,
  metadata?: Record<string, unknown>
): Promise<EmbedResumeResponse> {
  const response = await fetch(`${API_BASE_URL}/rag/embed-resume`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ studentId, resumeText, metadata }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to embed student resume');
  }

  return data;
}

export async function matchStudentResumeWithJD(
  studentId: number,
  jobDescription: string,
  topK = 5
): Promise<MatchJDResponse> {
  const response = await fetch(`${API_BASE_URL}/rag/match-jd`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ studentId, jobDescription, topK }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to match student resume with Job Description');
  }

  return data;
}

export async function batchMatchCandidatesWithJD(
  jobDescription: string,
  topN = 20
): Promise<BatchMatchResponse> {
  const response = await fetch(`${API_BASE_URL}/rag/batch-match-jd`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ jobDescription, topN }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Failed to rank candidates for the Job Description');
  }

  return data;
}
