# ADR-026: Production Career Intelligence UI/UX Architecture

## Status
Accepted

## Context
Following Phase 1 production security hardening and Phase 2 real AI/RAG engine implementation, CareerForge-AI required a unified, dark-first, recruiter-ready production user interface to expose candidate career intelligence without fabricating unverified metrics or fake progress.

## Decision
1. **Design System & Shell**:
   - Standardized dark palette tokens (`#030712` Background, `#111827` Cards, `#3B82F6` Primary Blue, `#06B6D4` Secondary Cyan, `#8B5CF6` Accent Purple, `#F8FAFC` Text).
   - Created a centralized, responsive application shell (`DashboardShell.tsx`) with a desktop sidebar, mobile drawer navigation, live system health badges, and unified header actions.
2. **Actionable Candidate Dashboard**:
   - Restructured `/dashboard` around verified candidate signals (profile completeness, extracted taxonomy skills, FAISS vector indexing status, and real role matches).
   - Embedded interactive target role skill-gap analysis and quick consultation launchers directly connected to RAG pipelines.
3. **Grounded AI Career Assistant**:
   - Upgraded `/dashboard/career-assistant` with real-time consultation streaming, conversation history drawer, expandable citation cards displaying document source types, snippet excerpts, and similarity scores.
   - Built first-class UI handling for `INSUFFICIENT_CONTEXT` (prompting resume ingestion) and `BLOCKED` (safe security rejection).
4. **Resume Ingestion & Section Separation**:
   - Polished `/dashboard/resume` with deterministic state transitions (Upload $\rightarrow$ Extract $\rightarrow$ Index $\rightarrow$ Complete), drag-and-drop validation, and clear separation between Extracted Facts and AI Recommendations.
5. **Role Recommendations & Matching**:
   - Multi-signal candidate matching with skill taxonomy overlap, missing skill badges, seniority weighting, and dynamic query filtering.
6. **Authentication & Data Privacy**:
   - Maintained strict Phase 1 security invariants: access tokens held in memory only, refresh tokens in HTTP-only cookies, 0 `localStorage` token storage.

## Consequences
- **Positive**: Cohesive, responsive, dark-first user experience that directly exposes real AI intelligence with zero hallucinated metrics.
- **Negative**: Requires active backend AI and API services to render dynamic match data; handled gracefully with structured empty and fallback states.
