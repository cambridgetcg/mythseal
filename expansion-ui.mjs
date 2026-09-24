/** Pure campaign/activity presentation. The app owns commits, receipts and navigation. */
import { getCard, validateDeck } from './engine.mjs';
import { getActiveDeck } from './collection.mjs';
import { getPrinting } from './printing-catalogue.mjs';
import { getExpansionSummary } from './progression.mjs';
import { CAMPAIGN_NODES, CAMPAIGN_WORLDS, CAMPAIGN_TITLE } from './campaign-content.mjs';
import { FIRE_MOUNTAIN } from './activity-content.mjs';

const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const amount = value => Number(value || 0).toLocaleString('zh-Hant');
const money = reward => `${amount(reward.coins)} 金幣 · ${amount(reward.dust)} 靈砂 · ${amount(reward.xp)} 修為`;
const module = (id, label, body, extra = '') => `<section class="expansion-module" data-viewport-module="${id}" data-viewport-label="${label}" ${extra}>${body}</section>`;
const title = (kicker, name, copy = '') => `<header class="expansion-heading"><div class="eyebrow">${kicker}</div><h2>${name}</h2>${copy ? `<p>${copy}</p>` : ''}</header>`;
const list = (id, rows, className = '') => `<div class="expansion-list ${className}" data-viewport-list="${id}">${rows.join('')}</div>`;
const cardName = printId => getCard(getPrinting(printId).cardId).name;
const sourceName = source => source === 'fire-mountain' ? '火焰山活動' : source === 'westward-echo' ? '六卷同行之禮' : CAMPAIGN_NODES.find(node => node.id === source)?.name || '旅途所得';
const markLabels = [['win', '踏破此境'], ['life', '勝利時生命 ≥6'], ['pills', '勝利時仙丹 ≥2']];
const marks = value => markLabels.map(([id, label]) => `<span class="${value?.[id] ? 'is-earned' : ''}"><i aria-hidden="true">${value?.[id] ? '✓' : '◇'}</i>${label}</span>`).join('');

export function campaignMarksMarkup(profile, nodeId) {
  const node = CAMPAIGN_NODES.find(item => item.id === nodeId);
  if (!node) return '';
  const summary = getExpansionSummary(profile);
  return `<section class="campaign-marks" aria-label="此境異聞"><h3>此境異聞</h3><div class="campaign-mark-list">${marks(summary.mastery[nodeId])}</div><p>可在不同勝局分別達成；只需獲勝便可續行。異聞不改變戰卡能力。</p></section>`;
}

export function activityEntryMarkup(profile) {
  const { activity } = getExpansionSummary(profile), run = activity.run;
  return `<div class="activity-entry" style="--activity-map:url('${FIRE_MOUNTAIN.map}')"><span class="activity-seal" aria-hidden="true">風</span><div><div class="eyebrow">常設活動 · 三戰同行</div><h2>${FIRE_MOUNTAIN.name}</h2><p>${run ? `第 ${run.stage + 1} / 3 戰 · ${run.phase === 'supply' ? '在此補給，下一程未開始' : '對局已保存'}` : activity.unlocked ? '自己的戰卡，或借一副同行牌。留丹、補給，再過一座山。' : '先踏破霧隱渡口，即可借牌挑戰。'}</p><button type="button" class="primary" data-action="activity-open">${run ? '查看這趟山行' : '查看三連戰'} <span aria-hidden="true">↗</span></button></div></div>`;
}

