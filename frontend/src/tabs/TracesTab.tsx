import { ArrowUpRight } from "lucide-react";
import { useApp, useSelectedWorkflow } from "@/context/AppContext";
import { GlassPanel, StatusDot, TraceConnector, TraceStep } from "@/components/ui/glass";
import { formatLatency, stepToStatus, timeAgo, truncateTask } from "@/lib/format";

export function TracesTab() {
  const { traces, setSelectedWorkflowId, selectedWorkflowId } = useApp();
  const selected = useSelectedWorkflow();
  const displayTraces = traces.length > 0 ? [...traces].reverse() : [];
  const activeId = selectedWorkflowId ?? selected?.id;
  const activeTrace = displayTraces.find((t) => t.id === activeId) ?? displayTraces[0];
  const steps = activeTrace?.steps ?? selected?.trace ?? [];

  return (
    <>
      <div className="mb-8 md:mb-10">
        <p className="text-white/30 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">Observability</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Trace Timeline
        </h1>
      </div>

      <GlassPanel>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 md:mb-6 gap-1">
          <h2 className="text-sm font-semibold text-white/80">
            {activeTrace ? truncateTask(activeTrace.task, 50) : "No trace selected"}
          </h2>
          <span className="text-[11px] text-white/20 font-mono">{steps.length} steps</span>
        </div>
        {steps.length === 0 ? (
          <p className="text-xs text-white/25 py-8 text-center">Run a test to see traces</p>
        ) : (
          <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 -mx-2 px-2">
            {steps.map((s, i) => (
              <span key={s.step} className="flex items-center gap-2 md:gap-3">
                {i > 0 && <TraceConnector />}
                <TraceStep step={s.step} tool={s.tool} status={stepToStatus(s)} latency={formatLatency(s.latency_ms)} />
              </span>
            ))}
          </div>
        )}
      </GlassPanel>

      <div className="mt-3 md:mt-4 space-y-2">
        {displayTraces.length === 0 ? (
          <p className="text-xs text-white/25 text-center py-6">No traces in backend yet</p>
        ) : (
          displayTraces.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedWorkflowId(t.id)}
              className={`w-full flex flex-col sm:flex-row sm:items-center justify-between py-3 px-4 rounded-xl border transition-colors gap-2 text-left ${
                t.id === activeId ? "border-white/[0.12] bg-white/[0.05]" : "border-white/[0.04] hover:bg-white/[0.03]"
              }`}
              style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.35)" }}
            >
              <div className="flex items-center gap-3">
                <StatusDot status={t.outcome === "success" ? "pass" : t.outcome === "failure" ? "fail" : "partial"} />
                <span className="font-mono text-xs text-white/30">{t.id.slice(0, 8)}</span>
                <span className="text-sm text-white/60">{truncateTask(t.task, 40)}</span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-white/20 pl-5 sm:pl-0">
                <span>{t.steps.length} steps</span>
                <span>{timeAgo(t.completed_at ?? t.started_at)}</span>
                <ArrowUpRight className="w-3 h-3 text-white/15" />
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}
