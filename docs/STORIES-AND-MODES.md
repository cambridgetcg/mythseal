# Story volumes and modes · 2026-09-22

The owner requested maps inspired by traditional Chinese stories and daily,
weekly, main-story, PvP, arena and ranked modes. They chose **maps and quests
first, with real online PvP/ranked on the roadmap**. This is local implementation,
not a deployment.

## Four playable volumes

萬象行卷 now contains four maps and 18 encounters. The original six 山海
locations keep their IDs, rewards and progression. Three new maps add four
chapters each:

| Volume | Chapters | Original game story |
| --- | --- | --- |
| 西遊 · 雲路取經 | 花果山 → 黃風嶺 → 火焰山 → 靈山雲階 | Carry a blank scripture through wind and fire; choices along the journey become its writing. |
| 封神 · 蓮火問天 | 陳塘海口 → 昆崙雲臺 → 西岐營火 → 牧野長風 | Protect a lotus flame while deciding what matters beyond a list of immortal names. |
| 白蛇 · 煙雨人間 | 西湖斷橋 → 藥香長巷 → 金山潮寺 → 雷峰暮塔 | Follow a lost paper umbrella through rain, medicine and tides to keep a promise of reunion. |

These are short original adaptations, not claims of complete literary fidelity
or chronology. Reference texts include the [Journey to the West Flaming Mountain
episode](https://zh.wikisource.org/zh/%E8%A5%BF%E9%81%8A%E8%A8%98/%E7%AC%AC060%E5%9B%9E),
the [Investiture of the Gods chapter index](https://zh.wikisource.org/zh/Portal%3A%E5%9B%BE%E4%B9%A6/%E5%B0%81%E7%A5%9E%E6%BC%94%E4%B9%89)
and the [White Lady story in 警世通言](https://ctext.org/wiki.pl?chapter=307330&if=gb&remap=gb).
The 白蛇 map draws on the broader traditional setting; not every motif or its
new ending is attributed to that one textual version. No modern adaptation art
or dialogue was copied.

All volumes can be browsed immediately. Winning **霧隱渡口 opens all three new
entrances**; each subsequent chapter requires its own previous chapter. A win
offers that volume's next chapter, a loss/draw offers retry, and a final chapter
stays in its volume. Cleared chapters show ending passages; all four clears
show 全卷已成. There is no extra item or completion payout.

Three themed legal eight-card opponent decks use the existing 24-card catalogue
and normal four-card draw. Battles retain expedition bonuses, hidden bids,
four-round rules, exact-copy XP and first-clear/daily-cache rewards. Guardian
names and passages are original writing, not new collectible cards or boss rules.
Original 山海 encounters keep their existing deck generation.

The lobby follows the browsed/current volume, with unfinished encounters taking
priority. Resuming an expedition restores its volume. Browsing changes no save
or reward. A locked-volume lobby offers the real Mist Gate preparation. Phone
layouts provide chapter buttons alongside pins. Volume/tab/map-scroll choices
are transient UI state; location, clears and pending encounters are saved.

## Modes available now

| Entry | Current behaviour |
| --- | --- |
| 主線故事 / 遊歷 | Four volumes, 18 AI encounters, story passages and expedition growth. |
| 任務手札 · 每日 | Existing login gift, three quests, training and arena chest in the shared journal. |
| 任務手札 · 每週 | Three new quests with independent progress, claims and rewards. |
| 問道擂台 | Existing AI arena, base card stats and local points/rewards; explicitly labelled AI. |
| 自由切磋 | AI practice; no direct currency/card-XP reward, but finished matches count toward match quests. |
| 好友對弈 / 真人排位 | Marked 未開放; no queue, fabricated human opponent or simulated ranked action. |

Daily quests reset at London midnight; weekly quests reset **Monday at London
00:00**, including DST. A battle counts in its settlement period, not its start
period. There is no streak or missed-day penalty.

| Weekly quest | Target | Coins / dust / hero XP |
| --- | --- | --- |
| 七日弈緣 | Finish 10 matches across practice, story and AI arena | 300 / 20 / 80 |
| 踏遍山海 | Win 5 story encounters from any volume | 350 / 25 / 100 |
| 問道五弈 | Finish 5 AI arena matches, any outcome | 250 / 15 / 70 |

Abandoned/rejected matches add no progress. Claims are explicit and once per
quest per period through the existing locked profile transaction. Claims do not
grant card XP or cards. All weekly rewards total 900 coins, 60 dust and 250 hero
XP; economy balance and repeat-play pace remain playtest work.

## Compatibility and delivery

- `shanhai.profile.v3` and profile version 3 remain. Additive `weekly` holds a
  Monday date key, three counters and its own claimed IDs. Old saves initialize
  at zero, without copying historical totals. Backward clocks cannot reopen a
  claim; this is offline handling, not trusted competitive progression.
- Story clear hydration retains chronological order and checks complete
  prerequisite chains. Valid old/new clears, pending encounters and exact card
  identities are preserved.
- Old v1 cloud snapshots without `weekly` validate unchanged; restoration adds
  zero counters. New snapshots include weekly progress/claims. Unknown or
  inconsistent fields remain rejected. Envelope version 1/database constraints
  stay unchanged; no SQL migration was applied.
- **Release client assets and account Worker together.** The live v0.5.1
  validator does not understand new weekly fields or story IDs. Old tabs should
  refresh before reading a new snapshot. Local stubs do not establish hosted
  acceptance; the next release must verify binding retention and old/new backup
  round trips using the authenticated procedure in [HOSTING.md](HOSTING.md).

`stories.mjs` owns content/decks; `progression.mjs` owns prerequisites, weekly
rollover and settlement; `adventure-ui.mjs`, `navigation-ui.mjs`, `stories.css`
and `app.mjs` own presentation; `cloud-save.mjs` owns backup compatibility.
Three original 1536×1024 PNGs live in `assets/maps/`; built-in generation prompts
and output paths are in [ART-STORIES.md](ART-STORIES.md). New art totals about
10.1 MiB and also supplies volume previews. Compressed variants and measured
phone loading remain work before mobile release. The allowlist has 32 files.

## Online mode roadmap

The owner explicitly deferred implementation. Keep AI arena playable; its local
points never become an online rating.

1. **Authoritative foundation (M2):** server-issued roster/inventory, versioned
   match state, authenticated commands and once-only results. Conceal pill/Fury
   commitments until both moves exist. Offline saves and client-supplied winners
   cannot grant online progression.
2. **好友對弈:** private create/join room, deck lock, ready state, four rounds and
   lobby return. Specify deadlines, forfeits and disconnect grace. Prove two
   independent players, hidden information, reconnect, retries and cancellation.
   Start without competitive ratings or stakes.
3. **自由配對:** queue/cancel, fair pairing, empty-queue behaviour and region/latency
   measurements. Test simultaneous joins, duplicate sessions and abandoned rooms.
   Never present an AI fallback as a human opponent.
4. **真人排位:** verified result ledger, explicit placement/rating policy, seasons
   and server rankings. Select a rating algorithm with play data; require one
   update per match, reproducible history, disconnect policy and abuse checks.
   Existing loss-granting AI points remain separate.

After map playtests, candidates include a daily fixed-deck puzzle, a weekly
themed challenge and one distinctive guardian rule. These are proposals.
Physical iOS/Android lifecycle, text scaling and art delivery remain in
[MOBILE-RELEASE.md](MOBILE-RELEASE.md).
