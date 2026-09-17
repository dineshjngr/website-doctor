# 🩺 Website Doctor

**Website Doctor** is an open-source website health auditor focused on **technical SEO, on-page SEO, crawlability/indexation, structured data, internal linking, performance readiness, security and AI-search/GEO readiness**.

It is designed to answer two questions quickly:

1. **What is wrong?**
2. **What should I fix first?**

> Status: early MVP. It currently performs fast single-page + root-file checks. A full crawler, headless rendering and Core Web Vitals integrations are planned.

## What it checks now

- HTTP status and redirects
- meta robots / noindex / nofollow
- canonical tags
- title and meta descriptions
- H1 and heading hierarchy
- thin-content signal
- internal/external links
- empty and generic anchors
- image alt text and dimension signals
- likely LCP-image lazy-loading risk
- JSON-LD presence and syntax
- responsive viewport
- security headers
- `robots.txt`
- `/sitemap.xml`
- HTML language and hreflang x-default signal
- Open Graph metadata
- explicit robots rules for major AI/search crawlers

See **[docs/checks.md](docs/checks.md)** for deeper current and planned audit coverage.

## Example output

```text
Overall Health        78/100

Crawlability           84
On-page SEO            90
Content                 82
Internal Linking        76
Images & Media          88
Structured Data         68
Performance             72
Security                74
International SEO       95
AI Search Readiness     70
```

Every issue includes:

- severity
- category
- evidence
- recommendation
- stable issue code

Example:

```text
HIGH — CANONICAL_MISSING
Canonical tag is missing
Evidence: No rel=canonical found
Fix: Add a self-referencing canonical on canonical indexable pages.
```

## Run locally

```bash
git clone https://github.com/dineshjngr/website-doctor.git
cd website-doctor
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## API

```bash
curl -X POST http://localhost:3000/api/audit \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com"}'
```

## Scoring model

The MVP uses category weights and severity penalties. Scores are intended to help prioritise work, **not to claim that SEO can be reduced to one universal number**.

| Category | Weight |
|---|---:|
| Crawlability & Indexation | 18% |
| On-page SEO | 15% |
| Content & Semantics | 10% |
| Internal Linking | 10% |
| Images & Media | 8% |
| Structured Data | 10% |
| Performance Readiness | 8% |
| Security | 8% |
| International SEO | 5% |
| AI Search / GEO | 8% |

## Roadmap

### v0.2 — crawler
- crawl multiple pages with configurable limits
- broken links and redirect chains
- duplicate titles/descriptions/H1s
- orphan-page candidate detection
- crawl-depth and architecture reports
- canonical/indexability conflicts

### v0.3 — performance
- Lighthouse/PageSpeed integration
- LCP / INP / CLS
- TTFB and caching
- image byte-size checks
- JS/CSS weight and render-blocking resources

### v0.4 — structured data & entities
- parse Schema.org graphs
- validate common rich-result types
- inspect `@id`, `sameAs` and entity relationships
- detect conflicting Organization/Person/site entities

### v0.5 — AI Search / GEO
- `llms.txt` discovery
- AI crawler policy dashboard
- answer-ready content checks
- entity clarity/consistency signals
- citation-friendly factual structure
- Bing/AI-search readiness checks

### v1.0
- project history
- exports
- authentication
- scheduled audits
- before/after comparisons
- team dashboards

## Philosophy

Website Doctor should avoid false certainty. Not every flagged item is automatically an SEO problem. The tool should show **evidence, severity, confidence and recommended review**, so a human can make the final decision.

## Contributing

Issues and pull requests are welcome. Useful contributions include new deterministic checks, better evidence, tests, crawler improvements and false-positive reduction.

## License

MIT
