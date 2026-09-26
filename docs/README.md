# 萬象契 · Mythseal documentation library

Browse by purpose, then open the document that owns the detail. This index
organizes titles and tags; it does not duplicate the operational handover or
change release status. Last organized: **2026-09-26**.

## Start here

| Document | Purpose | Tags |
| --- | --- | --- |
| [Project overview](../README.md) | Play, run locally and find the code | `guide` |
| [Agent handover](HANDOVER.md) | Architecture, infrastructure, local setup and joining another agent | `guide` `operations` |
| [Contribution guide](../CONTRIBUTING.md) | Make a focused change and choose proportionate checks | `guide` |
| [Working instructions](../AGENTS.md) | Repository conventions and preservation boundaries | `guide` |
| [Development roadmap](../ROADMAP.md) | Bounded future tasks, dependencies and acceptance criteria | `design` |

## Implemented gameplay and accounts

| Document | Owns | Tags |
| --- | --- | --- |
| [Battle rules and prototype choices](DESIGN.md) | Four-round combat, hidden information and original-game ambiguities | `implemented` `gameplay` |
| [Local progression and economy](PROGRESSION.md) | Travel, daily rewards, packs and NPC market rules | `implemented` `gameplay` |
| [Backpack, exact card copies and decks](BACKPACK.md) | Per-copy XP/history, protection and saved decks | `implemented` `gameplay` |
| [Classical character expansion](CHARACTERS.md) | Character catalogue and the v0.3 expansion design | `implemented` `content` |
| [Accounts and private journey backups](ACCOUNTS.md) | Player sign-in, explicit backup/restore and its trust boundary | `implemented` `accounts` |

`implemented` means the document describes repository behavior. It does not
certify live health today. Feature-introduction versions such as v0.3/v0.4 remain
useful history; [HOSTING.md](HOSTING.md) owns actual deployments.

## Infrastructure and evidence

| Document | Owns | Tags |
| --- | --- | --- |
| [Developer connections and toolkits](CONNECTIONS.md) | Resource identities, owner login, credential locations and checked access | `operations` `infrastructure` |
| [Hosting, authenticated releases and rollback](HOSTING.md) | Public boundary, deployment procedure and exact release receipts | `operations` `evidence` |
| [Validation record](VALIDATION.md) | What was checked, when, and which environment it covered | `evidence` |
| [Account API contract](../server/README.md) | Routes, session cookies, bindings and database access boundary | `implemented` `accounts` |
| [Supabase developer setup](../supabase/README.md) | Project selection, applied migrations and disposable SQL tests | `operations` `infrastructure` |
| [Local contract toolkit](../contracts/README.md) | Local Forge fixture and compiler setup; not a deployed game contract | `guide` `tooling` |

Access, configuration, local tests, CI, deployment and player-visible behavior
are distinct evidence. Keep their dates and limitations with the owning record.

## Architecture and future work

| Document | Owns | Tags |
| --- | --- | --- |
| [Technical direction](TECHNICAL-PLAN.md) | Selected architecture and implementation sequence | `design` `architecture` |
| [Backend and data boundaries](BACKEND-STACK.md) | Current account slice plus proposed authoritative economy | `design` `backend` |
| [NFT, wallet and archive stack](NFT-STACK.md) | Candidate chain, recovery, ownership indexing and IPFS | `design` `blockchain` |
| [Limited editions and transferable card identity](BLOCKCHAIN-DESIGN.md) | Supply caps, exact-copy XP and transfer semantics | `design` `blockchain` |
| [iOS and Android release plan](MOBILE-RELEASE.md) | Native packaging, device checks and release-specific decisions | `design` `mobile` |
| [Artwork, animation and content releases](CONTENT-RELEASE-PIPELINE.md) | Art versions, derivatives, animation and compatible release bundles | `design` `content` |

`design` identifies proposals or a mixture of implemented boundaries and future
work, not a claim that the whole stack exists. Use the handover and roadmap to
choose the next task; recheck dated platform or provider assumptions when needed.

## Art provenance and historical research

| Document | Owns | Tags |
| --- | --- | --- |
| [Original portraits and travel-map artwork](ART.md) | Original portrait-atlas and travel-map prompts and provenance | `provenance` `content` |
| [Classical portrait atlas](ART-CLASSICS.md) | Classical expansion artwork and atlas layout | `provenance` `content` |
| [Classical literary and historical sources](CLASSICAL-SOURCES.md) | Character inspiration and source notes | `provenance` `research` |
| [Mythseal naming decision and history](NAMING.md) | Selected brand and the earlier shortlist | `historical` `research` |
| [Original 神魔令 research](RESEARCH.md) | Bounded source search and known/unknown mechanics | `historical` `research` |
| [Domain-check snapshot](DOMAIN-CHECKS.json) | Archived naming-research data, not current domain availability | `historical` `data` |

## Keep the library organized

- Add a useful title and tags here when adding a document; link to the existing
  source of detail before creating another guide with the same responsibility.
- Keep dated receipts and original research intact. Similar subjects do not
  establish duplicate content, and ignored files are not automatically disposable.
- Keep stable document paths so GitHub links and agent handoffs continue to work.
  If a later move is needed, update inbound links and retain a clear old entry.
- Keep generated output in its existing ignored directories. Browser source,
  assets, launchers and applied migration names have functional path dependencies.
  [The handover code map](HANDOVER.md#code-ownership-map) explains those boundaries.

These are classification tags, not Git release tags. New releases still follow
the [hosting procedure](HOSTING.md#build-and-deploy).
