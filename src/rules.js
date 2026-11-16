// =============================================================================
// RULE-BASED MATCHING ENGINE
// -----------------------------------------------------------------------------
// Every rule is an explicit IF THEN statement (see Chapter 1, Theoretical
// Framework). There are three rule sets:
//
//   1. ELIGIBILITY rules (hard rules) : IF a condition fails THEN the pet is
//      not recommended at all (e.g. adopter has children, pet is not good with kids).
//   2. COMPATIBILITY rules (soft rules): IF a condition holds THEN points are
//      added or subtracted from a base score of 50. The final score (0 to 100)
//      ranks the recommendations.
//   3. READINESS rules: used by shelter staff: IF a rescued animal satisfies all
//      of them THEN it may be published as "available for adoption".
//
// Every fired rule produces a human readable reason so the adopter can see WHY
// a pet was recommended (transparency → trust, per Vorm & Combs 2022; Wanner et al. 2022).
// =============================================================================

const LEVEL = { low: 0, moderate: 1, medium: 1, high: 2 };
const BASE_SCORE = 50;

const label = {
  species: { dog: 'dog', cat: 'cat' },
  size: { small: 'small', medium: 'medium sized', large: 'large' },
  energy: { low: 'low', moderate: 'moderate', high: 'high' },
};

function ageGroup(pet) {
  const m = Number(pet.ageMonths) || 0;
  if (m < 12) return 'young';
  const seniorAt = pet.species === 'cat' ? 120 : 84; // cats 10y+, dogs 7y+
  return m >= seniorAt ? 'senior' : 'adult';
}

const has = (pet, tag) => Array.isArray(pet.temperament) && pet.temperament.includes(tag);
const ownsDogs = (a) => a.otherPets === 'dogs' || a.otherPets === 'both';
const ownsCats = (a) => a.otherPets === 'cats' || a.otherPets === 'both';

// -----------------------------------------------------------------------------
// 1. Eligibility (hard) rules
// -----------------------------------------------------------------------------
const ELIGIBILITY_RULES = [
  {
    id: 'E1',
    text: 'IF the pet is not marked "available for adoption" THEN it is not recommended.',
    passes: (a, p) => p.status === 'available',
    reason: () => 'Not yet available for adoption',
  },
  {
    id: 'E2',
    text: 'IF the adopter prefers a specific species (dog or cat) THEN only pets of that species are recommended.',
    passes: (a, p) => !a.species || a.species === 'any' || a.species === p.species,
    reason: (a) => `You are looking for a ${a.species}`,
  },
  {
    id: 'E3',
    text: 'IF the household has children AND the pet is known to be not good with children THEN it is not recommended.',
    passes: (a, p) => !(a.hasChildren && p.goodWithKids === 'no'),
    reason: () => 'Not suitable for homes with children',
  },
  {
    id: 'E4',
    text: 'IF the adopter has dogs AND the pet is known to be not good with dogs THEN it is not recommended.',
    passes: (a, p) => !(ownsDogs(a) && p.goodWithDogs === 'no'),
    reason: () => 'Does not get along with dogs',
  },
  {
    id: 'E5',
    text: 'IF the adopter has cats AND the pet is known to be not good with cats THEN it is not recommended.',
    passes: (a, p) => !(ownsCats(a) && p.goodWithCats === 'no'),
    reason: () => 'Does not get along with cats',
  },
  {
    id: 'E6',
    text: 'IF the pet has special needs AND the adopter is not prepared for special needs care THEN it is not recommended.',
    passes: (a, p) => !(p.specialNeeds && !a.specialNeedsOk),
    reason: () => 'Needs a home prepared for special needs care',
  },
];