export function activityMarkup(profile, { route = 'owned', cardMarkup, preparation = false } = {}) {
  const summary = getExpansionSummary(profile), activity = summary.activity, run = activity.run;
  route = run?.route || (route === 'loaner' ? 'loaner' : 'owned');
  const active = getActiveDeck(profile), owned = (active?.instanceIds || []).map(uid => profile.instances.find(copy => copy.uid === uid)).filter(Boolean);
  const deck = run?.deck || (route === 'loaner' ? FIRE_MOUNTAIN.loanerDeck : owned.map(copy => copy.cardId));
  const validation = validateDeck(deck), blocked = !activity.unlocked || Boolean(profile.pending || run) || !validation.valid;
  const roster = deck.map((id, index) => {
    const copy = run ? profile.instances.find(item => item.uid === run.cardInstances[id]) : route === 'owned' ? owned[index] : null;
    const printId = run?.cardPrints[id] || copy?.printId;
    return `<article class="activity-roster-card" data-viewport-id="${copy?.uid || id}">${cardMarkup(getCard(id), { ...(printId ? { printId } : {}) })}<b>${getCard(id).name}</b><small>${route === 'loaner' ? '借用 · 基礎能力' : `#${safe(copy?.uid || '')} · 活動使用基礎能力`}</small></article>`;
  });
  const next = FIRE_MOUNTAIN.stages[run?.phase === 'supply' ? run.stage + 1 : run?.stage || 0];
  const overview = `<div class="activity-arrival" style="--activity-map:url('${FIRE_MOUNTAIN.map}')"><span class="activity-seal" aria-hidden="true">風</span><h3>${FIRE_MOUNTAIN.subtitle}</h3><p>${FIRE_MOUNTAIN.description}</p></div><ol class="activity-stage-line">${FIRE_MOUNTAIN.stages.map((stage, index) => `<li class="${run && index < run.stage + Number(run.phase === 'supply') ? 'is-earned' : ''}"><span>${index + 1}</span>${getCard(stage.bossId).name}</li>`).join('')}</ol><div class="activity-overview-actions">${run ? `<p class="activity-banked">已存下 ${money(run.banked)}<br>保存離開不會失去已取得的獎勵。</p><button type="button" class="primary" data-action="activity-resume">${run.phase === 'supply' ? '選擇補給，繼續山行' : '繼續已保存的對局'} →</button>` : `<p>${activity.unlocked ? '不收門票，不限次數。每戰四回合；輸或和局結束本次山行。' : '完成霧隱渡口後開放；可先翻看借用牌組與獎勵。'}</p><button type="button" class="primary" data-action="activity-route" data-id="${route}">選擇同行牌組 →</button>`}</div>`;
  const prep = `<div class="activity-route-tabs" role="group" aria-label="選擇活動牌組">${[['owned', '我的出戰牌組'], ['loaner', '借用同行牌']].map(([id, label]) => `<button type="button" data-action="activity-route" data-id="${id}" aria-pressed="${route === id}" ${run ? 'disabled' : ''}>${label}</button>`).join('')}</div><div class="expansion-subheading"><h3>${route === 'loaner' ? '借風同行陣' : safe(active?.name || '尚未選擇牌組')}</h3><span>${deck.length} 張 · ${validation.stars || 0} 星</span></div><p class="expansion-small">${route === 'loaner' ? '臨時借用，不會入藏或累積卡牌 EXP。' : '原卡編號與畫作保留；活動統一使用基礎能力。'} 開始後三戰固定此牌組。</p>${list('activity-roster', roster, 'activity-roster')}<div class="expansion-module-footer">${!validation.valid ? '<p>先儲存並啟用八位不同角色、總星數不超過 25 的牌組，或改借同行牌。</p>' : ''}<button type="button" class="primary" data-action="activity-start" data-id="${route}" ${blocked ? 'disabled' : ''}>${run ? '本次牌組已固定' : profile.pending ? '先完成目前對局' : !activity.unlocked ? '先踏破霧隱渡口' : '以此陣出發 · 第一戰'} →</button></div>`;
  const rules = list('activity-rules', [
    ['一路帶着的資源', '起始 12 生命、12 仙丹；每位守關者各自以 12／12 迎戰。己方勝後沿用生命，再回復 2，仙丹至少補至 8；上限皆為 12。'],
    ['戰間只選一項', '再選回春 +4 生命，或養息 +4 仙丹。會先顯示補給後的數字；已滿的選項不能選。兩者皆滿時直接繼續。'],
    ['保存後仍是這趟山行', '己方牌組固定，下一戰重新抽四張。途中可保存離開；失敗或放棄只結束本次山行，先前已存下的戰利品仍保留。'],
    ['同行卡的歷練', '自有卡只讓實際出牌的原卡得 EXP：勝利 +12，和局／失敗 +8；放棄不加 EXP。借牌沒有永久卡牌 EXP，兩種路線獎勵相同。'],
  ].map(([heading, text], index) => `<article class="expansion-note" data-viewport-id="rule-${index}"><h3>${heading}</h3><p>${text}</p></article>`));
  const rewards = list('activity-rewards', [
    `<article class="expansion-note" data-viewport-id="stage"><h3>每戰勝利，當場存下</h3><p>60 金幣 · 3 靈砂 · 30 修為，另得一次守關贈禮。和局／失敗不抽贈禮，先前所得仍保留。</p></article>`,
    `<article class="expansion-note" data-viewport-id="odds"><h3>守關贈禮 · 自然機率</h3><dl class="activity-odds"><div><dt>額外 2 靈砂</dt><dd>80%</dd></div><div><dt>額外 30 金幣</dt><dd>15%</dd></div><div><dt>當關守關者本畫 BASE</dt><dd>5%</dd></div></dl><p>下一關贈畫：${cardName(next.dropPrintId)} · 本畫 BASE</p></article>`,
    `<article class="expansion-note" data-viewport-id="guarantee"><h3>每二十勝，必有相逢</h3><p>連續 19 場活動勝利未得本畫，第 20 場必得當關本畫；取得後歸零。保底使長期本畫率約 7.79%，不只 5%。</p><p class="gold">已 ${activity.dry} / 19 勝未遇本畫<br>最多再勝 ${activity.guaranteeIn} 場，必得本畫。</p></article>`,
    `<article class="expansion-note" data-viewport-id="milestones"><h3>走完三戰的約定</h3><p>首次全通：牛魔王本畫與常設通關記錄。每週首次、第 3 次全通各得一張西行秘匣券；累計 5 次全通獲稱號「借得東風」。</p><p>本週 ${activity.weekly.clears} 次 · 已得 ${activity.weekly.claimed.length} / 2 張券<br>累計 ${activity.clears} 次全通。跨週山行計入開始的那一週。</p><button type="button" class="text-button" data-action="expansion-rewards">查看旅途藏禮 →</button></article>`,
  ]);
  return `<section class="expansion-surface expansion-panel activity-panel" data-viewport-surface="activity">${title('常設活動 · 第一景', FIRE_MOUNTAIN.name)}${module('overview', '山行', overview)}${module('preparation', '牌組', prep, preparation ? 'data-viewport-default="true"' : '')}${module('rules', '行前須知', rules)}${module('rewards', '戰利品', rewards)}</section>`;
}

