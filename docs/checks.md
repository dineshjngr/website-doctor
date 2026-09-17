# Website Doctor audit coverage

The MVP performs fast, deterministic checks from HTML, HTTP headers, `robots.txt` and `/sitemap.xml`. Future versions should add a headless browser, a site crawler and field/lab performance data.

## 1. Crawlability & indexation
- HTTP status and redirect detection
- meta robots / Googlebot noindex and nofollow
- canonical presence, validity and mismatch
- robots.txt availability
- sitemap discovery signal in robots.txt
- default sitemap.xml availability
- planned: redirect chains/loops, soft 404s, orphan pages, crawl depth, pagination, faceted navigation, parameter duplication, canonical clusters, indexability conflicts, JS-rendered content comparison

## 2. On-page SEO
- title presence and length heuristics
- meta description presence, duplicate tags and length heuristics
- Open Graph title/image
- planned: duplicate titles/descriptions across crawl, intent alignment, keyword cannibalisation signals, SERP snippet preview, social metadata completeness

## 3. Content & semantic HTML
- H1 presence / multiple H1 signal
- heading hierarchy skips
- low visible-text signal
- planned: duplicate/near-duplicate content, boilerplate ratio, semantic landmarks, FAQ/question coverage, entity/topic coverage, E-E-A-T evidence signals

## 4. Internal linking
- internal/external link counts
- empty anchors
- generic anchor-text overuse
- page-level nofollow
- planned: broken links, redirecting internal links, orphan pages, click depth, inlink distribution, anchor diversity, excessive links, navigation/footer vs contextual links

## 5. Images & media
- missing alt attributes
- likely LCP image lazy-loading risk
- image dimension reservation signal
- planned: oversized image bytes, modern formats, srcset/sizes, broken images, duplicate alt, decorative-image handling, video embeds and poster optimisation

## 6. Structured data
- JSON-LD presence
- invalid JSON syntax
- planned: Schema.org graph extraction, @id entity linking, Google-rich-result eligibility, required/recommended properties, duplicate/conflicting entities, Organization/Person/ProfilePage/Breadcrumb/Article/Product/LocalBusiness checks

## 7. Performance / Core Web Vitals readiness
- viewport metadata
- LCP lazy-load risk
- image width/height signal
- planned: Lighthouse/PageSpeed integration, LCP/INP/CLS, render-blocking resources, JS/CSS weight, unused code, font loading, TTFB, compression, caching, preconnect/preload, third-party impact

## 8. Security & trust
- Content-Security-Policy
- HSTS
- X-Content-Type-Options
- Referrer-Policy
- planned: HTTPS/mixed content, TLS basics, insecure forms, permissions policy, exposed server headers

## 9. International SEO
- html lang
- hreflang presence and x-default signal
- planned: reciprocal hreflang, invalid locale codes, canonical/hreflang conflicts, region/language mismatch, duplicate international URLs

## 10. AI Search / GEO / AEO readiness
- tests explicit robots rules for OAI-SearchBot, ChatGPT-User, GPTBot, PerplexityBot, ClaudeBot, Claude-SearchBot and Google-Extended
- flags explicit blocking for review rather than assuming it is always wrong
- planned: llms.txt discovery, entity consistency, answer-ready passages, citation-friendly factual structure, author/publisher identity, sameAs/entity graph, freshness signals, source/citation patterns, Bing indexing readiness

## 11. Site architecture (planned crawler)
- crawl depth
- orphan candidates
- hub/category architecture
- breadcrumbs
- internal PageRank-like link equity
- URL consistency and taxonomy

## 12. Reporting (planned)
- issue priority = severity × affected URLs × likely impact × confidence
- issue grouping by template
- CSV/JSON/PDF exports
- before/after comparisons
- audit history
