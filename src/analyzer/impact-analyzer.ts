import { DependencyGraph } from "./types";
import { StabilityMetric } from "./metrics";

export interface ImpactedNode {
  path: string;
  depth: number;
}

/**
 * Calculates all files impacted by a change in a given file.
 * @param graph The dependency graph of the project.
 * @param changedFile The path of the file that has changed.
 * @returns A list of impacted nodes with their depth from the changed file.
 */
export function calculateImpact(
  graph: DependencyGraph,
  changedFile: string
): ImpactedNode[] {
  const impacted: ImpactedNode[] = [];
  const queue: [string, number][] = [[changedFile, 0]];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const [currentFile, depth] = queue.shift()!;

    if (visited.has(currentFile)) {
      continue;
    }
    visited.add(currentFile);

    // Add to impacted list (excluding the source file itself)
    if (depth > 0) {
      impacted.push({ path: currentFile, depth });
    }

    const node = graph.nodes.get(currentFile);
    if (node) {
      for (const importer of node.importedBy) {
        if (!visited.has(importer)) {
          queue.push([importer, depth + 1]);
        }
      }
    }
  }

  return impacted;
}

/**
 * Calculates a risk score for every file in the project.
 * The risk score represents the potential impact of changing that file.
 * @param graph The dependency graph of the project.
 * @param stabilityMetrics The pre-calculated stability metrics for all files.
 * @returns A record mapping file paths to their risk score.
 */
export function calculateAllRiskScores(
  graph: DependencyGraph,
  stabilityMetrics: Record<string, StabilityMetric>
): Record<string, number> {
  const riskScores: Record<string, number> = {};
  const allFiles = Array.from(graph.nodes.keys());

  for (const file of allFiles) {
    const impactedFiles = calculateImpact(graph, file);
    let totalRisk = 0;

    for (const impactedNode of impactedFiles) {
      const stabilityMetric = stabilityMetrics[impactedNode.path];
      if (stabilityMetric) {
        // (1 - stability) is the "stability score" (higher is more stable)
        const stabilityScore = 1 - stabilityMetric.stability;
        // The weight decreases with depth
        const depthWeight = 1 / (impactedNode.depth + 1);
        totalRisk += stabilityScore * depthWeight;
      }
    }
    riskScores[file] = totalRisk;
  }

  return riskScores;
}