// -----------------------------------------------------------------------------
// 2. Compatibility (soft) rules: each returns null (rule not applicable) or
//    { points, reason }.
// -----------------------------------------------------------------------------
const COMPATIBILITY_RULES = [
  {
    id: 'C1',
    text: 'IF the pet\'s size matches the adopter\'s preferred size THEN +15.',
    evaluate: (a, p) => {
      if (!a.size || a.size === 'any') return null;
      return a.size === p.size
        ? { points: 15, reason: `Matches your preferred size (${p.size})` }
        : { points: -5, reason: `Not your preferred size (${p.size})` };
    },
  },
  {
    id: 'C2',
    text: 'IF the pet\'s age group (young / adult / senior) matches the adopter\'s preference THEN +10, otherwise −5.',
    evaluate: (a, p) => {
      if (!a.age || a.age === 'any') return null;
      const g = ageGroup(p);
      return a.age === g
        ? { points: 10, reason: `Matches your preferred age group (${g})` }
        : { points: -5, reason: `Not your preferred age group (${g})` };
    },
  },
  {
    id: 'C3',
    text: 'IF the adopter lives in an apartment/condo AND the pet is a large dog THEN −20; IF the pet is a cat or a small dog THEN +10.',
    evaluate: (a, p) => {
      if (a.homeType !== 'apartment') return null;
      if (p.species === 'dog' && p.size === 'large') return { points: -20, reason: 'Large dogs usually need more space than an apartment offers' };
      if (p.species === 'cat' || p.size === 'small') return { points: 10, reason: 'Well suited to apartment or condo living' };
      return null;
    },
  },
  {
    id: 'C4',
    text: 'IF the pet needs a yard AND the home has no yard THEN −20; IF the home has a yard THEN +10.',
    evaluate: (a, p) => {
      if (!p.needsYard) return null;
      return a.homeType === 'house_yard'
        ? { points: 10, reason: 'Your yard gives this pet room to run' }
        : { points: -20, reason: 'This pet needs a yard to stay happy' };
    },
  },
  {
    id: 'C5',
    text: 'IF the pet\'s energy level equals the adopter\'s activity level THEN +20; one level apart +5; two levels apart −15.',
    evaluate: (a, p) => {
      if (!a.activity) return null;
      const diff = Math.abs(LEVEL[a.activity] - LEVEL[p.energy]);
      if (diff === 0) return { points: 20, reason: `Energy level (${p.energy}) matches your lifestyle` };
      if (diff === 1) return { points: 5, reason: `Energy level (${p.energy}) is close to your lifestyle` };
      return { points: -15, reason: `Energy level (${p.energy}) differs a lot from your lifestyle` };
    },
  },
  {
    id: 'C6',
    text: 'IF the pet can tolerate being alone for as long as the adopter is usually away THEN +10, otherwise −15.',
    evaluate: (a, p) => {
      if (!a.hoursAlone) return null;
      const needed = { short: 0, medium: 1, long: 2 }[a.hoursAlone];
      const tol = LEVEL[p.aloneTolerance];
      return tol >= needed
        ? { points: 10, reason: 'Comfortable with the time you spend away from home' }
        : { points: -15, reason: 'May struggle with being alone as long as your schedule requires' };
    },
  },
  {
    id: 'C7',
    text: 'IF the household has children AND the pet is good with children THEN +15; IF not yet assessed THEN −10.',
    evaluate: (a, p) => {
      if (!a.hasChildren) return null;
      if (p.goodWithKids === 'yes') return { points: 15, reason: 'Good with children' };
      if (p.goodWithKids === 'unknown') return { points: -10, reason: 'Behaviour around children not yet assessed' };
      return null;
    },
  },
  {
    id: 'C8',
    text: 'IF the adopter has other pets AND the pet gets along with them THEN +10 each; IF not yet assessed THEN −5 each.',
    evaluate: (a, p) => {
      let points = 0; const parts = [];
      if (ownsDogs(a)) {
        if (p.goodWithDogs === 'yes') { points += 10; parts.push('gets along with dogs'); }
        else if (p.goodWithDogs === 'unknown') { points -= 5; parts.push('not yet tested with dogs'); }
      }
      if (ownsCats(a)) {
        if (p.goodWithCats === 'yes') { points += 10; parts.push('gets along with cats'); }
        else if (p.goodWithCats === 'unknown') { points -= 5; parts.push('not yet tested with cats'); }
      }
      if (!parts.length) return null;
      const r = parts.join(', ');
      return { points, reason: r.charAt(0).toUpperCase() + r.slice(1) };
    },
  },
  {
    id: 'C9',
    text: 'IF the adopter is a first time owner AND the pet is trained and not high energy THEN +10; IF the pet is untrained and high energy THEN −15. IF the adopter is experienced AND the pet needs training THEN +5.',
    evaluate: (a, p) => {
      if (a.experience === 'first') {
        if (p.training !== 'none' && p.energy !== 'high') return { points: 10, reason: 'Easy going and trained, which is great for a first time owner' };
        if (p.training === 'none' && p.energy === 'high') return { points: -15, reason: 'Untrained and high energy, which is challenging for a first time owner' };
        return null;
      }
      if (a.experience === 'experienced' && (p.training === 'none' || p.energy === 'high')) {
        return { points: 5, reason: 'Your experience suits a pet that still needs training' };
      }
      return null;
    },
  },
  {
    id: 'C10',
    text: 'IF the pet is shy AND the home is quiet (no children, no other pets) THEN +10; IF the home is busy THEN −10.',
    evaluate: (a, p) => {
      if (!has(p, 'shy')) return null;
      const busy = a.hasChildren || (a.otherPets && a.otherPets !== 'none');
      return busy
        ? { points: -10, reason: 'Shy pets may find a busy household stressful' }
        : { points: 10, reason: 'A quiet home is ideal for this shy pet' };
    },
  },
  {
    id: 'C11',
    text: 'IF the pet has special needs AND the adopter is prepared for special needs care THEN +5.',
    evaluate: (a, p) => (p.specialNeeds && a.specialNeedsOk ? { points: 5, reason: 'You are open to giving special needs care' } : null),
  },
  {
    id: 'C12',
    text: 'IF the pet is fully vaccinated AND spayed/neutered THEN +5.',
    evaluate: (a, p) => (p.vaccinated && p.neutered ? { points: 5, reason: 'Fully vaccinated and spayed/neutered' } : null),
  },
];

