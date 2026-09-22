#!/usr/bin/env node
/** Offline analysis: stdout only, no production profile or network access. */
import { analyzeDrops, simulateDrops, compareSimulation } from './wx01-drop-model.mjs';
const args = process.argv.slice(2), options = { packs: 1_000_000, seed: 20260922 }, allowed = new Set(['--json', '--packs', '--seed']);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw Error(`Unknown option: ${args[i]}`);
  if (args[i] !== '--json') { const key = args[i].slice(2); if (!args[i + 1] || !/^\d+$/.test(args[i + 1])) throw Error(`${args[i]} requires an unsigned integer`); options[key] = Number(args[++i]); }
}
const analysis = analyzeDrops(), simulation = simulateDrops(options), comparison = compareSimulation(simulation, analysis);
if (args.includes('--json')) console.log(JSON.stringify({ analysis, simulation, comparison }, null, 2));
else {
  console.log(`${analysis.candidate}\n${analysis.characterCount} characters / ${analysis.printCount} prints; ${analysis.price} coins / ${analysis.cardsPerPack} cards`);
  for (const mode of Object.keys(analysis.natural.modes)) console.log(`${mode.padEnd(9)} natural ${(analysis.natural.modes[mode] * 100).toFixed(4)}% | stationary protected ${(analysis.protected.modes[mode] * 100).toFixed(4)}%`);
  console.log(`Protected average rarity: ${Object.entries(analysis.protected.rarities).map(([r, p]) => `${r} ${(100 * p.mean).toFixed(4)}%`).join(', ')}`);
  console.log(`Expected Lv1 resale ${analysis.protected.expectedResale.toFixed(2)}; net cost ${analysis.protected.expectedNetCost.toFixed(2)}; first daily net ${analysis.protected.expectedFirstDailyNetCost.toFixed(2)} (assumes all copies legally sellable)`);
  for (const [name, event] of Object.entries(analysis.events)) console.log(`${name}: ${(100 * event.probabilityPerPack).toFixed(4)}%/pack; 50% by ${event.packs50}, 95% by ${event.packs95} packs`);
  console.log(`${comparison.ok ? 'PASS' : 'FAIL'} ${simulation.packs.toLocaleString('en-GB')} seeded packs; ${comparison.checks.length} analytic comparisons (${comparison.allowance}).`);
  if (!comparison.ok) console.log(JSON.stringify(comparison.checks.filter(c => !c.pass), null, 2));
}
if (!comparison.ok) process.exitCode = 1;
