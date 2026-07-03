import { ArrowRight, TrendingUp, X } from "lucide-react";
import { StatusDot } from "@/components/ui/glass";
import { scoreToStatus, issueTypeLabel } from "@/lib/format";
import type { CompareResult, Issue } from "@/types/api";

function ScoreCircle({ score, label }: { score: number; label: string }) {
  const status = scoreToStatus(score);
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[10px] text-white/55 font-mono uppercase tracking-wider">{label}</p>
      <div className="relative w-24 h-24 flex items-center justify-center rounded-full border-2 border-white/[0.08] bg-white/[0.02]">
        <p className="text-3xl font-bold font-mono text-white/90">{score}</p>
      </div>
      <StatusDot status={status} />
    </div>
  );
}

function IssueList({ issues, label }: { issues: Issue[]; label: string }) {
  if (!issues || issues.length === 0) {
    return (
      <div>
        <p className="text-[10px] text-white/55 font-mono uppercase tracking-wider mb-2">{label}</p>
        <p className="text-[11px] text-white/70">No issues detected</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] text-white/55 font-mono uppercase tracking-wider mb-2">{label} ({issues.length})</p>
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {issues.slice(0, 8).map((issue, i) => {
          const sevColor = issue.severity === "high" ? "text-red-400/70" : issue.severity === "medium" ? "text-amber-400/70" : "text-white/55";
          return (
            <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-md border border-white/[0.04]">
              <span className={`text-[9px] font-mono uppercase ${sevColor} shrink-0 mt-0.5`}>{issue.severity}</span>
              <span className="text-[10px] text-white/60 truncate">{issue.tool ? `${issue.tool}: ` : ""}{issueTypeLabel(issue.type)}</span>
            </div>
          );
        })}
        {issues.length > 8 && <p className="text-[10px] text-white/45 pl-2">+{issues.length - 8} more</p>}
      </div>
    </div>
  );
}

export function CompareModal({ result, onClose }: { result: CompareResult; onClose: () => void }) {
  const improved = result.improvement > 0;
  const changeColor = improved ? "text-emerald-400" : result.improvement < 0 ? "text-red-400" : "text-white/60";
  const changeSign = improved ? "+" : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-white/[0.1] p-6 md:p-8 max-h-[90vh] overflow-y-auto"
        style={{ backdropFilter: "blur(16px) saturate(1.3)", WebkitBackdropFilter: "blur(16px) saturate(1.3)", backgroundColor: "rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white/90" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Before / After Comparison
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/60">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-white/55 font-mono mb-6 border-l-2 border-white/[0.08] pl-3">{result.task}</p>

        {/* Score comparison */}
        <div className="flex items-center justify-center gap-8 md:gap-12 mb-8">
          <ScoreCircle score={result.before.agent_readiness_score} label="Before" />
          <div className="flex flex-col items-center gap-1.5">
            <ArrowRight className="w-6 h-6 text-white/45" />
            <div className={`flex items-center gap-1.5 ${changeColor}`}>
              <TrendingUp className="w-4 h-4" />
              <span className="text-lg font-bold font-mono">{changeSign}{result.improvement}</span>
            </div>
            <span className="text-[11px] text-white/45 font-mono">{changeSign}{result.improvement_percent}%</span>
          </div>
          <ScoreCircle score={result.after.agent_readiness_score} label="After" />
        </div>

        {/* Narrative */}
        {result.narrative && (
          <div className="mb-6 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
            <p className="text-[12px] text-white/70 leading-relaxed">{result.narrative}</p>
          </div>
        )}

        {/* Issues comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <IssueList issues={result.before.issues_detected ?? []} label="Before issues" />
          <IssueList issues={result.after.issues_detected ?? []} label="After issues" />
        </div>

        {/* Registry updated badge */}
        {result.registry_updated && (
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/[0.06]">
            <span className="w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.4)]" />
            <span className="text-[11px] text-emerald-400/70">Tool registry updated with optimized definitions</span>
          </div>
        )}
      </div>
    </div>
  );
}
