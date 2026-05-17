import { Menu, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { ShaderAnimation } from "@/components/ui/shader-lines";
import { NewTestModal } from "@/components/NewTestModal";
import { AppProvider, useApp } from "@/context/AppContext";
import { OverviewTab } from "@/tabs/OverviewTab";
import { WorkflowsTab } from "@/tabs/WorkflowsTab";
import { TracesTab } from "@/tabs/TracesTab";
import { FailuresTab } from "@/tabs/FailuresTab";
import { PrimaryButton } from "@/components/ui/glass";

const TABS = ["overview", "workflows", "traces", "failures"] as const;
type TabId = (typeof TABS)[number];

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const { error, setError, refreshAll } = useApp();

  const switchTab = (id: TabId) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  useEffect(() => {
    const open = () => setTestModalOpen(true);
    document.addEventListener("open-new-test", open);
    return () => document.removeEventListener("open-new-test", open);
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
            <span className="font-semibold text-[15px] tracking-tight text-white/90">MCP Reliability</span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`px-4 py-1.5 rounded-md text-[13px] font-medium transition-all duration-200 ${
                  activeTab === id ? "bg-white/[0.1] text-white shadow-sm" : "text-white/40 hover:text-white/70"
                }`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="hidden md:block text-[13px] text-white/40 hover:text-white/70 transition-colors font-medium"
              onClick={() => refreshAll()}
            >
              Refresh
            </button>
            <PrimaryButton className="hidden md:block !px-4 !py-1.5" onClick={() => setTestModalOpen(true)}>
              New Test
            </PrimaryButton>
            <button
              type="button"
              className="md:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.06] px-4 py-3 space-y-1" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => switchTab(id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === id ? "bg-white/[0.1] text-white" : "text-white/40"
                }`}
              >
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
            <div className="pt-2 flex gap-2">
              <button type="button" className="flex-1 py-2 rounded-lg text-xs text-white/40 border border-white/[0.06]" onClick={() => refreshAll()}>
                Refresh
              </button>
              <button type="button" className="flex-1 py-2 rounded-lg text-xs font-semibold bg-white text-black" onClick={() => setTestModalOpen(true)}>
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
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "workflows" && <WorkflowsTab />}
        {activeTab === "traces" && <TracesTab />}
        {activeTab === "failures" && <FailuresTab />}
      </div>

      <NewTestModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        onComplete={() => setActiveTab("failures")}
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