export function activitySupplyMarkup(profile) {
  const { activity } = getExpansionSummary(profile), run = activity.run;
  if (!run || run.phase !== 'supply') return `<section class="expansion-surface expansion-panel" data-viewport-surface="activity-supply">${title('山行進度', '此刻沒有待選補給')}<p>重新查看已保存的山行，便可找到下一步。</p><button class="primary" data-action="activity-open">返回活動 →</button></section>`;
  const next = FIRE_MOUNTAIN.stages[run.stage + 1], full = run.hp === 12 && run.pills === 12;
  const supply = (id, name, hp, pills, disabled) => `<button type="button" class="activity-supply-choice" data-action="activity-supply" data-id="${id}" data-run="${safe(run.id)}" data-stage="${run.stage}" ${disabled ? 'disabled' : ''}><b>${name}</b><span>生命 ${run.hp} → ${hp} / 12</span><span>仙丹 ${run.pills} → ${pills} / 12</span><small>${disabled ? '已滿，毋須此項補給' : `選定後進入第 ${run.stage + 2} 戰 →`}</small></button>`;
  const choices = `<div class="activity-supply-status"><span>第 ${run.stage + 1} 戰已勝</span><b>生命 ${run.hp} / 12 · 仙丹 ${run.pills} / 12</b><small>已計入勝後回復：生命 +2，仙丹至少補至 8。</small></div><div class="activity-supply-options">${full ? `<button type="button" class="activity-supply-choice" data-action="activity-supply" data-id="none" data-run="${safe(run.id)}" data-stage="${run.stage}"><b>整備已足，繼續</b><span>生命 12 / 12 · 仙丹 12 / 12</span><small>進入第 ${run.stage + 2} 戰 →</small></button>` : supply('life', '回春 · 最多 +4 生命', Math.min(12, run.hp + 4), run.pills, run.hp === 12) + supply('pills', '養息 · 最多 +4 仙丹', run.hp, Math.min(12, run.pills + 4), run.pills === 12)}</div>`;
  const journal = list('activity-supply-journal', [`<article class="activity-next" data-viewport-id="next"><span>下一關 · ${next.name}</span><p>${next.tactic}</p><small>當關可能贈畫：${cardName(next.dropPrintId)} · 本畫 BASE</small></article>`, `<article class="expansion-note" data-viewport-id="banked"><h3>已存下的戰利品</h3><p class="activity-banked">${money(run.banked)}</p><p>保存離開仍保留；借用牌與自有牌所得相同。結束本次山行也不會失去先前所得。</p></article>`]);
  return `<section class="expansion-surface expansion-panel activity-supply-panel" data-viewport-surface="activity-supply">${title('戰間歇息', '風來之前，補一口氣。')}${module('supply', '補給', choices)}${module('journal', '山行手記', journal)}<div class="expansion-actions"><button type="button" class="secondary" data-action="activity-save-exit">保存離開</button><button type="button" class="text-button" data-action="activity-abandon" data-run="${safe(run.id)}">結束本次山行</button></div></section>`;
}

