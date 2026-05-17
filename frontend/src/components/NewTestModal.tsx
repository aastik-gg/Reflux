import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { ModalOverlay, PrimaryButton, SecondaryButton } from "@/components/ui/glass";

const PROGRESS_STAGES = [
  "Loading MCP tools…",
  "Starting agent loop…",
  "Agent calling tools…",
  "Running stability check…",
  "Detecting failures…",
  "Evaluating with LLM…",
  "Computing readiness score…",
  "Generating fix report…",
];

export function NewTestModal({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete?: () => void }) {
  const { mcpConnection, runAction, actionLoading, setLastRun, setSelectedWorkflowId } = useApp();
  const [task, setTask] = useState("Assign user_id 123 to the support queue");
  const [mode, setMode] = useState<"simulated" | "real">("simulated");
  const [stress, setStress] = useState(false);
  const [running, setRunning] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      setStageIdx(0);
      intervalRef.current = setInterval(() => {
        setStageIdx((prev) => Math.min(prev + 1, PROGRESS_STAGES.length - 1));
      }, 4000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  if (!open) return null;

  const handleRun = async () => {
    if (running || !!actionLoading) return;
    setRunning(true);
    try {
      const result = await runAction("Running test…", () => api.runWorkflow({ task, mode, stress }));
      setLastRun(result);
      setSelectedWorkflowId(result.workflow_id);
      onComplete?.();
      onClose();
    } catch {
      // error shown via context
    } finally {
      setRunning(false);
    }
  };

  return (
    <ModalOverlay onClose={running ? () => {} : onClose}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-white/90" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          New Agent Test
        </h2>
        {!running && (
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-white/60">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {running ? (
        <div className="py-8 flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-white/60 animate-spin" />
          <p className="text-sm text-white/70 font-medium">{PROGRESS_STAGES[stageIdx]}</p>
          <div className="w-full max-w-xs">
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-white/30 transition-all duration-1000 ease-out"
                style={{ width: `${Math.round(((stageIdx + 1) / PROGRESS_STAGES.length) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-white/45 font-mono mt-2 text-center">
              Step {stageIdx + 1} of {PROGRESS_STAGES.length}
            </p>
          </div>
          <p className="text-[11px] text-white/70 mt-2">This usually takes 20–60 seconds</p>
        </div>
      ) : (
        <>
          <label className="block text-[11px] text-white/55 font-mono uppercase tracking-wider mb-2">Task</label>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 text-sm text-white/80 p-3 mb-4 resize-none focus:outline-none focus:border-white/20"
            placeholder="Describe what the agent should accomplish…"
          />

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[11px] text-white/55 font-mono mb-2">Mode</label>
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
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer pb-2">
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
        </>
      )}
    </ModalOverlay>
  );
}
