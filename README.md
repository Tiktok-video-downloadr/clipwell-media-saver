# Clipwell — Authorized Media Processing Platform

Production-grade architecture for processing media you're actually
authorized to retrieve: your own uploads, URLs you hold rights to, and your
own content pulled through a platform's official API. See
`docs/ARCHITECTURE.md` for the full design and `docs/COST_MODEL.md` for
scaling economics from 1K to 1M jobs/day.

**Explicitly out of scope, by design:** unofficial extraction/scraping of
arbitrary TikTok, Instagram, Facebook, or YouTube URLs. The `direct-url`
adapter refuses those four hosts outright; the only path to their content is
`oauth-own-content`, gated on a real connected account.

## Project layout
