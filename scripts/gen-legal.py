"""Generate the Catchstack legal/support static site (Cloudflare Pages).

Mirrors the established starving-effort legal pattern (see apps/jp-kotoba,
apps/mirrorbite, apps/uchinomon). Content is written to match Catchstack's
ACTUAL behavior: local-first storage, optional public price/image fetches
from pokemontcg.io + Scryfall, on-device photos, no accounts/analytics/ads.
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "legal"
OUT.mkdir(exist_ok=True)

# Real, established facts (shared across all starving-effort iOS apps).
ENTITY = "starving-effort"
SUPPORT = "support@starving-effort.com"
UP = "Last updated: 2026-06-29"

CSS = (
    ":root{--green:#1F8A4C;--gold:#9C7D44;--ink:#1C1C1E;--paper:#FBFBFA;--muted:#6E6E73;--line:#ECECEA;}"
    "*{box-sizing:border-box;}"
    "body{font-family:-apple-system,'SF Pro Text',Inter,'Hiragino Kaku Gothic ProN',sans-serif;"
    "color:var(--ink);background:var(--paper);max-width:720px;margin:0 auto;padding:36px 24px 80px;line-height:1.65;}"
    "h1{font-size:30px;font-weight:900;letter-spacing:-0.5px;margin:0 0 6px;}h1 b{color:var(--green);}"
    ".updated{color:var(--muted);font-size:14px;font-weight:700;margin:0 0 28px;}"
    "h2{font-size:18px;font-weight:800;margin:30px 0 8px;padding-bottom:5px;border-bottom:2px solid var(--line);}"
    "p,li{font-size:15px;}ul{padding-left:22px;}strong{color:var(--ink);}"
    ".callout{background:#EAF5EE;border-left:4px solid var(--green);padding:14px 16px;border-radius:10px;margin:16px 0;}"
    ".callout p{margin:0;font-weight:700;}a{color:var(--green);font-weight:700;}"
    "nav{margin:0 0 24px;font-size:14px;font-weight:800;}nav a{margin-right:14px;}"
    "footer{margin-top:48px;padding-top:22px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;}"
)

NAV = '<nav><a href="/">Catchstack</a><a href="/privacy">Privacy</a><a href="/support">Support</a><a href="/terms">Terms</a></nav>'
FOOT = (f'<footer>Catchstack — a private record for your card collection.<br>'
        f'© 2026 {ENTITY}. Contact: <a href="mailto:{SUPPORT}">{SUPPORT}</a><br>'
        f'Not affiliated with Nintendo, The Pokémon Company, Wizards of the Coast, PSA, or TCGplayer.</footer>')


def page(title, body):
    return (f'<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<meta name="viewport" content="width=device-width, initial-scale=1"><title>{title}</title>'
            f'<style>{CSS}</style></head><body>{NAV}{body}{FOOT}</body></html>')


privacy = page("Catchstack — Privacy Policy", f"""
<h1>Catch<b>stack</b> — Privacy Policy</h1>
<p class="updated">{UP}</p>
<div class="callout"><p>Short version: no accounts, no tracking, no ads. Your collection stays on your device. The app fetches public card prices and images from pokemontcg.io and Scryfall.</p></div>

<h2>1. What we collect</h2>
<p><strong>No personal information.</strong> Catchstack has no accounts and no user database. We do not ask for your name, email, phone number, or location, and we do not use analytics, advertising identifiers, or tracking of any kind.</p>

<h2>2. Where your data lives</h2>
<p>Your collection &mdash; the cards you own, your acquisition cost, storage, notes, alerts, and any photos you add &mdash; is stored <strong>only in your device's local storage</strong>. It never leaves your device and we never see it.</p>

<h2>3. Network requests for card images</h2>
<p>To show card artwork, Catchstack requests <strong>public images</strong> from third-party card catalogs:</p>
<ul>
<li><a href="https://pokemontcg.io">pokemontcg.io</a> &mdash; Pokémon card images.</li>
<li><a href="https://scryfall.com">Scryfall</a> &mdash; Magic: The Gathering card images.</li>
</ul>
<p>These requests contain only the public card identifiers needed to fetch an image. They do <strong>not</strong> include your name, your collection, or any personal information. As with any internet request, these providers may receive standard technical metadata (such as your IP address) and handle it under their own privacy policies. Reference prices shown in this build are bundled with the app; live price fetches are planned for a future release.</p>

<h2>4. Camera &amp; photos</h2>
<p>If you choose a photo for a card, the photo is saved <strong>on your device</strong> as that card's image. Photos are never uploaded to us or to any third party.</p>

<h2>5. What we do NOT do</h2>
<ul>
<li>No accounts, names, emails, or phone numbers.</li>
<li>No location, contacts, or microphone access.</li>
<li>No analytics, advertising identifiers, or cross-app tracking.</li>
<li>No selling or sharing of your data &mdash; there is nothing to sell.</li>
</ul>

<h2>6. Purchases</h2>
<p>Catchstack may offer an optional Pro subscription through Apple's App Store. All purchases are processed and managed by <strong>Apple</strong> &mdash; we never see your name or payment details. Subscription status is provided to the app by Apple's StoreKit.</p>

<h2>7. Children</h2>
<p>Catchstack is suitable for a general audience and collects no personal information from anyone, including children.</p>

<h2>8. Your control</h2>
<p>Because everything is stored locally, deleting the app removes all stored data from your device.</p>

<h2>9. Changes</h2>
<p>If this policy changes, we'll update this page and the date above.</p>

