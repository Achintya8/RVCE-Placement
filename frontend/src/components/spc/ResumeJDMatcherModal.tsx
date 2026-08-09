import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  BrainCircuit,
  Loader2,
  Award,
  BookOpen,
  Send,
  Zap,
} from 'lucide-react';
import { embedStudentResume, matchStudentResumeWithJD, type RAGMatchOutput } from '@/api/rag';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

export interface MatchingSkill {
  skill: string;
  resume_evidence: string;
}

export interface MissingSkillGap {
  skill_or_requirement: string;
  impact: string;
  recommendation: string;
}

interface StudentData {
  id: number;
  name: string;
  usn?: string | null;
  collegeEmailId?: string | null;
  resumeUrl?: string | null;
}

interface CompanyPreset {
  id: number;
  name: string;
  description?: string | null;
}

interface ResumeJDMatcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentData | null;
  companies?: CompanyPreset[];
}

export const ResumeJDMatcherModal: React.FC<ResumeJDMatcherModalProps> = ({
  isOpen,
  onClose,
  student,
  companies = [],
}) => {
  const [activeTab, setActiveTab] = useState<'match' | 'embed'>('match');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');

  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [embedMessage, setEmbedMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<RAGMatchOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!student) return null;

  const handleCompanySelect = (companyIdStr: string) => {
    setSelectedCompanyId(companyIdStr);
    const comp = companies.find((c) => String(c.id) === companyIdStr);
    if (comp && comp.description) {
      setJobDescription(comp.description);
    }
  };

  const handleEmbedResume = async () => {
    if (!resumeText.trim()) {
      setErrorMessage('Please paste or enter the raw resume text first.');
      return;
    }
    setErrorMessage(null);
    setEmbedMessage(null);
    setIsEmbedding(true);

    try {
      const res = await embedStudentResume(student.id, resumeText, {
        usn: student.usn || '',
        studentName: student.name,
      });
      setEmbedMessage(res.message);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to embed resume.');
    } finally {
      setIsEmbedding(false);
    }
  };

  const handleRunMatching = async () => {
    if (!jobDescription.trim()) {
      setErrorMessage('Please enter a Job Description to evaluate candidate match.');
      return;
    }

    setErrorMessage(null);
    setIsMatching(true);

    try {
      if (resumeText.trim() && !embedMessage) {
        await embedStudentResume(student.id, resumeText, { usn: student.usn || '' });
      }

      const res = await matchStudentResumeWithJD(student.id, jobDescription, 5);
      setAnalysisResult(res.analysis);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Matching evaluation failed.');
    } finally {
      setIsMatching(false);
    }
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (score >= 60) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-red-500/10 text-red-500 border-red-500/20';
  };

  const getImpactBadge = (impact: string) => {
    const imp = impact.toLowerCase();
    if (imp.includes('high')) return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (imp.includes('med')) return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glass-panel text-slate-900 dark:text-white w-[92vw] sm:w-full max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                RAG Candidate Matcher
                <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                  Groq LLM & pgvector
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Candidate: <strong className="text-slate-900 dark:text-white">{student.name}</strong> ({student.usn || 'N/A'})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-white/5 px-6 pt-2">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex items-center space-x-2 px-4 py-2.5 font-medium text-xs border-b-2 transition-all ${
              activeTab === 'match'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Job Match Analysis</span>
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`flex items-center space-x-2 px-4 py-2.5 font-medium text-xs border-b-2 transition-all ${
              activeTab === 'embed'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-muted-foreground hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Resume Ingestion & Embeddings</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {activeTab === 'embed' ? (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-600 dark:text-amber-400">
                <strong>Resume Ingestion:</strong> Paste candidate resume text below. Text is chunked using <code>RecursiveCharacterTextSplitter</code> (chunkSize: 800, overlap: 150) and stored with vector embeddings in PostgreSQL <code>pgvector</code>.
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Resume Content (Raw Text)
                </Label>
                <textarea
                  rows={10}
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste candidate resume text here (Skills, Experience, Projects, Education)..."
                  className="w-full p-3.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                />
              </div>

              {embedMessage && (
                <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{embedMessage}</span>
                </div>
              )}

              <Button
                onClick={handleEmbedResume}
                disabled={isEmbedding || !resumeText.trim()}
                className="w-full gap-2 shadow-lg shadow-primary/20"
              >
                {isEmbedding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Vector Embeddings...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Embed & Store Resume Vector Chunks</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Job Description Input Section */}
              <div className="space-y-3 bg-slate-100/50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Target Job Description (JD)
                  </Label>
                  {companies.length > 0 && (
                    <select
                      value={selectedCompanyId}
                      onChange={(e) => handleCompanySelect(e.target.value)}
                      className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                    >
                      <option value="">-- Load Preset Company JD --</option>
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <textarea
                  rows={5}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Enter or paste the job description criteria, required technical skills, qualifications, and role responsibilities..."
                  className="w-full p-3.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />

                {!resumeText && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>
                      If student resume is not yet embedded, switch to the <strong>Resume Ingestion</strong> tab first.
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleRunMatching}
                  disabled={isMatching || !jobDescription.trim()}
                  className="w-full gap-2 shadow-lg shadow-primary/20"
                >
                  {isMatching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Querying pgvector & Evaluating with Groq LLM...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Run Semantic RAG Match Evaluation</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Analysis Results Display */}
              {analysisResult && (
                <div className="space-y-6 pt-2 border-t border-slate-200 dark:border-white/10 animate-fadeIn">
                  {/* Score & Verdict Banner */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-5 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreBadgeClass(analysisResult.match_score)}`}>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        Semantic Match Score
                      </span>
                      <span className="text-4xl font-extrabold my-1">{analysisResult.match_score}%</span>
                      <Badge variant="outline" className="text-xs font-bold border-current">
                        {analysisResult.verdict}
                      </Badge>
                    </div>

                    <div className="md:col-span-2 p-5 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex flex-col justify-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-primary" />
                        Executive Summary
                      </h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {analysisResult.executive_summary}
                      </p>
                    </div>
                  </div>

                  {/* Matching Skills */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Matching Skills & Resume Evidence ({analysisResult.matching_skills.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-2.5">
                      {analysisResult.matching_skills.length > 0 ? (
                        analysisResult.matching_skills.map((item: MatchingSkill, idx: number) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-green-500/5 border border-green-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <span className="font-bold text-xs text-green-600 dark:text-green-400 min-w-[140px]">
                              {item.skill}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-300 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-green-500/20 italic flex-1">
                              "{item.resume_evidence}"
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No direct matching skills identified.</p>
                      )}
                    </div>
                  </div>

                  {/* Missing Gaps & Recommendations */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Missing Skills & Critical Gaps ({analysisResult.missing_skills_and_gaps.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      {analysisResult.missing_skills_and_gaps.length > 0 ? (
                        analysisResult.missing_skills_and_gaps.map((gap: MissingSkillGap, idx: number) => (
                          <div
                            key={idx}
                            className="p-4 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {gap.skill_or_requirement}
                              </span>
                              <Badge variant="outline" className={`text-[10px] uppercase font-extrabold ${getImpactBadge(gap.impact)}`}>
                                Impact: {gap.impact}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                              <strong className="text-amber-600 dark:text-amber-400">Action: </strong>
                              {gap.recommendation}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No major skill gaps detected for this JD.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
