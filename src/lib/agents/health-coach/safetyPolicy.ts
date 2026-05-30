export type CoachSafetyDecision = {
  blocked: boolean;
  reasons: string[];
  responseText?: string;
};

const selfHarmPattern = /\b(kill myself|suicide|suicidal|self[- ]?harm|end my life|don't want to live)\b/i;
const diagnosisPattern = /\b(diagnose me|do i have|prescribe|change my medication|stop my medication|dose of|dosage)\b/i;
const extremeDietPattern = /\b(500 calories|under 800 calories|starve|not eat for|punish myself|make me skinny fast|lose .*kg .*week)\b/i;

export function evaluateCoachMessageSafety(text: string): CoachSafetyDecision {
  const normalized = text.trim();

  if (selfHarmPattern.test(normalized)) {
    return {
      blocked: true,
      reasons: ["self_harm"],
      responseText:
        "I'm really glad you told me that. What you're feeling matters, and you don't have to handle it alone. Please reach out to someone you trust or a mental health professional now. If you're in immediate danger, contact local emergency support. I can stay with you, but you deserve real human support for this.",
    };
  }

  if (diagnosisPattern.test(normalized)) {
    return {
      blocked: true,
      reasons: ["medical_advice_boundary"],
      responseText:
        "I can't diagnose conditions, prescribe treatment, or advise medication changes. I can help you track food patterns and prepare clear notes to discuss with a qualified clinician.",
    };
  }

  if (extremeDietPattern.test(normalized)) {
    return {
      blocked: true,
      reasons: ["unsafe_restriction"],
      responseText:
        "I can't help with extreme restriction or punishment around food. I can help you plan a balanced day that supports your goals without being harsh on your body.",
    };
  }

  return { blocked: false, reasons: [] };
}