<h2>10. Contact</h2>
<p>Questions? Email <a href="mailto:{SUPPORT}">{SUPPORT}</a>.</p>
""")

support = page("Catchstack — Support", f"""
<h1>Catch<b>stack</b> — Support</h1>
<p class="updated">{UP}</p>
<div class="callout"><p>Need help or have feedback? Email <a href="mailto:{SUPPORT}">{SUPPORT}</a> &mdash; we read every message.</p></div>

<h2>What is Catchstack?</h2>
<p>Catchstack is a private record for your card collection. Track the cards you own, watch their reference value over time, and keep an organized, exportable inventory &mdash; all on your device.</p>

<h2>Frequently asked</h2>
<ul>
<li><strong>Where is my collection saved?</strong> Entirely on your device. There are no servers and no account system.</li>
<li><strong>Will I lose my collection if I delete the app?</strong> Local data is removed when you delete the app. iOS may restore it via your iCloud device backup when you reinstall or switch phones.</li>
<li><strong>Where do the prices come from?</strong> Public, ungraded reference values from pokemontcg.io (Pokémon) and Scryfall (Magic: The Gathering). They are reference figures, not an appraisal or a guarantee of value.</li>
<li><strong>Does Catchstack price by PSA grade?</strong> No. This build shows public <strong>ungraded</strong> reference values only. Grade-specific (PSA / BGS / CGC) pricing is on the roadmap once a usable data source is wired.</li>
<li><strong>Does it work offline?</strong> Your collection is fully available offline. Prices and images refresh when you have a connection.</li>
<li><strong>What does Pro include?</strong> Pro removes limits and unlocks features such as CSV &amp; PDF export, advanced price alerts, and priority market-data refresh. It is billed through Apple.</li>
</ul>

<h2>Contact</h2>
<p>Email <a href="mailto:{SUPPORT}">{SUPPORT}</a>. We aim to reply within a few business days.</p>
""")

terms = page("Catchstack — Terms of Use", f"""
<h1>Catch<b>stack</b> — Terms of Use</h1>
<p class="updated">{UP}</p>

<h2>1. Acceptance</h2>
<p>By downloading or using Catchstack ("the App"), you agree to these Terms. If you do not agree, please do not use the App.</p>

<h2>2. The App</h2>
<p>The App is a personal record-keeping tool for trading-card collections. Reference values shown in the App are public, <strong>ungraded</strong> market figures aggregated from pokemontcg.io, Scryfall, and TCGplayer. They are provided "as is" for information only and are <strong>not an appraisal, an offer, or a guarantee of value</strong>.</p>

<h2>3. Not financial advice</h2>
<p>Signals and price information in the App are derived from public market data and are provided for information only. Nothing in the App is financial, investment, or trading advice.</p>

<h2>4. Purchases</h2>
<p>The App may offer an optional Pro subscription through Apple's App Store. All purchases are processed and managed by Apple. Subscriptions, where offered, auto-renew until cancelled; manage or cancel anytime in your Apple ID settings. Apple's standard <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/">EULA</a> applies to licensed content.</p>

<h2>5. Acceptable use</h2>
<p>Don't attempt to reverse-engineer, resell, or redistribute the App or its content except as permitted by law.</p>

<h2>6. Third-party content &amp; trademarks</h2>
<p>Card data and images are provided by pokemontcg.io and Scryfall. All product names, card images, and trademarks are the property of their respective owners. Catchstack is <strong>not affiliated with, endorsed by, or sponsored by</strong> Nintendo, The Pokémon Company, Wizards of the Coast, PSA, or TCGplayer.</p>

<h2>7. Disclaimer &amp; liability</h2>
<p>The App is provided without warranties of any kind. To the maximum extent permitted by law, we are not liable for any damages arising from use of the App, including decisions made based on reference values shown in it.</p>

<h2>8. Changes</h2>
<p>We may update these Terms; continued use after changes means you accept them.</p>

<h2>9. Contact</h2>
<p>Email <a href="mailto:{SUPPORT}">{SUPPORT}</a>.</p>
""")

index = page("Catchstack", f"""
<h1>Catch<b>stack</b></h1>
<p class="updated">A private record for your graded card collection.</p>
<p>Track the cards you own, watch their reference value over time, and keep an organized, exportable inventory &mdash; all on your device. Reference prices are public, ungraded figures from pokemontcg.io and Scryfall, not an appraisal.</p>
<p style="margin-top:24px"><a href="/privacy">Privacy Policy</a> &middot; <a href="/support">Support</a> &middot; <a href="/terms">Terms of Use</a></p>
""")

REDIRECTS = "/privacy.html /privacy 301\n/support.html /support 301\n/terms.html /terms 301\n/index.html / 301\n"
HEADERS = (
    "/*\n"
    "  X-Content-Type-Options: nosniff\n"
    "  X-Frame-Options: DENY\n"
    "  Referrer-Policy: strict-origin-when-cross-origin\n"
    "  Permissions-Policy: camera=(), microphone=(), geolocation=()\n"
    "  Strict-Transport-Security: max-age=31536000; includeSubDomains\n"
    "  Content-Security-Policy: default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'\n"
)

for name, content in [("privacy.html", privacy), ("support.html", support), ("terms.html", terms),
                      ("index.html", index), ("_redirects", REDIRECTS), ("_headers", HEADERS)]:
    (OUT / name).write_text(content, encoding="utf-8")
print("wrote Catchstack legal site:", sorted(p.name for p in OUT.iterdir()))
