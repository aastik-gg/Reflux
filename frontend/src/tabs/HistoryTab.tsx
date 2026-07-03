import { ChevronDown, ChevronUp, GitCompare, Loader2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { GlassPanel, SecondaryButton, StatusDot } from "@/components/ui/glass";
import { CompareModal } from "@/components/CompareModal";
import { formatLatency, issueTypeLabel, scoreToStatus, timeAgo, truncateTask } from "@/lib/format";
import type { CompareResult, WorkflowRecord } from "@/types/api";

export function HistoryTab() {
  const { workflows, setSelectedWorkflowId, runAction, actionLoading } = useApp();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);

  const runs = [...workflows].reverse();

  const handleCompare = async () => {
    const r = await runAction("Comparing…", () =>
      api.compareWorkflow({ task: "Assign user_id 123 to the support queue", mode: "simulated" })
    );
    setCompareResult(r);
  };

  return (
    <>
      <div className="mb-6 md:mb-8">
        <p className="text-white/70 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">Test History</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Past Runs
        </h1>
        <p className="text-white/60 text-xs md:text-sm mt-2">
          {runs.length === 0 ? "No test runs yet. Run a test from the Overview tab." : `${runs.length} test runs recorded.`}
        </p>
      </div>

      {runs.length > 0 && (
        <div className="flex gap-2 mb-6">
          <SecondaryButton onClick={handleCompare} disabled={!!actionLoading}>
            {actionLoading === "Comparing…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCompare className="w-3 h-3" />}
            Compare Before / After
          </SecondaryButton>
        </div>
      )}

      <div className="space-y-3">
        {runs.map((w) => (
          <RunCard
            key={w.id}
            run={w}
            isExpanded={expanded === w.id}
            onToggle={() => setExpanded(expanded === w.id ? null : w.id)}
            onViewResults={() => {
              setSelectedWorkflowId(w.id);
              document.dispatchEvent(new CustomEvent("view-workflow"));
            }}
          />
        ))}
      </div>

      {compareResult && <CompareModal result={compareResult} onClose={() => setCompareResult(null)} />}
    </>
  );
}

function RunCard({ run, isExpanded, onToggle, onViewResults }: {
  run: WorkflowRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onViewResults: () => void;
}) {
  const score = run.agent_readiness_score;
  const status = scoreToStatus(score);

  return (
    <GlassPanel>
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <StatusDot status={status} />
            <div className="min-w-0">
              <p className="text-sm text-white/85 font-medium truncate">{truncateTask(run.task, 60)}</p>
              <p className="text-[11px] text-white/55 font-mono">
                {run.trace?.length ?? 0} steps · {run.mode ?? "simulated"} · {timeAgo(run.started_at ?? run.completed_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-3">
            <span className="text-lg font-bold font-mono text-white/80">{score ?? "—"}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          {run.score_breakdown && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { label: "Runtime", score: run.score_breakdown.runtime_success, max: 40 },
                { label: "Params", score: run.score_breakdown.parameter_clarity, max: 30 },
                { label: "Docs", score: run.score_breakdown.documentation, max: 20 },
                { label: "Stability", score: run.score_breakdown.stability, max: 10 },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-[10px] text-white/55 mb-1">{item.label}</p>
                  <p className="text-sm font-bold font-mono text-white/70">
                    {item.score}<span className="text-[10px] text-white/45">/{item.max}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {run.trace && run.trace.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] text-white/55 font-mono mb-2">Trace</p>
              <div className="space-y-1">
                {run.trace.slice(0, 8).map((s) => (
                  <div key={s.step} className="flex items-center gap-2 text-[11px]">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.success ? "bg-emerald-400/70" : "bg-red-400/70"}`} />
                    <span className="text-white/70 font-mono">{s.tool}</span>
                    <span className="text-white/45">{formatLatency(s.latency_ms)}</span>
                    {s.error && <span className="text-red-400/60 truncate">{s.error}</span>}
                  </div>
                ))}
                {run.trace.length > 8 && <p className="text-[10px] text-white/40">+{run.trace.length - 8} more steps</p>}
              </div>
            </div>
          )}

          {run.issues_detected && run.issues_detected.length > 0 && (
            <div className="mb-4">
              <p className="text-[11px] text-white/55 font-mono mb-2">{run.issues_detected.length} issues</p>
              <div className="flex flex-wrap gap-1">
                {[...new Set(run.issues_detected.map((i) => i.type))].slice(0, 6).map((type) => (
                  <span key={type} className="text-[10px] font-mono text-white/50 bg-white/[0.04] px-2 py-0.5 rounded">
                    {issueTypeLabel(type)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <SecondaryButton onClick={onViewResults}>
            View Full Results
          </SecondaryButton>
        </div>
      )}
    </GlassPanel>
  );
}
