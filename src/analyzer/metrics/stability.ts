import { DependencyGraph } from "../types";
import { StabilityMetric } from ".";

/**
 * Calculates the stability metrics for all modules in the dependency graph.
 * Stability (I) = Ce / (Ca + Ce)
 * I=0 indicates a maximally stable module.
 * I=1 indicates a maximally unstable module.
 * @param graph The dependency graph of the project.
 * @returns A record mapping module paths to their stability metrics.
 */
export function calculateStability(
  graph: DependencyGraph
): Record<string, StabilityMetric> {
  const metrics: Record<string, StabilityMetric> = {};

  for (const [nodePath, node] of graph.nodes.entries()) {
    const ce = node.imports.length; // Outgoing dependencies
    const ca = node.importedBy.length; // Incoming dependencies

    let stability = 1; // Default to unstable
    if (ca + ce > 0) {
      stability = ce / (ca + ce);
    } else if (ca === 0 && ce === 0) {
      // Isolated module, considered perfectly stable
      stability = 0;
    }

    metrics[nodePath] = {
      ca,
      ce,
      stability,
    };
  }

  return metrics;
}