export function ticketMarkup(profile) {
  const { tickets, grants } = getExpansionSummary(profile), receipt = Boolean(profile.wx01.receipt);
  return `<div class="expansion-ticket"><span class="expansion-ticket-seal" aria-hidden="true">券</span><div><div class="eyebrow">西行秘匣券</div><h2>${amount(tickets)} <small>張留待相逢</small></h2><p>每券開啟一匣 WX-01，不扣金幣。<br>同機率、共享十二匣保護，並得 1 西行印。</p><button type="button" class="primary" data-action="ticket-open" ${tickets < 1 || receipt ? 'disabled' : ''}>${receipt ? '先確認已揭曉的畫作' : tickets < 1 ? '尚未取得秘匣券' : '使用一張 · 開啟秘匣'} →</button><p class="expansion-small">取得券不會抽卡；使用時才計入開匣功課。券不過期。</p></div></div><div class="expansion-ticket-footer"><p>續卷每卷終章贈一券；活動每週全通 1 次與 3 次各贈一券。</p><button type="button" class="secondary" data-action="expansion-rewards">旅途藏禮${grants.length ? ` · ${grants.length} 份待領` : ''} →</button></div>`;
}

export function expansionRewardsMarkup(profile, cardMarkup) {
  const summary = getExpansionSummary(profile), receipt = Boolean(profile.wx01.receipt);
  const grants = summary.grants.map(grant => {
    const print = grant.kind === 'base' ? getPrinting(grant.printId) : null;
    return `<article class="expansion-grant" data-viewport-id="${safe(grant.id)}">${print ? `<div class="expansion-grant-art">${cardMarkup(getCard(print.cardId), { printId: print.id })}</div>` : '<span class="expansion-choice-seal" aria-hidden="true">畫</span>'}<div><span class="expansion-small">${safe(sourceName(grant.source))}</span><h3>${print ? `${getCard(print.cardId).name} · 本畫` : '西行 AA · 任選一幅'}</h3><p>${print ? '一張全新編號的原卡；不會消耗已有藏卡。' : '走完六卷留下的選擇。與舊西遊卷首勝異畫各自領取。'}</p><button type="button" class="secondary" data-action="expansion-claim" data-id="${safe(grant.id)}" ${receipt ? 'disabled' : ''}>${receipt ? '先確認目前畫作' : print ? '收入行囊 →' : '選擇異畫 →'}</button></div></article>`;
  });
  const milestoneRows = CAMPAIGN_WORLDS.map(world => {
    const nodes = CAMPAIGN_NODES.filter(node => node.worldId === world.id), complete = nodes.every(node => profile.cleared.includes(node.id));
    return `<article class="expansion-note" data-viewport-id="${world.id}"><div class="expansion-subheading"><h3>${safe(world.name)}</h3><span>${nodes.filter(node => profile.cleared.includes(node.id)).length} / 8</span></div><p>${nodes.filter(node => node.rewardCharacter).map(node => `${getCard(node.rewardCharacter).name} BASE`).join(' · ') || '六卷稱號與一份 AA 自選'}</p><p>${complete ? '✓ 本卷終章已踏破，秘匣券已存下。' : '首次踏破終章得一張秘匣券；本畫在指定章節首次勝利後存入藏禮。'}</p></article>`;
  });
  const titles = [[CAMPAIGN_TITLE.name, '踏破西行續卷全部 48 境'], ['借得東風', '火焰山累計全通 5 次']].map(([name, condition]) => `<article class="expansion-title ${summary.titles.includes(name) ? 'is-earned' : ''}" data-viewport-id="${name}"><span aria-hidden="true">${summary.titles.includes(name) ? '印' : '◇'}</span><div><h3>${name}</h3><p>${condition}</p><small>${summary.titles.includes(name) ? '已取得 · 只記錄旅途，不增加能力' : '尚未取得 · 可慢慢完成'}</small></div></article>`);
  const mastery = CAMPAIGN_NODES.map(node => `<article class="campaign-mastery-row" data-viewport-id="${node.id}"><h3>${node.name}</h3><div class="campaign-mark-list">${marks(summary.mastery[node.id])}</div></article>`);
  return `<section class="expansion-surface expansion-panel expansion-rewards-panel" data-viewport-surface="expansion-rewards">${title('把相逢收入行囊', '旅途藏禮', `${summary.grants.length} 份待領 · ${amount(summary.tickets)} 張秘匣券`)}${module('grants', '待領藏畫', `${receipt ? '<p class="expansion-notice">已有一份畫作等待確認，藏禮會原樣保留。</p><button type="button" class="text-button" data-action="pack-resume">查看已入藏畫作 →</button>' : ''}${grants.length ? list('expansion-grants', grants) : '<div class="expansion-empty"><span aria-hidden="true">禮</span><h3>此刻沒有待領藏畫</h3><p>續卷的同行者與活動贈畫，會在這裡等你親手收下。</p></div>'}`)}${module('tickets', '秘匣券', ticketMarkup(profile))}${module('milestones', '續卷約定', list('campaign-milestones', milestoneRows))}${module('mastery', '異聞', '<p class="expansion-small">三枚印記可分次累積，不必在同一局完成。通關只需獲勝。</p>' + list('campaign-mastery', mastery))}${module('titles', '旅途稱號', list('expansion-titles', titles))}</section>`;
}
