import type { RunStatus, TraceStepStatus } from "@/types/api";

export function scoreToStatus(score: number | undefined): RunStatus {
  if (score == null) return "partial";
  if (score >= 90) return "pass";
  if (score >= 60) return "partial";
  return "fail";
}

export function stepToStatus(step: { success: boolean; is_retry: boolean }): TraceStepStatus {
  if (step.is_retry) return "retry";
  return step.success ? "success" : "fail";
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function timeAgo(iso: string | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function truncateTask(task: string, max = 42): string {
  if (task.length <= max) return task;
  return `${task.slice(0, max)}…`;
}

export function issueTypeLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
