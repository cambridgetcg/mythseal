# 萬象契 · Mythseal naming decision and history

Decision update: **2026-09-21**. The owner selected **萬象契 / Mythseal**, the private GitHub repository was renamed to `cambridgetcg/mythseal`, and the owner reports acquiring **`mythseal.com`**. Its Cloudflare zone has been verified active. The configured publishing target is an assets-only apex site with a separate `www` redirect; live deployment remains pending the checks recorded in [HOSTING.md](HOSTING.md).

The local workspace remains `/Users/macair/Games/shanhai-duel`, and existing `shanhai.*` save namespaces remain unchanged for compatibility. This brand/domain decision is not trademark clearance. The research below is retained as a **dated pre-purchase snapshot**, not current domain availability.

## Original shortlist — before domain acquisition

| Original priority | Chinese / English | Why it fits | Historical registry observation on 2026-09-21 |
| --- | --- | --- | --- |
| **1** | **萬象契 · Mythseal** | Short international name; a seal suggests a collectible with identity and history. 萬象 leaves room for Wukong, Three Kingdoms, literary figures and original characters together. | `mythseal.com` — registry returned HTTP 404, no registration record found at check time. |
| **2** | **山海契 · Shanhai Oath** | Closest to the current atmosphere. The oath is the bond between a player and a card that travels and grows. | `shanhaioath.com` — registry returned HTTP 404, no registration record found at check time. |
| **3** | **千古契 · Oathscroll** | Emphasizes figures stepping out of classical books and histories, with a scroll-like collectible identity. | `oathscroll.com` is registered. `playoathscroll.com` returned HTTP 404, no registration record found at check time. |

The original creative preference was **萬象契 / Mythseal**, now selected by the owner. It is compact, flexible across the planned roster and suitable for an app icon, card seal and expansion name. Pronunciation/spelling testing with English-speaking players remains useful; the “th” sound may be less comfortable for some audiences. This is design judgment, not evidence of market demand.

Selected brand line and archived alternatives:

- **萬象契 · Mythseal** — 一張卡，一段傳說。
- **山海契 · Shanhai Oath** — 與神話同行，讓歷練留名。
- **千古契 · Oathscroll** — 千古人物，落子成篇。

An app-store subtitle could describe the product plainly, such as “Mythic Card Duels” / “東方神話策略卡牌”. Final title/subtitle lengths and localization need checking in the target stores before release.

## Findings that change the naming decision

At the research check, the former working title **山海弈** appeared as the title of another developer's eight-player mythology auto-battler on [TapTap](https://www.taptap.cn/app/940623). This helped motivate choosing a distinct release brand; old project notes and save identifiers can retain the historical name without remaining the current public title.

The broader Shanhai category is also crowded: [Shanhai Bestiary: Card Duel](https://apps.apple.com/us/app/shanhai-bestiary-card-duel/id6805338907) is listed on the App Store, and [山海靈契](https://www.taptap.cn/app/937364?os=android) is another mythology collection title on TapTap. This favors a distinctive paired Chinese/English identity over relying on “Shanhai” alone. It does not establish a legal conflict for every Shanhai-based name.

Bounded searches used the exact English candidates, their compact spellings and Chinese candidates with game terms. They did not establish a clearly matching full game title for the three proposed Chinese/English pairs. These checks are incomplete: unindexed games, regional listings, domains, company names and marks may still overlap. “Oathscroll” also appears as descriptive language in tabletop/fantasy material, so the word itself should not be treated as newly coined.

## Archived domain evidence

The unchanged machine-readable record is [DOMAIN-CHECKS.json](DOMAIN-CHECKS.json). Its main timestamp is **2026-09-21 18:13:19 UTC**; the `playoathscroll.com` follow-up was **18:17:39 UTC**. Both predate the later acquisition update above. Queries used the .com registry's RDAP service; no registrant contact data was collected. These URLs are the original query endpoints and may now return different results:

- [Registry query: mythseal.com](https://rdap.verisign.com/com/v1/domain/mythseal.com)
- [Registry query: shanhaioath.com](https://rdap.verisign.com/com/v1/domain/shanhaioath.com)
- [Registry query: oathscroll.com](https://rdap.verisign.com/com/v1/domain/oathscroll.com)
- [Registry query: playoathscroll.com](https://rdap.verisign.com/com/v1/domain/playoathscroll.com)

HTTP 404 meant the registry did not return a registration record **at that check time**. It was not a registrar quote, guaranteed availability, reservation or trademark clearance. The JSON's statement that no domain had been purchased belongs to that earlier research run. It is preserved as evidence rather than rewritten to describe the later owner purchase and active Cloudflare zone. No current availability claim is made for the archived alternatives.

## Follow-through

1. Complete the v0.4.1 visible-title/build metadata update and verify existing saves still load. The repository rename is already complete; renaming the local directory or storage keys is unnecessary.
2. Verify the authorized apex hosting and `www` redirect, then record DNS/TLS/HTTP and asset checks in HOSTING.md. An active zone alone is not evidence that the game is serving.
3. Test pronunciation, spelling, icon legibility and card-back typography in both languages.
4. Check intended app stores, relevant trademark registries, company names and social handles before native distribution. Select final store identifiers without implying that the domain settled those questions.
5. Confirm registrar renewal/recovery details in the owner's account and plan any future `cards` or `support` subdomains when their services exist. No further domain purchase is proposed here.
