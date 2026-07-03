import { Loader2, Plus, Trash2, Upload, Wrench, Zap } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { GlassPanel, ModalOverlay, PrimaryButton, SecondaryButton } from "@/components/ui/glass";

export function ToolsTab() {
  const { tools, runAction, actionLoading } = useApp();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const loadBad = () => runAction("Loading bad demo…", () => api.loadBadDemo());
  const loadFixed = () => runAction("Loading fixed demo…", () => api.loadFixedDemo());
  const clearAll = () => runAction("Clearing…", () => api.replaceTools([]));

  return (
    <>
      <div className="mb-6 md:mb-8">
        <p className="text-white/70 text-[10px] md:text-xs font-mono uppercase tracking-[0.2em] mb-2">MCP Registry</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
          Tools
        </h1>
        <p className="text-white/60 text-xs md:text-sm mt-2 max-w-lg">
          Add your MCP tool definitions here. These are the tools that agents will use during testing.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <PrimaryButton onClick={() => setAddModalOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Tools
        </PrimaryButton>
        <SecondaryButton onClick={loadBad} disabled={!!actionLoading}>
          {actionLoading === "Loading bad demo…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Load Bad Demo
        </SecondaryButton>
        <SecondaryButton onClick={loadFixed} disabled={!!actionLoading}>
          {actionLoading === "Loading fixed demo…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Load Fixed Demo
        </SecondaryButton>
        {tools.length > 0 && (
          <SecondaryButton onClick={clearAll} disabled={!!actionLoading}>
            {actionLoading === "Clearing…" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Clear All
          </SecondaryButton>
        )}
      </div>

      {/* Demo explanation */}
      {tools.length === 0 && (
        <GlassPanel className="mb-6">
          <div className="py-6 text-center">
            <Wrench className="w-8 h-8 text-white/50 mx-auto mb-3" />
            <p className="text-sm text-white/80 mb-2">No tools loaded</p>
            <p className="text-[12px] text-white/60 max-w-md mx-auto leading-relaxed">
              <strong>Add Tools</strong> — paste or upload a JSON array of MCP tool definitions.<br />
              <strong>Load Bad Demo</strong> — pre-built tools with intentionally poor naming and docs (for testing).<br />
              <strong>Load Fixed Demo</strong> — the same tools with agent-friendly improvements.
            </p>
          </div>
        </GlassPanel>
      )}

      {/* Current tools grid */}
      {tools.length > 0 && (
        <>
          <p className="text-xs text-white/55 font-mono mb-3">{tools.length} tools in registry</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tools.map((tool) => (
              <GlassPanel key={tool.name}>
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                    <Wrench className="w-3.5 h-3.5 text-white/55" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white/85 truncate">{tool.name}</h3>
                  </div>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed mb-2 line-clamp-2">{tool.description || "No description"}</p>
                {tool.parameters && Object.keys(tool.parameters).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(tool.parameters).map((p) => (
                      <span key={p} className="text-[10px] font-mono text-white/50 bg-white/[0.04] px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                )}
              </GlassPanel>
            ))}
          </div>
        </>
      )}

      {addModalOpen && <AddToolsModal onClose={() => setAddModalOpen(false)} />}
    </>
  );
}

function AddToolsModal({ onClose }: { onClose: () => void }) {
  const { runAction, actionLoading } = useApp();
  const [json, setJson] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJson(reader.result as string);
      setParseError(null);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setParseError(null);
    let tools;
    try {
      const parsed = JSON.parse(json);
      tools = Array.isArray(parsed) ? parsed : parsed.tools;
      if (!Array.isArray(tools)) throw new Error("Expected a JSON array of tools or { tools: [...] }");
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }

    try {
      if (mode === "replace") {
        await runAction("Replacing tools…", () => api.replaceTools(tools));
      } else {
        await runAction("Adding tools…", () => api.uploadTools(tools));
      }
      onClose();
    } catch {
      // error shown via context
    }
  };

  const toolCount = (() => {
    try {
      const p = JSON.parse(json);
      const arr = Array.isArray(p) ? p : p.tools;
      return Array.isArray(arr) ? arr.length : null;
    } catch {
      return null;
    }
  })();

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-semibold text-white/90 mb-4" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
        Add MCP Tools
      </h2>

      <p className="text-[12px] text-white/60 mb-3">
        Paste a JSON array of tool definitions, or upload a <code className="text-white/70">.json</code> file.
      </p>

      <textarea
        value={json}
        onChange={(e) => { setJson(e.target.value); setParseError(null); }}
        rows={10}
        className="w-full rounded-xl border border-white/[0.08] bg-black/40 text-xs text-white/80 font-mono p-3 mb-3 resize-none focus:outline-none focus:border-white/20"
        placeholder={`[\n  {\n    "name": "my_tool",\n    "description": "What this tool does",\n    "parameters": {\n      "param_name": "string"\n    }\n  }\n]`}
      />

      {parseError && <p className="text-xs text-red-400/80 mb-3">{parseError}</p>}
      {toolCount != null && <p className="text-xs text-emerald-400/70 mb-3">{toolCount} tools detected</p>}

      <div className="flex items-center gap-4 mb-4">
        <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/80">
          <Upload className="w-3 h-3" /> Upload .json file
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFile} className="hidden" />

        <label className="flex items-center gap-2 text-xs text-white/60">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "replace" | "merge")}
            className="rounded-lg border border-white/[0.08] bg-black/40 text-xs text-white/70 px-2 py-1"
          >
            <option value="replace">Replace all tools</option>
            <option value="merge">Merge with existing</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2 justify-end">
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton onClick={handleSubmit} disabled={!json.trim() || !!actionLoading}>
          {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          Add Tools
        </PrimaryButton>
      </div>
    </ModalOverlay>
  );
}
