import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Clock, RotateCw, XCircle } from "lucide-react";
import { useState } from "react";
import { useApp, useSelectedWorkflow } from "@/context/AppContext";
import { GlassPanel, StatusDot } from "@/components/ui/glass";
import { formatLatency, timeAgo, truncateTask } from "@/lib/format";
import type { TraceStep } from "@/types/api";

function StepIcon({ step }: { step: TraceStep }) {
  if (step.is_retry) return <RotateCw className="w-3.5 h-3.5 text-amber-400/70" />;
  if (step.success) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/70" />;
  return <XCircle className="w-3.5 h-3.5 text-red-400/70" />;
}

function StepDetail({ step }: { step: TraceStep }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <GlassPanel className={`!p-0 overflow-hidden ${!step.success ? "!border-red-400/20 hover:!border-red-400/30" : ""}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-white/55 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-white/55 shrink-0" />}
        <StepIcon step={step} />
        <span className="text-xs font-mono text-white/70 font-medium">{step.tool}</span>
        <span className="text-[10px] font-mono text-white/45 ml-auto flex items-center gap-3">
          {step.is_retry && (
            <span className="text-amber-400/60 text-[9px] uppercase tracking-wider bg-amber-400/[0.08] border border-amber-400/[0.12] px-1.5 py-0.5 rounded">
              retry
            </span>
          )}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatLatency(step.latency_ms)}</span>
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3 mx-1">
          {step.args && Object.keys(step.args).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1.5 font-medium">Arguments</p>
              <pre className="text-[11px] text-white/70 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 overflow-x-auto max-h-32 font-mono">
                {JSON.stringify(step.args, null, 2)}
              </pre>
            </div>
          )}
          {step.output !== null && step.output !== undefined && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/55 mb-1.5 font-medium">Output</p>
              <pre className="text-[11px] text-white/70 bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 overflow-x-auto max-h-40 font-mono">
                {typeof step.output === "string" ? step.output : JSON.stringify(step.output, null, 2)}
              </pre>
            </div>
          )}
          {step.error && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-red-300/50 mb-1.5 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3 h-3" /> Error
              </p>
              <pre className="text-[11px] text-red-300/70 bg-red-500/[0.06] border border-red-400/[0.1] rounded-lg p-3 overflow-x-auto max-h-32 font-mono">
                {step.error}
              </pre>
            </div>
          )}
          <div className="flex gap-4 text-[10px] text-white/45 font-mono pt-1">
            <span>Step #{step.step}</span>
            {step.timestamp && <span>{new Date(step.timestamp).toLocaleTimeString()}</span>}
          </div>
        </div>
      )}
    </GlassPanel>
  );
}

export function TracesTab() {
  const { traces, workflows, setSelectedWorkflowId, selectedWorkflowId } = useApp();
  const selected = useSelectedWorkflow();

  const allTraces = traces.length > 0 ? [...traces].reverse() : [];
  const workflowsWithTraces = workflows.filter((w) => w.trace && w.trace.length > 0);

  const combinedSessions = [
    ...allTraces.map((t) => ({ id: t.id, task: t.task, steps: t.steps, time: t.completed_at ?? t.started_at, outcome: t.outcome, source: "trace" as const })),
    ...workflowsWithTraces
      .filter((w) => !allTraces.some((t) => t.id === w.id))
      .map((w) => ({ id: w.id, task: w.task, steps: w.trace!, time: w.completed_at ?? w.started_at ?? "", outcome: w.task_completed_successfully ? "success" : "failure", source: "workflow" as const })),
  ].sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));

  const activeId = selectedWorkflowId ?? combinedSessions[0]?.id;
  const activeSession = combinedSessions.find((s) => s.id === activeId) ?? combinedSessions[0];
  const steps: TraceStep[] = activeSession?.steps ?? selected?.trace ?? [];

  const totalLatency = steps.reduce((sum, s) => sum + (s.latency_ms || 0), 0);
  const failures = steps.filter((s) => !s.success).length;
  const retries = steps.filter((s) => s.is_retry).length;

  return (
    <>
      <div className="mb-8 md:mb-10">
        <p className="text-white/55 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">Observability</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Trace Timeline
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">
        {/* Session list sidebar */}
        <GlassPanel className="max-h-[72vh] overflow-y-auto">
          <h2 className="text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-3">Sessions</h2>
          {combinedSessions.length === 0 ? (
            <p className="text-xs text-white/70 text-center py-6">No traces yet. Run a test to see traces.</p>
          ) : (
            <div className="space-y-1.5">
              {combinedSessions.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedWorkflowId(t.id)}
                  className={`w-full flex flex-col py-2.5 px-3 rounded-lg border transition-all text-left ${
                    t.id === activeId
                      ? "border-white/[0.14] bg-white/[0.08]"
                      : "border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.08]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StatusDot status={t.outcome === "success" ? "pass" : t.outcome === "failure" ? "fail" : "partial"} />
                    <span className="text-[12px] text-white/60 truncate">{truncateTask(t.task, 28)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-white/45 pl-4">
                    <span>{t.steps.length} steps</span>
                    <span>{t.time ? timeAgo(t.time) : "—"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* Step details */}
        <div className="space-y-3">
          {activeSession && (
            <GlassPanel>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white/80">{truncateTask(activeSession.task, 55)}</h2>
                <div className="flex items-center gap-3 text-[11px] font-mono text-white/55">
                  <span className="bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded">{steps.length} steps</span>
                  {failures > 0 && <span className="bg-red-500/[0.08] border border-red-400/[0.12] px-2 py-0.5 rounded text-red-300/60">{failures} failed</span>}
                  {retries > 0 && <span className="bg-amber-500/[0.08] border border-amber-400/[0.12] px-2 py-0.5 rounded text-amber-300/60">{retries} retries</span>}
                  <span className="text-white/45">{formatLatency(totalLatency)}</span>
                </div>
              </div>
            </GlassPanel>
          )}

          {steps.length === 0 ? (
            <GlassPanel>
              <p className="text-xs text-white/70 py-6 text-center">Select a trace to view step details</p>
            </GlassPanel>
          ) : (
            <div className="space-y-2">
              {steps.map((s) => (
                <StepDetail key={`${s.step}-${s.tool}`} step={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
