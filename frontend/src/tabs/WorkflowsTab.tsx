import { FileCode, GitCompare, Layers, Loader2, Plug, Sparkles, Unplug } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { GlassPanel, SecondaryButton, StatusDot } from "@/components/ui/glass";
import { CompareModal } from "@/components/CompareModal";
import { scoreToStatus, truncateTask } from "@/lib/format";
import type { CompareResult } from "@/types/api";

export function WorkflowsTab() {
  const { tools, mcpConnection, registryNote, workflows, actionLoading, runAction, setSelectedWorkflowId } = useApp();
  const [preset, setPreset] = useState("server-everything");
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);

  const recent = [...workflows].reverse().slice(0, 8);

  return (
    <>
      <div className="mb-8 md:mb-10">
        <p className="text-white/55 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">MCP & Tests</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Workflows
        </h1>
      </div>

      {/* MCP Connection */}
      <GlassPanel className="mb-4">
        <h2 className="text-sm font-semibold text-white/80 mb-3">MCP Connection</h2>
        <p className="text-[11px] text-white/55 mb-4">
          {mcpConnection?.live_connected
            ? `Live: ${mcpConnection.preset || mcpConnection.command} (${mcpConnection.tool_count} tools)`
            : "Not connected — use simulated mode or connect a server below"}
        </p>
        {registryNote && <p className="text-[11px] text-amber-400/70 mb-3">{registryNote}</p>}
        <div className="flex flex-wrap gap-2 mb-3">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="rounded-lg border border-white/[0.08] bg-black/40 text-sm text-white/70 px-3 py-1.5"
          >
            <option value="server-everything">server-everything</option>
            <option value="ticket-demo">ticket-demo</option>
          </select>
          <SecondaryButton
            onClick={() => runAction("Connecting…", () => api.connectMcp({ preset, import_tools: true }))}
            disabled={!!actionLoading}
          >
            {actionLoading === "Connecting…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plug className="w-3 h-3" />}
            Connect
          </SecondaryButton>
          <SecondaryButton onClick={() => runAction("Disconnecting…", () => api.disconnectMcp())} disabled={!!actionLoading}>
            {actionLoading === "Disconnecting…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unplug className="w-3 h-3" />}
            Disconnect
          </SecondaryButton>
          <SecondaryButton onClick={() => runAction("Syncing…", () => api.syncMcp())} disabled={!!actionLoading || !mcpConnection?.live_connected}>
            {actionLoading === "Syncing…" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Sync tools
          </SecondaryButton>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton
            onClick={async () => {
              const r = await runAction("Compare…", () =>
                api.compareWorkflow({ task: "Assign user_id 123 to the support queue", mode: "simulated" })
              );
              setCompareResult(r);
            }}
            disabled={!!actionLoading}
          >
            {actionLoading === "Compare…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitCompare className="w-3 h-3" />}
            Compare before/after
          </SecondaryButton>
          <SecondaryButton
            onClick={() => runAction("Applying fixes…", () => api.applyOptimized({ use_last_workflow: true }))}
            disabled={!!actionLoading}
          >
            {actionLoading === "Applying fixes…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            Apply optimized
          </SecondaryButton>
        </div>
        <p className="text-[10px] text-white/45 font-mono mt-3">{tools.length} tools in registry</p>
      </GlassPanel>

      {/* Workflow cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {recent.length === 0 ? (
          <GlassPanel>
            <p className="text-sm text-white/55">No test runs yet. Use <span className="text-white/70">New Test</span> in the top bar to run an agent workflow.</p>
          </GlassPanel>
        ) : (
          recent.map((w) => (
            <GlassPanel key={w.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Layers className="w-4 h-4 text-white/55" />
                </div>
                <StatusDot status={scoreToStatus(w.agent_readiness_score)} />
              </div>
              <h3 className="text-sm font-semibold text-white/80 mb-1">{truncateTask(w.task, 48)}</h3>
              <p className="text-[11px] text-white/70 font-mono mb-3">
                {w.trace?.length ?? 0} steps · score {w.agent_readiness_score ?? "—"} · {w.mode ?? "sim"}
              </p>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-white/[0.06] text-[11px] text-white/60 hover:bg-white/[0.04] hover:text-white/60 transition-colors"
                onClick={() => {
                  setSelectedWorkflowId(w.id);
                  document.dispatchEvent(new CustomEvent("view-workflow"));
                }}
              >
                <FileCode className="w-3 h-3" /> View Results
              </button>
            </GlassPanel>
          ))
        )}
      </div>

      {compareResult && (
        <CompareModal result={compareResult} onClose={() => setCompareResult(null)} />
      )}
    </>
  );
}
