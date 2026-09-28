# ADR-D: AI Provider & Privacy Policy

## Context
The AI Copilot and Auto-categorization features require an LLM. We must ensure financial data privacy (P8) and control over the AI's actions (P7, P15).

## Options
1. **(Recommended)** **LLM Adapter with PII Stripping**: Use an adapter pattern for the AI Gateway. Default to a strong provider (e.g., OpenAI or Anthropic). The Gateway must strip Personally Identifiable Information (PII) before sending prompts and only provide the LLM with whitelisted tools (function calling).
2. **Local/Self-hosted LLM**: Host an open-source model locally to guarantee 100% data residency.

## Proposed Decision: Option 1
We will use an **LLM Adapter with PII Stripping**.
- **Why**: Self-hosting a high-reasoning model is too resource-intensive for the MVP. By using an adapter with strict prompt generation controls, we can leverage top-tier models (like GPT-4o or Claude 3.5) while ensuring that only anonymized transaction data (amounts, dates, sanitized payees) leaves the system. The LLM only proposes actions; it cannot execute them directly.
