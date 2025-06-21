export interface StabilityMetric {
  ca: number; // Afferent Couplings (Incoming)
  ce: number; // Efferent Couplings (Outgoing)
  stability: number; // Instability Score (I-Score)
}
