import { CheckCircle2, GitBranch, RotateCcw, XCircle } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { RunStatus, TraceStepStatus } from "@/types/api";

const frost: React.CSSProperties = {
  backdropFilter: "blur(16px) saturate(1.3)",
  WebkitBackdropFilter: "blur(16px) saturate(1.3)",
  backgroundColor: "rgba(0,0,0,0.55)",
};

export function GlassPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl md:rounded-2xl border border-white/[0.08] p-4 md:p-6 transition-colors hover:border-white/[0.14] ${className}`} style={frost}>
      {children}
    </div>
  );
}

export function GlassMetric({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl md:rounded-2xl border border-white/[0.08] p-4 md:p-5 group hover:border-white/[0.14] transition-all" style={frost}>
      <div className="flex items-center gap-1.5 mb-2 md:mb-3">
        <span className="text-white/50">{icon}</span>
        <span className="text-[10px] md:text-xs text-white/60 font-medium truncate">{label}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold text-white font-mono tracking-tight">{value}</p>
      <p className="text-[10px] md:text-[11px] text-white/50 mt-0.5 font-mono">{sub}</p>
    </div>
  );
}

export function StatusDot({ status }: { status: RunStatus }) {
  const c =
    status === "pass"
      ? "bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.4)]"
      : status === "fail"
        ? "bg-red-400/80 shadow-[0_0_6px_rgba(248,113,113,0.4)]"
        : "bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.4)]";
  return <span className={`w-2 h-2 rounded-full ${c}`} />;
}

export function RunRow({ name, status, time, score }: { name: string; status: RunStatus; time: string; score: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 md:py-3 px-3 md:px-4 rounded-xl border border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer group">
      <div className="flex items-center gap-2.5 min-w-0">
        <StatusDot status={status} />
        <span className="text-xs md:text-sm text-white/80 truncate">{name}</span>
      </div>
      <div className="flex items-center gap-3 md:gap-6 text-[10px] md:text-xs font-mono shrink-0 ml-2">
        <span className="text-white/60">{score}</span>
        <span className="text-white/40 hidden sm:inline">{time}</span>
      </div>
    </div>
  );
}

export function FailureCard({ tool, type, desc, time }: { tool: string; type: string; desc: string; time: string }) {
  return (
    <div className="p-3 md:p-4 rounded-xl border border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <div className="flex justify-between items-start mb-1.5">
        <span className="font-mono text-[10px] md:text-[11px] text-red-300/80 bg-red-400/[0.08] border border-red-400/[0.12] px-1.5 py-0.5 rounded">{tool}</span>
        <span className="text-[10px] text-white/40 font-mono">{time}</span>
      </div>
      <p className="text-xs font-medium text-white/70 mb-0.5">{type}</p>
      <p className="text-[11px] text-white/50 leading-relaxed">{desc}</p>
    </div>
  );
}

export function ToolBar({ name, pct }: { name: string; pct: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px]">
        <span className="font-mono text-white/70">{name}</span>
        <span className="font-mono text-white/50">{pct}%</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-white/40 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function TraceStep({ step, tool, status, latency }: { step: number; tool: string; status: TraceStepStatus; latency: string }) {
  const Icon = status === "success" ? CheckCircle2 : status === "fail" ? XCircle : RotateCcw;
  const color = status === "success" ? "text-emerald-400/80" : status === "fail" ? "text-red-400/80" : "text-amber-400/80";
  return (
    <div className="flex-shrink-0 rounded-xl border border-white/[0.08] px-3 md:px-4 py-2.5 md:py-3 min-w-[130px] md:min-w-[160px] hover:bg-white/[0.05] transition-colors cursor-pointer" style={frost}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-white/40 font-mono">Step {step}</span>
        <Icon className={`w-3 h-3 ${color}`} />
      </div>
      <p className="font-mono text-[11px] md:text-xs text-white/70 truncate">{tool}</p>
      <p className="font-mono text-[10px] text-white/40 mt-0.5">{latency}</p>
    </div>
  );
}

export function TraceConnector() {
  return <div className="w-4 md:w-6 h-px bg-white/[0.08] flex-shrink-0" />;
}

export function RecommendationCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="p-3 md:p-4 rounded-xl border border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="w-3 h-3 text-white/50" />
        <p className="text-xs font-medium text-white/80">{title}</p>
      </div>
      <p className="text-[11px] text-white/55 leading-relaxed">{desc}</p>
    </div>
  );
}

export function PrimaryButton({ children, onClick, disabled, className = "" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-[13px] font-semibold bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >{children}</button>
  );
}

export function SecondaryButton({ children, onClick, disabled, className = "" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border border-white/[0.08] text-[11px] text-white/60 hover:bg-white/[0.06] hover:text-white/80 transition-colors disabled:opacity-40 ${className}`}
    >{children}</button>
  );
}

export function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bd = backdropRef.current;
    const pn = panelRef.current;
    if (!bd || !pn) return;

    gsap.set(bd, { opacity: 0 });
    gsap.set(pn, { opacity: 0, scale: 0.96, y: 16 });

    const tl = gsap.timeline();
    tl.to(bd, { opacity: 1, duration: 0.2, ease: "power2.out" });
    tl.to(pn, { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: "power3.out" }, 0.05);

    const kids = Array.from(pn.children) as HTMLElement[];
    if (kids.length > 0) {
      gsap.set(kids, { opacity: 0, y: 8 });
      tl.to(kids, { opacity: 1, y: 0, duration: 0.3, stagger: 0.04, ease: "power2.out", clearProps: "all" }, 0.12);
    }

    return () => { tl.kill(); };
  }, []);

  return (
    <div ref={backdropRef} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div ref={panelRef}
        className="w-full max-w-lg rounded-2xl border border-white/[0.1] p-6 max-h-[90vh] overflow-y-auto"
        style={{ ...frost, backgroundColor: "rgba(0,0,0,0.7)" }}
        onClick={(e) => e.stopPropagation()}
      >{children}</div>
    </div>
  );
}
