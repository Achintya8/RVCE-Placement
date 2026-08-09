import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Sparkles,
  Search,
  BrainCircuit,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Building2,
  Award,
} from 'lucide-react';
import {
  batchMatchCandidatesWithJD,
  type CandidateRankItem,
  type SkillMatch,
  type MissingSkillGap,
} from '@/api/rag';
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

interface CompanyPreset {
  id: number;
  name: string;
  description?: string | null;
}

interface BatchCandidateRankerModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies?: CompanyPreset[];
  initialCompanyId?: number | null;
  initialJd?: string;
}

export const BatchCandidateRankerModal: React.FC<BatchCandidateRankerModalProps> = ({
  isOpen,
  onClose,
  companies = [],
  initialCompanyId,
  initialJd = '',
}) => {
  const [jobDescription, setJobDescription] = useState(initialJd);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    initialCompanyId ? String(initialCompanyId) : ''
  );
  const [topN, setTopN] = useState<number>(15);

  const [isRanking, setIsRanking] = useState(false);
  const [candidates, setCandidates] = useState<CandidateRankItem[]>([]);
  const [totalEvaluated, setTotalEvaluated] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedCandidateDetail, setSelectedCandidateDetail] = useState<CandidateRankItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialJd) {
      setJobDescription(initialJd);
    }
    if (initialCompanyId) {
      setSelectedCompanyId(String(initialCompanyId));
    }
  }, [initialJd, initialCompanyId]);

  const handleCompanySelect = (companyIdStr: string) => {
    setSelectedCompanyId(companyIdStr);
    const comp = companies.find((c) => String(c.id) === companyIdStr);
    if (comp && comp.description) {
      setJobDescription(comp.description);
    }
  };

  const handleRunBatchRanking = async () => {
    if (!jobDescription.trim()) {
      setErrorMessage('Please enter or select a Job Description (JD) to evaluate candidate skills.');
      return;
    }

    setErrorMessage(null);
    setIsRanking(true);
    setCandidates([]);

    try {
      const res = await batchMatchCandidatesWithJD(jobDescription, topN);
      setCandidates(res.candidates);
      setTotalEvaluated(res.totalEvaluated);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Batch RAG evaluation failed.');
    } finally {
      setIsRanking(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.usn.toLowerCase().includes(q) ||
      c.matching_skills.some((s) => s.skill.toLowerCase().includes(q))
    );
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-amber-500 text-slate-950 font-black shadow-amber-500/30';
    if (rank === 2) return 'bg-slate-300 text-slate-900 font-bold shadow-slate-400/30';
    if (rank === 3) return 'bg-amber-700 text-white font-bold shadow-amber-900/30';
    return 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold';
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
      <DialogContent className="glass-panel text-slate-900 dark:text-white w-[92vw] sm:w-full max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                SPC RAG Candidate Leaderboard
                <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
                  Groq LLM & pgvector
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Rank candidates against Job Description skills & confidence scores
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start space-x-3">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* JD Input & Controls */}
          <div className="bg-slate-100/50 dark:bg-white/5 p-5 rounded-xl border border-slate-200 dark:border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Target Job Description (JD) & Skills Criteria
              </Label>

              <div className="flex items-center gap-3">
                {companies.length > 0 && (
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => handleCompanySelect(e.target.value)}
                    className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">-- Load Drive JD Preset --</option>
                    {companies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>Top:</span>
                  <select
                    value={topN}
                    onChange={(e) => setTopN(Number(e.target.value))}
                    className="text-xs py-1 px-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>
            </div>

            <textarea
              rows={4}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste Job Description (e.g. Seeking React, Node.js, Python, PostgreSQL developer with knowledge of Docker and Microservices)..."
              className="w-full p-3.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            />

            <Button
              onClick={handleRunBatchRanking}
              disabled={isRanking || !jobDescription.trim()}
              className="w-full gap-2 shadow-lg shadow-primary/20"
            >
              {isRanking ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Executing Vector Search in pgvector & Ranking with Groq API...</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="w-5 h-5" />
                  <span>Rank Candidates for JD Skills with RAG</span>
                </>
              )}
            </Button>
          </div>

          {/* Results Leaderboard Table */}
          {candidates.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Ranked Candidates ({candidates.length} of {totalEvaluated} evaluated)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Sorted by RAG Confidence Score & Semantic Skill Alignment
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Filter by candidate or skill..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredCandidates.map((cand) => (
                  <div
                    key={cand.student_id}
                    onClick={() => setSelectedCandidateDetail(cand)}
                    className="p-4 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Left: Rank & Candidate Info */}
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs shadow-sm shrink-0 ${getRankBadge(
                          cand.rank
                        )}`}
                      >
                        #{cand.rank}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                            {cand.name}
                          </h4>
                          {cand.placed && (
                            <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-500 border-green-500/20">
                              Placed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          USN: {cand.usn} {cand.cgpa ? `• CGPA: ${cand.cgpa}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Middle: Matched Skills Chips */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-1.5">
                        {cand.matching_skills.slice(0, 4).map((s, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="text-[11px] font-medium bg-primary/10 text-primary border-primary/20"
                          >
                            ✓ {s.skill}
                          </Badge>
                        ))}
                        {cand.matching_skills.length > 4 && (
                          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                            +{cand.matching_skills.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right: Confidence Score Ring & Arrow */}
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className={`px-3.5 py-1.5 rounded-xl border text-center font-bold text-xs ${getScoreBadgeClass(cand.confidence_score)}`}>
                        {cand.confidence_score}% Match
                        <span className="block text-[10px] font-semibold opacity-80">
                          {cand.verdict}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Detailed Candidate Breakdown Dialog */}
      {selectedCandidateDetail && (
        <Dialog open={true} onOpenChange={() => setSelectedCandidateDetail(null)}>
          <DialogContent className="glass-panel text-slate-900 dark:text-white w-[92vw] sm:w-full max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <DialogHeader className="pb-4 border-b border-slate-200 dark:border-white/10">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Candidate RAG Evidence: {selectedCandidateDetail.name}
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  Rank #{selectedCandidateDetail.rank}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                USN: {selectedCandidateDetail.usn} • Confidence Score: <strong>{selectedCandidateDetail.confidence_score}%</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-primary" />
                  Executive Summary
                </h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedCandidateDetail.executive_summary}
                </p>
              </div>

              {/* Matched Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Matched Skills & Direct Resume Evidence ({selectedCandidateDetail.matching_skills.length})
                </h4>
                <div className="space-y-2">
                  {selectedCandidateDetail.matching_skills.map((item: SkillMatch, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <span className="font-bold text-xs text-green-600 dark:text-green-400">
                        {item.skill}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-300 italic bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-lg border border-green-500/20">
                        "{item.resume_evidence}"
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Skills & Gaps */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Missing Skills & Actionable Recommendations
                </h4>
                <div className="space-y-2">
                  {selectedCandidateDetail.missing_skills_and_gaps.map((gap: MissingSkillGap, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-100/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {gap.skill_or_requirement}
                        </span>
                        <Badge variant="outline" className={`text-[10px] uppercase font-extrabold ${getImpactBadge(gap.impact)}`}>
                          Impact: {gap.impact}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        <strong className="text-amber-600 dark:text-amber-400">Action: </strong>
                        {gap.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
