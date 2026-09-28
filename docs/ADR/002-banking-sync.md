# ADR-B: Banking Sync Provider

## Context
Automated bank syncing is highly requested, but providers like Plaid lack coverage in key markets (e.g., Bolivia). We need a strategy that doesn't block users or couple the architecture to a single provider.

## Options
1. **(Recommended)** **Adapter Pattern (Manual + CSV/OFX MVP)**: Define a generic `BankProvider` interface. Implement the MVP entirely using Manual Entry and CSV/OFX File Imports. Leave Plaid/OpenBanking adapters for the future.
2. **Plaid-first**: Integrate Plaid immediately and limit the initial target market to supported countries.

## Proposed Decision: Option 1
We will use the **Adapter Pattern** and start with CSV/OFX support.
- **Why**: Plaid does not cover all regions. By designing an adapter (`BankProvider`), we ensure the budget engine is completely decoupled from any specific bank API. CSV/OFX imports provide immediate utility for all users worldwide while we evaluate regional Open Banking APIs (like TrueLayer or Belvo) for the future.
