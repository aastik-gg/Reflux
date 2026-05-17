import { ChevronDown, Loader2, Menu, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ShaderAnimation } from "@/components/ui/shader-lines";
import { NewTestModal } from "@/components/NewTestModal";
import { AppProvider, useApp } from "@/context/AppContext";
import { OverviewTab } from "@/tabs/OverviewTab";
import { WorkflowsTab } from "@/tabs/WorkflowsTab";
import { TracesTab } from "@/tabs/TracesTab";
import { FailuresTab } from "@/tabs/FailuresTab";
import { api } from "@/lib/api";

const TABS = ["dashboard", "workflows", "traces", "failures"] as const;
type TabId = (typeof TABS)[number];

function DemoDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { runAction, actionLoading } = useApp();

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const loadBad = () => {
    setOpen(false);
    runAction("Loading bad pack…", () => api.loadBadDemo());
  };
  const loadFixed = () => {
    setOpen(false);
    runAction("Loading fixed pack…", () => api.loadFixedDemo());
  };

  const isLoading = actionLoading === "Loading bad pack…" || actionLoading === "Loading fixed pack…";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={!!actionLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.08] text-[13px] text-white/70 hover:text-white/80 hover:border-white/[0.15] transition-all disabled:opacity-40"
      >
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
        Load Demo
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-2 w-44 rounded-xl border border-white/[0.1] p-1.5 z-[200] shadow-xl"
          style={{ backdropFilter: "blur(24px) saturate(1.4)", backgroundColor: "rgba(0,0,0,0.8)" }}
        >
          <button
            type="button"
            onClick={loadBad}
            className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-white/60 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
          >
            Bad Demo Pack
            <span className="block text-[10px] text-white/50 mt-0.5">Tools with issues</span>
          </button>
          <button
            type="button"
            onClick={loadFixed}
            className="w-full text-left px-3 py-2 rounded-lg text-[12px] text-white/60 hover:bg-white/[0.06] hover:text-white/90 transition-colors"
          >
            Fixed Demo Pack
            <span className="block text-[10px] text-white/50 mt-0.5">Optimized tools</span>
          </button>
        </div>
      )}
    </div>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const { error, setError, tools } = useApp();

  const switchTab = (id: TabId) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  useEffect(() => {
    const open = () => setTestModalOpen(true);
    const viewWorkflow = () => setActiveTab("dashboard");
    document.addEventListener("open-new-test", open);
    document.addEventListener("view-workflow", viewWorkflow);
    return () => {
      document.removeEventListener("open-new-test", open);
      document.removeEventListener("view-workflow", viewWorkflow);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <ShaderAnimation />
      </div>
      <div className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08]"
        style={{
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          backgroundColor: "rgba(0,0,0,0.55)",
        }}
      >
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white/10 border border-white/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white/90" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-white/90">Reflux</span>
          </div>

          {/* Desktop tabs */}
          <div className="hidden md:flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 ${
                  activeTab === id ? "bg-white/[0.1] text-white shadow-sm" : "text-white/60 hover:text-white/70"
                }`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>

          {/* Persistent actions — always visible */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:block">
              <DemoDropdown />
            </div>
            <button
              type="button"
              onClick={() => setTestModalOpen(true)}
              disabled={tools.length === 0}
              className="hidden md:flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              New Test
            </button>
            <button
              type="button"
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.06] px-4 py-3 space-y-1" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id ? "bg-white/[0.1] text-white" : "text-white/60"
                }`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
            <div className="pt-3 flex gap-2">
              <DemoDropdown />
              <button
                type="button"
                onClick={() => { setTestModalOpen(true); setMenuOpen(false); }}
                disabled={tools.length === 0}
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white text-black disabled:opacity-40"
              >
                New Test
              </button>
            </div>
          </div>
        )}
      </nav>

      {error && (
        <div className="fixed top-16 left-0 right-0 z-[60] px-4">
          <div className="max-w-[1440px] mx-auto bg-red-500/10 border border-red-400/30 rounded-lg px-4 py-2 flex justify-between items-center text-sm text-red-200">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-300/60 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="relative z-10 pt-20 md:pt-28 pb-10 md:pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
        {activeTab === "dashboard" && <OverviewTab />}
        {activeTab === "workflows" && <WorkflowsTab />}
        {activeTab === "traces" && <TracesTab />}
        {activeTab === "failures" && <FailuresTab />}
      </div>

      <NewTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        onComplete={() => setActiveTab("dashboard")}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
