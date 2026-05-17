import { FileCode, Layers, Loader2, Play, Plug, Plus, Unplug } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { GlassPanel, PrimaryButton, SecondaryButton, StatusDot } from "@/components/ui/glass";
import { scoreToStatus, truncateTask } from "@/lib/format";

export function WorkflowsTab() {
  const { tools, mcpConnection, registryNote, workflows, actionLoading, runAction, setSelectedWorkflowId } = useApp();
  const [preset, setPreset] = useState("server-everything");

  const recent = [...workflows].reverse().slice(0, 6);

  return (
    <>
      <div className="mb-8 md:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-white/30 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">MCP & Tests</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Workflows
          </h1>
        </div>
      </div>

      <GlassPanel className="mb-4">
        <h2 className="text-sm font-semibold text-white/80 mb-3">MCP Connection</h2>
        <p className="text-[11px] text-white/30 mb-4">
          {mcpConnection?.live_connected
            ? `Live: ${mcpConnection.preset || mcpConnection.command} (${mcpConnection.tool_count} tools)`
            : "Not connected — use simulated mode or connect below"}
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
            <Unplug className="w-3 h-3" /> Disconnect
          </SecondaryButton>
          <SecondaryButton onClick={() => runAction("Syncing…", () => api.syncMcp())} disabled={!!actionLoading || !mcpConnection?.live_connected}>
            Sync tools
          </SecondaryButton>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={() => runAction("Loading bad pack…", () => api.loadBadDemo())} disabled={!!actionLoading}>
            Load bad demo
          </SecondaryButton>
          <SecondaryButton onClick={() => runAction("Loading fixed pack…", () => api.loadFixedDemo())} disabled={!!actionLoading}>
            Load fixed demo
          </SecondaryButton>
          <SecondaryButton
            onClick={async () => {
              const r = await runAction("Compare…", () =>
                api.compareWorkflow({ task: "Assign user_id 123 to the support queue", mode: "simulated" })
              );
              alert(`Before: ${r.before.agent_readiness_score} → After: ${r.after.agent_readiness_score} (+${r.improvement})`);
            }}
            disabled={!!actionLoading}
          >
            Compare before/after
          </SecondaryButton>
          <SecondaryButton
            onClick={() => runAction("Applying fixes…", () => api.applyOptimized({ use_last_workflow: true }))}
            disabled={!!actionLoading}
          >
            Apply optimized
          </SecondaryButton>
        </div>
        <p className="text-[10px] text-white/20 font-mono mt-3">{tools.length} tools in registry</p>
      </GlassPanel>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {recent.length === 0 ? (
          <GlassPanel>
            <p className="text-sm text-white/30">No test runs yet. Use New Test to run an agent workflow.</p>
          </GlassPanel>
        ) : (
          recent.map((w) => (
            <GlassPanel key={w.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                  <Layers className="w-4 h-4 text-white/30" />
                </div>
                <StatusDot status={scoreToStatus(w.agent_readiness_score)} />
              </div>
              <h3 className="text-sm font-semibold text-white/80 mb-1">{truncateTask(w.task, 48)}</h3>
              <p className="text-[11px] text-white/25 font-mono mb-3">
                {w.trace?.length ?? 0} steps · score {w.agent_readiness_score ?? "—"} · {w.mode ?? "sim"}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-white/[0.06] text-[11px] text-white/40 hover:bg-white/[0.04]"
                  onClick={() => setSelectedWorkflowId(w.id)}
                >
                  <FileCode className="w-3 h-3" /> View
                </button>
              </div>
            </GlassPanel>
          ))
        )}

        <GlassPanel>
          <div className="flex items-start justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
              <Plus className="w-4 h-4 text-white/30" />
            </div>
          </div>
          <h3 className="text-sm font-semibold text-white/80 mb-1">Registry tools</h3>
          <p className="text-[11px] text-white/25 font-mono mb-3 max-h-24 overflow-y-auto">
            {tools.slice(0, 8).map((t) => t.name).join(", ")}
            {tools.length > 8 ? ` +${tools.length - 8} more` : ""}
          </p>
          <PrimaryButton className="w-full" onClick={() => document.dispatchEvent(new CustomEvent("open-new-test"))}>
            <Play className="w-3 h-3 inline mr-1" /> New Test
          </PrimaryButton>
        </GlassPanel>
      </div>
    </>
  );
}
