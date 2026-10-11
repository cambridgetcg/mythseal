/** Test support only (not a test file): a valid local profile just under the 4 MiB
 * backup envelope, so a small additional field pushes it over. */
import { SNAPSHOT_FORMAT, SNAPSHOT_VERSION, MAX_SNAPSHOT_BYTES } from '../../cloud-save.mjs';
import { syncCollection } from '../../collection.mjs';

// Same byte accounting as cloud-save's bounded JSON: compact JSON plus one JSONB
// separator space after every object colon and every container comma.
const jsonbText = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
  : Array.isArray(value) ? `[${value.map(jsonbText).join(', ')}]`
    : `{${Object.keys(value).map(key => `${JSON.stringify(key)}: ${jsonbText(value[key])}`).join(', ')}}`;
export const envelopeBytes = profile => Buffer.byteLength(jsonbText({ format: SNAPSHOT_FORMAT, version: SNAPSHOT_VERSION, profile }));

/** Returns a canonical profile whose envelope is MAX_SNAPSHOT_BYTES - headroom. */
export function nearEnvelopeProfile(base, { headroom = 40, cardId = 'qingxiao' } = {}) {
  const template = base.instances.find(instance => instance.cardId === cardId);
  let serial = base.instances.reduce((max, instance) => Math.max(max, Number(instance.uid.slice(5))), 0);
  const copyWith = origin => ({ ...template, uid: `card-${String(++serial).padStart(6, '0')}`, origin, locked: false, battles: 0, wins: 0 });
  // Origins keep at most 80 code units: CJK gives 3 bytes each, ASCII 1, so any 1..240 byte origin exists.
  const originOf = bytes => '字'.repeat(Math.floor(bytes / 3)) + 'a'.repeat(bytes % 3);
  const build = extra => syncCollection({ ...base, instances: [...base.instances, ...extra] });
  const target = MAX_SNAPSHOT_BYTES - headroom;
  const empty = envelopeBytes(build([]));
  const one = envelopeBytes(build([copyWith(originOf(240))]));
  serial -= 1;
  const bulk = Math.floor((target - empty - 2000) / (one - empty));
  const extra = Array.from({ length: bulk }, () => copyWith(originOf(240)));
  let profile = build(extra);
  const minimum = envelopeBytes(build([...extra, copyWith('a')])) - envelopeBytes(profile);
  serial -= 1;
  const maximum = minimum + 239;
  for (let remaining = target - envelopeBytes(profile); remaining > 0; remaining = target - envelopeBytes(profile)) {
    if (remaining < minimum) throw Error(`Envelope fixture overshot by ${minimum - remaining} bytes`);
    const size = remaining <= maximum ? remaining : Math.min(maximum, remaining - minimum);
    extra.push(copyWith(originOf(size - minimum + 1)));
    profile = build(extra);
  }
  if (envelopeBytes(profile) !== target) throw Error(`Envelope fixture is ${envelopeBytes(profile)} bytes, expected ${target}`);
  return profile;
}
