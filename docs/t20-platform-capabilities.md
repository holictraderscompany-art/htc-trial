# T20 platform capability and integration-gap matrix

Checked 26 October 2026 JST. T18 remains the only recipe authority. This matrix
distinguishes HTC editorial deliverables from provider API capability. All social
adapters/account connections remain NOT IMPLEMENTED; none was tested live.
No quotas, monetization eligibility, encoding/upload caps, permissions or account
entitlements are asserted as implementation-ready. Verify those against the
chosen official API version and authorized account before future integration.

| T18 recipe | HTC editorial preparation | Existing HTC capability | External gap / unverified behavior |
| --- | --- | --- | --- |
| instagram-carousel | 1–8 ordered images; caption/alt text/attribution | T19 storyboard; private asset references | Meta API/account/delivery support UNVERIFIED |
| instagram-reel | Cinematic stylized 3D; compiled video; caption/subtitle review | T19 script/timeline; private VIDEO ownership | Meta API/Reels requirements UNVERIFIED |
| facebook-static | CAROUSEL or ALBUM; ordered images and caption/alt text | T18 format choice; no invented universal slide cap | Organic album/carousel distinction and account API support UNVERIFIED |
| facebook-reel | Cinematic stylized 3D; compiled video and caption | T19 continuity and script requirements | Meta API/Reels requirements UNVERIFIED |
| tiktok-photo-carousel | 1–8 ordered images; caption and accessibility review | T19 image/storyboard mapping | Official Direct Post docs describe photo flow; HTC transfer/account support absent |
| tiktok-animated-video | Cinematic stylized 3D; compiled video and caption/subtitle review | T19 script/timeline mapping | Official Direct Post docs describe video flow; HTC adapter absent |
| youtube-explainer | 600–900 seconds; title/description; subtitles; thumbnail review | T19 complete source timeline; private assets | Separate upload/caption/thumbnail operations documented; HTC integration absent |
| youtube-short | Cinematic stylized 3D; title/description; caption and thumbnail plan | T19 script/timeline; no invented duration cap | Shorts classification/thumbnail behavior and account delivery remain UNVERIFIED |
| website-article | Localized supporting article; title; public attribution/readability review | Existing CMS/T15 Founder release, RELEASED-only public reads | Real CMS record and approved public destination still required; public binary media delivery absent |

Preparation fields are intentionally different by platform. Requiring a thumbnail
plan for YouTube does not assert a custom thumbnail can be uploaded for every
Short/account. Accessibility text or subtitles may need baked-in media or another
approved presentation path when provider fields are unsupported. Never silently
drop an accessibility or risk qualification requirement to fit an API.

## Official documentation evidence

Meta official documentation requests returned HTTP 429 during this task. They
are verification targets, not verified specifications. No third-party copy was
used to substitute for current official evidence:

- [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [Facebook Pages posts](https://developers.facebook.com/docs/pages-api/posts/)
- [Facebook Reels publishing](https://developers.facebook.com/docs/video-api/guides/reels-publishing/)

TikTok's [Direct Post guide](https://developers.tiktok.com/docs/en/content-posting-api-get-started)
describes authorized video/photo posting and app setup. It requires a verified
domain/URL prefix for photo delivery. This does not authorize publishing private
Supabase assets via public URLs. No domain verification, app registration, user
consent or live API check occurred. Detailed account-specific limits, approval,
privacy, rights/disclosure and accessibility behavior remain future verification.

YouTube documents [video uploads](https://developers.google.com/youtube/data/reference/rest/v3/videos/insert),
[caption uploads](https://developers.google.com/youtube/data/reference/rest/v3/captions/insert)
and [custom thumbnails](https://developers.google.com/youtube/data/reference/rest/v3/thumbnails/set)
as separate authorized operations. T20 supplies preparation slots only. It does
not establish account authorization, audit eligibility, Shorts classification,
API quotas or successful encoding/upload compatibility.

These are read-only documentation checks, not platform compatibility tests.
Provider documentation access is separate from forbidden social account login,
OAuth connection, paid calls, media upload or publication. Recheck volatile
requirements at future implementation time; this snapshot is not a permanent API
contract. No provider instruction overrides HTC asset privacy or Founder gates.

## Delivery and future extensions

Current HTC assets are private with a 6,000,000-byte cap and existing narrow MIME
allowlist. T20 does not expose a media URL or upload binary. A future adapter
needs an approved delivery contract compatible with both those controls and the
provider's actual requirements. Missing compatibility blocks actual distribution,
not the offline nine-recipe foundation. Any required storage or authorization
change needs separate Founder review before implementation.

Podcast/video-podcast distribution is a future mapping extension. It needs a
separately approved topic/format relationship, audio/video deliverables, language
and transcript accessibility, destination rights, artwork, delivery and release
requirements. T20 does not add a tenth recipe, reserve feeds/accounts, install
tools or alter T18/T19. The nine current recipes remain independently reviewable.
