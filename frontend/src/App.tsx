import { CheckCircle2, Menu, X, Zap } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ShaderAnimation } from "@/components/ui/shader-lines";
import { NewTestModal } from "@/components/NewTestModal";
import { AppProvider, useApp } from "@/context/AppContext";
import { OverviewTab } from "@/tabs/OverviewTab";
import { ToolsTab } from "@/tabs/ToolsTab";
import { HistoryTab } from "@/tabs/HistoryTab";

const TABS = ["overview", "tools", "history"] as const;
type TabId = (typeof TABS)[number];
const TAB_LABELS: Record<TabId, string> = { overview: "Overview", tools: "Tools", history: "History" };

const navFrost: React.CSSProperties = {
  backdropFilter: "blur(16px) saturate(1.3)",
  WebkitBackdropFilter: "blur(16px) saturate(1.3)",
  backgroundColor: "rgba(0,0,0,0.7)",
};

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const { error, setError, toast, tools } = useApp();

  const navRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Partial<Record<TabId, HTMLDivElement | null>>>({});
  const isFirst = useRef(true);

  const switchTab = (id: TabId) => {
    setActiveTab(id);
    setMenuOpen(false);
  };

  // Page load entrance
  useLayoutEffect(() => {
    const tl = gsap.timeline();
    if (bgRef.current) tl.fromTo(bgRef.current, { opacity: 0 }, { opacity: 1, duration: 1, ease: "power2.out" }, 0);
    if (navRef.current) tl.fromTo(navRef.current, { y: -48, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", clearProps: "all" }, 0.15);
    return () => { tl.kill(); };
  }, []);

  // Sliding tab indicator
  useLayoutEffect(() => {
    const bar = tabBarRef.current;
    const slider = sliderRef.current;
    if (!bar || !slider) return;
    const idx = TABS.indexOf(activeTab);
    const btn = bar.children[idx + 1] as HTMLElement;
    if (!btn) return;
    gsap.to(slider, { x: btn.offsetLeft, width: btn.offsetWidth, duration: 0.3, ease: "power3.out" });
  }, [activeTab]);

  // Tab panel transitions
  useLayoutEffect(() => {
    TABS.forEach((id) => {
      const el = panelRefs.current[id];
      if (!el) return;

      if (id === activeTab) {
        el.style.display = "";
        if (!isFirst.current) {
          const kids = Array.from(el.children) as HTMLElement[];
          gsap.killTweensOf(kids);
          gsap.set(kids, { opacity: 0, y: 18 });
          gsap.to(kids, { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: "power3.out", clearProps: "all" });
        }
      } else {
        gsap.killTweensOf(Array.from(el.children));
        el.style.display = "none";
      }
    });
    isFirst.current = false;
  }, [activeTab]);

  // Scroll to top on tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [activeTab]);

  // Custom events
  useEffect(() => {
    const openTest = () => setTestModalOpen(true);
    const goOverview = () => setActiveTab("overview");
    const goTools = () => setActiveTab("tools");
    document.addEventListener("open-new-test", openTest);
    document.addEventListener("view-workflow", goOverview);
    document.addEventListener("go-tools", goTools);
    return () => {
      document.removeEventListener("open-new-test", openTest);
      document.removeEventListener("view-workflow", goOverview);
      document.removeEventListener("go-tools", goTools);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/20 relative overflow-x-hidden">
      <div ref={bgRef} className="fixed inset-0 z-0">
        <ShaderAnimation />
      </div>
      <div className="fixed inset-0 z-[1] pointer-events-none bg-gradient-to-b from-black/25 via-transparent to-black/40" />
      <div className="fixed inset-0 z-[1] pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)" }} />

      <nav ref={navRef} className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08]" style={navFrost}>
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white/10 border border-white/10 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white/90" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-white/90">Reflux</span>
          </div>

          <div ref={tabBarRef} className="hidden md:flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06] relative">
            <div ref={sliderRef} className="absolute top-0.5 left-0 h-[calc(100%-4px)] rounded-md bg-white/[0.1] shadow-sm pointer-events-none" />
            {TABS.map((id) => (
              <button key={id} type="button" onClick={() => switchTab(id)}
                className={`relative z-10 px-4 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-200 ${activeTab === id ? "text-white" : "text-white/60 hover:text-white/70"}`}
              >{TAB_LABELS[id]}</button>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative hidden md:block group">
              <button type="button" onClick={() => tools.length > 0 && setTestModalOpen(true)} disabled={tools.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >New Test</button>
              {tools.length === 0 && (
                <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] text-white/70 bg-black/80 border border-white/10 rounded-md px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  Load MCP tools first
                </span>
              )}
            </div>
            <button type="button" className="md:hidden p-1.5 rounded-lg hover:bg-white/10" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5 text-white/80" /> : <Menu className="w-5 h-5 text-white/80" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/[0.06] px-4 py-3 space-y-1" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
            {TABS.map((id) => (
              <button key={id} type="button" onClick={() => switchTab(id)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === id ? "bg-white/[0.1] text-white" : "text-white/60"}`}
              >{TAB_LABELS[id]}</button>
            ))}
            <div className="pt-3">
              <button type="button" onClick={() => { if (tools.length > 0) { setTestModalOpen(true); setMenuOpen(false); } }}
                disabled={tools.length === 0} className="w-full py-2 rounded-lg text-xs font-semibold bg-white text-black disabled:opacity-40"
              >{tools.length === 0 ? "Load MCP tools first" : "New Test"}</button>
            </div>
          </div>
        )}
      </nav>

      {error && (
        <div className="fixed top-16 left-0 right-0 z-[60] px-4">
          <div className="max-w-[1440px] mx-auto bg-red-500/10 border border-red-400/30 rounded-lg px-4 py-2 flex justify-between items-center text-sm text-red-200">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-300/60 hover:text-red-200"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60]">
          <div className="flex items-center gap-2 border border-emerald-400/30 rounded-lg px-4 py-2.5 text-sm text-emerald-200 shadow-lg"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", backgroundColor: "rgba(0,0,0,0.7)" }}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400/80 shrink-0" />
            <span>{toast}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 pt-20 md:pt-28 pb-10 md:pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
        <div ref={(el) => { panelRefs.current.overview = el; }}><OverviewTab /></div>
        <div ref={(el) => { panelRefs.current.tools = el; }} style={{ display: "none" }}><ToolsTab /></div>
        <div ref={(el) => { panelRefs.current.history = el; }} style={{ display: "none" }}><HistoryTab /></div>
      </div>

      <NewTestModal open={testModalOpen} onClose={() => setTestModalOpen(false)} onComplete={() => setActiveTab("overview")} />
    </div>
  );
}

export default function App() {
  return <AppProvider><AppShell /></AppProvider>;
}
