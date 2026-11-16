// Labels and formatting used across pages.
export const LABELS = {
  species: { dog: 'Dog', cat: 'Cat' },
  sex: { male: 'Male', female: 'Female' },
  size: { small: 'Small', medium: 'Medium', large: 'Large' },
  energy: { low: 'Low', moderate: 'Moderate', high: 'High' },
  status: { rescued: 'Rescued', rehabilitation: 'In rehabilitation', available: 'Available', adopted: 'Adopted' },
  healthStatus: { healthy: 'Healthy', recovering: 'Recovering', under_treatment: 'Under treatment', critical: 'Critical' },
  aloneTolerance: { low: 'Under 4 hours', medium: '4 to 8 hours', high: '8 hours or more' },
  training: { none: 'Not yet trained', basic: 'Basic commands', trained: 'House trained' },
  appStatus: { pending: 'Pending review', approved: 'Approved', rejected: 'Not approved', withdrawn: 'Withdrawn' },
  careType: { checkup: 'Check up', vaccination: 'Vaccination', deworming: 'Deworming', treatment: 'Treatment', surgery: 'Surgery', grooming: 'Grooming', behavior: 'Behaviour assessment', note: 'Note' },
  ageGroup: { young: 'Young', adult: 'Adult', senior: 'Senior' },
  yesNo: { yes: 'Yes', no: 'No', unknown: 'Not yet assessed' },
  role: { admin: 'Administrator', adopter: 'Adopter' },
};

export const PREF_LABELS = {
  species: { any: 'Dog or cat', dog: 'Dog', cat: 'Cat' },
  size: { any: 'Any size', small: 'Small', medium: 'Medium', large: 'Large' },
  age: { any: 'Any age', young: 'Young', adult: 'Adult', senior: 'Senior' },
  homeType: { apartment: 'Apartment or condo', house_no_yard: 'House without yard', house_yard: 'House with yard' },
  otherPets: { none: 'No other pets', dogs: 'Has dogs', cats: 'Has cats', both: 'Has dogs and cats' },
  activity: { low: 'Relaxed lifestyle', moderate: 'Moderately active', high: 'Very active' },
  hoursAlone: { short: 'Alone under 4 hours', medium: 'Alone 4 to 8 hours', long: 'Alone 8 hours or more' },
  experience: { first: 'First time owner', some: 'Has owned pets', experienced: 'Very experienced' },
};

export const TEMPERAMENTS = ['friendly', 'calm', 'playful', 'shy', 'gentle', 'independent', 'protective', 'affectionate', 'curious'];

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const plural = (n, word, many = word + 's') => `${n} ${n === 1 ? word : many}`;
export const label = (group, key) => LABELS[group]?.[key] ?? key ?? '';

export function ageLabel(months) {
  const m = Number(months) || 0;
  if (m < 1) return 'Under 1 month';
  if (m < 12) return plural(m, 'month');
  const y = Math.floor(m / 12); const r = m % 12;
  return `${plural(y, 'year')}${r ? ` ${r} mo` : ''}`;
}

const asDate = (iso) => new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
export const fmtDate = (iso) => (iso ? asDate(iso).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Not set');
export const fmtDateTime = (iso) => (iso ? asDate(iso).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Not set');

export function timeAgo(iso) {
  if (!iso) return 'Never';
  const s = Math.round((Date.now() - asDate(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const units = [[60, 'minute'], [24, 'hour'], [7, 'day'], [4.35, 'week'], [12, 'month'], [Infinity, 'year']];
  let v = s / 60;
  for (const [step, name] of units) {
    if (v < step) return `${plural(Math.floor(v), name)} ago`;
    v /= step;
  }
  return fmtDate(iso);
}

export const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
export const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'there';
