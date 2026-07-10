# PROJECT_MANIFEST.md — Water Calculator

## Stage: Complete (Merged to main)

Goal: All modules implemented, tested, built, merged to main.

## ADRs

| ID | Decision | Rationale |
|---|---|---|
| ADR-01 | DOM scraping for token detection | Safer than network interception; won't trigger CSP/ToS bans |
| ADR-02 | Manifest V3, Chrome-first | Latest extension standard; Brave/Chrome share the same engine |
| ADR-03 | Fixed water ratio from literature | Single, citable conversion factor (3ml/1000 tokens); inference only |
| ADR-04 | IndexedDB for local storage | Privacy-preserving; no data leaves the browser |
| ADR-05 | Dashboard/analytics out of scope | Separate future project; extension focuses on tracking + visual |
| ADR-06 | Interface-first OOP (constructor injection) | Modules are self-contained plugins; removing one won't break the pipeline |
| ADR-07 | gpt-tokenizer + 2.5x multiplier | Lightweight token estimation; multiplier corrects for GPT's aggressive BPE vs other tokenizers |
| ADR-08 | addDelta uses options object | Extensible without breaking callers (ml, tokens, topic?) |
| ADR-09 | onNewText returns disposer | Callbacks can be unsubscribed, preventing memory leaks |
| ADR-10 | Per-platform text extraction | innerText for Gemini (rendered math), textContent for ChatGPT (CSS hides innerText) |
| ADR-11 | Full-text re-tokenization | Re-tokenize accumulated text each delta, return diff; eliminates double-counting from DOM rewrites |

## Activity Log

| Date | Activity | Details |
|---|---|---|
| 2026-07-10 | Seeding complete | Interview conducted, seed.yaml generated |
| 2026-07-10 | Design complete | Architecture spec with OOP principles |
| 2026-07-10 | Planning complete | 15-task TDD implementation plan |
| 2026-07-10 | Initial implementation | 10 modules, 46 tests, 0 lint errors, build passes |
| 2026-07-10 | ChatGPT fix | Switched to assistant-only selector `[data-message-author-role="assistant"]` |
| 2026-07-10 | Streaming fix | Full-text re-tokenization eliminates ChatGPT DOM rewrite double-counting |
| 2026-07-10 | Gemini fix | Prefer innerText (rendered math) over textContent (raw LaTeX annotations) |
| 2026-07-10 | Platform-specific selectors | Tightened selectors per platform; attach() self-cleans on re-entry |
| 2026-07-10 | Verification | ChatGPT: exact match at 6.3ml; Gemini: within ~10% of ground truth |
