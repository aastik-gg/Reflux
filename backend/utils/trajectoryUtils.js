/**
 * trajectoryUtils.js
 * Compare workflow execution paths for instability detection.
 */

/**
 * Build a compact signature for a trace (tool sequence + arg keys).
 */
function traceSignature(trace) {
  return (trace || []).map((step) => {
    const argKeys = Object.keys(step.args || {}).sort().join(',');
    return `${step.tool}[${argKeys}]${step.success ? ':ok' : ':fail'}`;
  });
}

/**
 * Compare two trace signatures and return similarity 0–1.
 */
function trajectorySimilarity(sigA, sigB) {
  if (!sigA.length && !sigB.length) return 1;
  const maxLen = Math.max(sigA.length, sigB.length);
  if (maxLen === 0) return 1;

  let matches = 0;
  for (let i = 0; i < maxLen; i++) {
    if (sigA[i] === sigB[i]) matches++;
  }
  return matches / maxLen;
}

/**
 * Detect instability across multiple workflow runs.
 */
function detectInstability(runTraces) {
  if (!runTraces || runTraces.length < 2) {
    return { unstable: false, similarity: 1, details: 'Not enough runs to compare.' };
  }

  const signatures = runTraces.map((t) => traceSignature(t));
  let totalSim = 0;
  let pairs = 0;

  for (let i = 0; i < signatures.length; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      totalSim += trajectorySimilarity(signatures[i], signatures[j]);
      pairs++;
    }
  }

  const avgSimilarity = pairs > 0 ? totalSim / pairs : 1;
  const unstable = avgSimilarity < 0.6;

  return {
    unstable,
    similarity: Math.round(avgSimilarity * 100) / 100,
    details: unstable
      ? `Execution paths diverged significantly (avg similarity: ${avgSimilarity.toFixed(2)}).`
      : `Execution paths are reasonably consistent (avg similarity: ${avgSimilarity.toFixed(2)}).`,
    signatures,
  };
}

/**
 * Summarize a trace for reporting.
 */
function summarizeTrace(trace) {
  return {
    steps: trace.length,
    tools_used: [...new Set(trace.map((s) => s.tool))],
    failures: trace.filter((s) => !s.success).length,
    retries: trace.filter((s) => s.is_retry).length,
  };
}

module.exports = {
  traceSignature,
  trajectorySimilarity,
  detectInstability,
  summarizeTrace,
};
