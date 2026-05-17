import { useState } from "react";
import { X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { ModalOverlay, PrimaryButton, SecondaryButton } from "@/components/ui/glass";

export function NewTestModal({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete?: () => void }) {
  const { mcpConnection, runAction, setLastRun, setSelectedWorkflowId } = useApp();
  const [task, setTask] = useState("Assign user_id 123 to the support queue");
  const [mode, setMode] = useState<"simulated" | "real">("simulated");
  const [stress, setStress] = useState(false);

  if (!open) return null;

  const handleRun = async () => {
    const result = await runAction("Running test…", () => api.runWorkflow({ task, mode, stress }));
    setLastRun(result);
    setSelectedWorkflowId(result.workflow_id);
    onComplete?.();
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white/90" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          New Agent Test
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/40">
          <X className="w-4 h-4" />
        </button>
      </div>

      <label className="block text-[11px] text-white/30 font-mono uppercase tracking-wider mb-2">Task</label>
      <textarea
        value={task}
        onChange={(e) => setTask(e.target.value)}
        rows={4}
        className="w-full rounded-xl border border-white/[0.08] bg-black/40 text-sm text-white/80 p-3 mb-4 resize-none focus:outline-none focus:border-white/20"
        placeholder="Describe what the agent should accomplish…"
      />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[11px] text-white/30 font-mono mb-2">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "simulated" | "real")}
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 text-sm text-white/70 px-3 py-2 focus:outline-none"
          >
            <option value="simulated">Simulated</option>
            <option value="real">Real MCP</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer pb-2">
            <input type="checkbox" checked={stress} onChange={(e) => setStress(e.target.checked)} className="rounded" />
            Stress mode
          </label>
        </div>
      </div>

      {mode === "real" && !mcpConnection?.live_connected && (
        <p className="text-xs text-amber-400/80 mb-4 border border-amber-400/20 rounded-lg px-3 py-2 bg-amber-400/5">
          Connect a real MCP server first (Workflows tab → MCP Connection).
        </p>
      )}

      <div className="flex gap-2 justify-end">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={handleRun} disabled={!task.trim()}>
          Run Test
        </PrimaryButton>
      </div>
    </ModalOverlay>
  );
}