function matchLabel(score) {
  if (score >= 80) return 'Excellent match';
  if (score >= 65) return 'Good match';
  if (score >= 50) return 'Fair match';
  return 'Low match';
}

// Normalise raw questionnaire input into a clean adopter profile.
function normalizePreferences(input = {}) {
  const pick = (v, allowed, dflt) => (allowed.includes(v) ? v : dflt);
  return {
    species: pick(input.species, ['dog', 'cat', 'any'], 'any'),
    size: pick(input.size, ['small', 'medium', 'large', 'any'], 'any'),
    age: pick(input.age, ['young', 'adult', 'senior', 'any'], 'any'),
    homeType: pick(input.homeType, ['apartment', 'house_no_yard', 'house_yard'], 'house_no_yard'),
    hasChildren: input.hasChildren === true || input.hasChildren === 'true' || input.hasChildren === 'yes',
    otherPets: pick(input.otherPets, ['none', 'dogs', 'cats', 'both'], 'none'),
    activity: pick(input.activity, ['low', 'moderate', 'high'], 'moderate'),
    hoursAlone: pick(input.hoursAlone, ['short', 'medium', 'long'], 'medium'),
    experience: pick(input.experience, ['first', 'some', 'experienced'], 'some'),
    specialNeedsOk: input.specialNeedsOk === true || input.specialNeedsOk === 'true' || input.specialNeedsOk === 'yes',
  };
}

// Evaluate one pet against one adopter profile.
function evaluatePet(prefs, pet) {
  const failed = ELIGIBILITY_RULES.filter((r) => !r.passes(prefs, pet));
  if (failed.length) {
    return { eligible: false, excludedBy: failed.map((r) => ({ rule: r.id, reason: r.reason(prefs, pet) })) };
  }
  const reasons = [];
  let score = BASE_SCORE;
  for (const rule of COMPATIBILITY_RULES) {
    const out = rule.evaluate(prefs, pet);
    if (out && out.points !== 0) {
      score += out.points;
      reasons.push({ rule: rule.id, points: out.points, reason: out.reason });
    }
  }
  score = Math.max(0, Math.min(100, score));
  reasons.sort((x, y) => y.points - x.points);
  return { eligible: true, score, label: matchLabel(score), reasons };
}

// Rank all pets for an adopter.
function recommend(prefs, pets) {
  const results = [];
  const excluded = {};
  let excludedCount = 0;
  for (const pet of pets) {
    const ev = evaluatePet(prefs, pet);
    if (ev.eligible) {
      results.push({ pet, score: ev.score, label: ev.label, reasons: ev.reasons });
    } else if (pet.status === 'available') {
      excludedCount++;
      for (const x of ev.excludedBy) excluded[x.reason] = (excluded[x.reason] || 0) + 1;
    }
  }
  results.sort((x, y) => y.score - x.score || x.pet.name.localeCompare(y.pet.name));
  return {
    results,
    excludedCount,
    excludedReasons: Object.entries(excluded).map(([reason, count]) => ({ reason, count })),
  };
}

// -----------------------------------------------------------------------------
// 3. Readiness rules (shelter care monitoring)
// -----------------------------------------------------------------------------
const READINESS_RULES = [
  { id: 'R1', text: 'IF the health status is "healthy" THEN the pet passes the health check.', passes: (p) => p.healthStatus === 'healthy', ok: 'Health status is healthy', fail: 'Health status is not yet "healthy"' },
  { id: 'R2', text: 'IF the pet is vaccinated THEN it passes the vaccination check.', passes: (p) => !!p.vaccinated, ok: 'Vaccinated', fail: 'Not yet vaccinated' },
  { id: 'R3', text: 'IF the pet is dewormed THEN it passes the deworming check.', passes: (p) => !!p.dewormed, ok: 'Dewormed', fail: 'Not yet dewormed' },
  { id: 'R4', text: 'IF rehabilitation progress is at least 80% THEN it passes the rehabilitation check.', passes: (p) => Number(p.rehabProgress) >= 80, ok: 'Rehabilitation progress is 80% or more', fail: 'Rehabilitation progress is below 80%' },
  { id: 'R5', text: 'IF behaviour with children has been assessed THEN it passes the behaviour check.', passes: (p) => p.goodWithKids !== 'unknown', ok: 'Behaviour with children assessed', fail: 'Behaviour with children not yet assessed' },
];
const READINESS_ADVISORIES = [
  { id: 'A1', passes: (p) => !!p.neutered, text: 'Recommended: spay/neuter before release' },
];

function checkReadiness(pet) {
  const checks = READINESS_RULES.map((r) => {
    const ok = r.passes(pet);
    return { rule: r.id, ok, text: ok ? r.ok : r.fail };
  });
  const advisories = READINESS_ADVISORIES.filter((r) => !r.passes(pet)).map((r) => r.text);
  return { ready: checks.every((c) => c.ok), checks, advisories };
}

function describeRules() {
  return {
    baseScore: BASE_SCORE,
    eligibility: ELIGIBILITY_RULES.map(({ id, text }) => ({ id, text })),
    compatibility: COMPATIBILITY_RULES.map(({ id, text }) => ({ id, text })),
    readiness: READINESS_RULES.map(({ id, text }) => ({ id, text })),
    labels: [
      { min: 80, label: 'Excellent match' },
      { min: 65, label: 'Good match' },
      { min: 50, label: 'Fair match' },
      { min: 0, label: 'Low match' },
    ],
  };
}

module.exports = { normalizePreferences, evaluatePet, recommend, checkReadiness, describeRules, ageGroup };
