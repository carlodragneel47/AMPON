// Sample data loaded the first time the system starts (empty database).
// Photos live in public/img/pets (Unsplash License, see README).
const bcrypt = require('bcryptjs');
const rules = require('./rules');

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();
const dateOnly = (n) => daysAgo(n).slice(0, 10);
const photo = (name) => `/img/pets/${name.toLowerCase()}.jpg`;

const PETS = [
  { name: 'Bantay', species: 'dog', breed: 'Aspin (Asong Pinoy)', sex: 'male', ageMonths: 30, size: 'medium', color: 'Brown with white chest', energy: 'moderate', temperament: ['friendly', 'protective', 'affectionate'], goodWithKids: 'yes', goodWithDogs: 'yes', goodWithCats: 'unknown', needsYard: false, aloneTolerance: 'medium', training: 'basic', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: true, rehabProgress: 100, status: 'available', rescueDays: 120, rescueLocation: 'Poblacion, Santa Maria', description: 'Found guarding a sari-sari store during the rainy season. Bantay is loyal, calm indoors and loves short evening walks. He already knows "sit" and "stay".' },
  { name: 'Mingming', species: 'cat', breed: 'Puspin (Pusang Pinoy)', sex: 'female', ageMonths: 18, size: 'small', color: 'Orange tabby', energy: 'low', temperament: ['calm', 'affectionate'], goodWithKids: 'yes', goodWithDogs: 'unknown', goodWithCats: 'yes', needsYard: false, aloneTolerance: 'high', training: 'trained', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: true, rehabProgress: 100, status: 'available', rescueDays: 90, rescueLocation: 'Bagbaguin, Santa Maria', description: 'A gentle lap cat who enjoys sunny windowsills. She is litter trained and perfectly happy in a small apartment.' },
  { name: 'Choco', species: 'dog', breed: 'Labrador mix', sex: 'male', ageMonths: 14, size: 'large', color: 'Chocolate', energy: 'high', temperament: ['playful', 'friendly', 'curious'], goodWithKids: 'yes', goodWithDogs: 'yes', goodWithCats: 'no', needsYard: true, aloneTolerance: 'low', training: 'none', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: false, rehabProgress: 90, status: 'available', rescueDays: 60, rescueLocation: 'Pulong Buhangin, Santa Maria', description: 'Big, bouncy and full of love. Choco needs an active family with a yard and time for daily runs and training sessions.' },
  { name: 'Muning', species: 'cat', breed: 'Puspin (Pusang Pinoy)', sex: 'female', ageMonths: 4, size: 'small', color: 'Brown tabby', energy: 'high', temperament: ['playful', 'curious'], goodWithKids: 'yes', goodWithDogs: 'yes', goodWithCats: 'yes', needsYard: false, aloneTolerance: 'medium', training: 'basic', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: false, rehabProgress: 100, status: 'available', rescueDays: 40, rescueLocation: 'Guyong, Santa Maria', description: 'A tiny explorer rescued from a drainage canal with her siblings. She loves feather toys and chasing anything that moves.' },
  { name: 'Whitey', species: 'dog', breed: 'Shih Tzu mix', sex: 'female', ageMonths: 96, size: 'small', color: 'White and cream', energy: 'low', temperament: ['calm', 'gentle', 'affectionate'], goodWithKids: 'yes', goodWithDogs: 'yes', goodWithCats: 'yes', needsYard: false, aloneTolerance: 'medium', training: 'trained', specialNeeds: true, specialNeedsNotes: 'Mild cataract in the left eye. Needs eye drops twice a day.', healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: true, rehabProgress: 100, status: 'available', rescueDays: 150, rescueLocation: 'Caysio, Santa Maria', description: 'A senior sweetheart surrendered when her owner moved abroad. Whitey is house trained and just wants a quiet couch to share.' },
  { name: 'Tisoy', species: 'cat', breed: 'Siamese mix', sex: 'male', ageMonths: 36, size: 'medium', color: 'Seal point', energy: 'moderate', temperament: ['independent', 'curious'], goodWithKids: 'no', goodWithDogs: 'no', goodWithCats: 'yes', needsYard: false, aloneTolerance: 'high', training: 'trained', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: true, rehabProgress: 100, status: 'available', rescueDays: 200, rescueLocation: 'San Gabriel, Santa Maria', description: 'Talkative and independent. Tisoy prefers an adults only home and does best as the only pet or with another calm cat.' },
  { name: 'Lucky', species: 'dog', breed: 'Aspin (Asong Pinoy)', sex: 'male', ageMonths: 48, size: 'medium', color: 'Black and white', energy: 'moderate', temperament: ['shy', 'gentle'], goodWithKids: 'unknown', goodWithDogs: 'yes', goodWithCats: 'yes', needsYard: false, aloneTolerance: 'high', training: 'basic', specialNeeds: true, specialNeedsNotes: 'Three legged (front left leg amputated) and fully adapted.', healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: true, rehabProgress: 85, status: 'available', rescueDays: 180, rescueLocation: 'Tumana, Santa Maria', description: 'Lucky survived a road accident and adapted beautifully on three legs. He is shy at first but very loyal once he trusts you.' },
  { name: 'Kisses', species: 'dog', breed: 'Beagle mix', sex: 'female', ageMonths: 24, size: 'medium', color: 'Tricolor', energy: 'high', temperament: ['friendly', 'playful', 'curious'], goodWithKids: 'yes', goodWithDogs: 'yes', goodWithCats: 'unknown', needsYard: true, aloneTolerance: 'low', training: 'basic', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: true, rehabProgress: 100, status: 'available', rescueDays: 75, rescueLocation: 'Santa Clara, Santa Maria', description: 'A happy explorer who follows her nose everywhere. Kisses loves kids, long sniff walks and anyone holding a treat.' },
  { name: 'Mochi', species: 'cat', breed: 'Persian mix', sex: 'male', ageMonths: 132, size: 'medium', color: 'Grey tabby', energy: 'low', temperament: ['calm', 'shy'], goodWithKids: 'no', goodWithDogs: 'no', goodWithCats: 'unknown', needsYard: false, aloneTolerance: 'high', training: 'trained', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: true, rehabProgress: 95, status: 'available', rescueDays: 110, rescueLocation: 'Parada, Santa Maria', description: 'A dignified senior gentleman who needs a calm, quiet home and regular brushing.' },
  { name: 'Ash', species: 'dog', breed: 'Aspin (Asong Pinoy)', sex: 'female', ageMonths: 8, size: 'small', color: 'Black and tan', energy: 'moderate', temperament: ['friendly', 'affectionate'], goodWithKids: 'yes', goodWithDogs: 'yes', goodWithCats: 'yes', needsYard: false, aloneTolerance: 'medium', training: 'basic', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: false, rehabProgress: 100, status: 'available', rescueDays: 30, rescueLocation: 'Bulac, Santa Maria', description: 'A sweet puppy who gets along with everyone, including people, dogs and even cats. She is already learning to walk on a leash.' },
  { name: 'Brownie', species: 'dog', breed: 'Aspin (Asong Pinoy)', sex: 'male', ageMonths: 20, size: 'medium', color: 'Brown', energy: 'moderate', temperament: ['shy'], goodWithKids: 'unknown', goodWithDogs: 'unknown', goodWithCats: 'unknown', needsYard: false, aloneTolerance: 'medium', training: 'none', specialNeeds: false, healthStatus: 'under_treatment', vaccinated: false, dewormed: true, neutered: false, rehabProgress: 35, status: 'rehabilitation', rescueDays: 12, rescueLocation: 'Silangan, Santa Maria', description: 'Rescued with severe mange. Brownie is responding well to medicated baths and recovering steadily.' },
  { name: 'Pepper', species: 'cat', breed: 'Puspin (Pusang Pinoy)', sex: 'female', ageMonths: 10, size: 'small', color: 'Black and white', energy: 'moderate', temperament: ['curious'], goodWithKids: 'unknown', goodWithDogs: 'unknown', goodWithCats: 'yes', needsYard: false, aloneTolerance: 'medium', training: 'basic', specialNeeds: false, healthStatus: 'recovering', vaccinated: true, dewormed: false, neutered: false, rehabProgress: 60, status: 'rehabilitation', rescueDays: 20, rescueLocation: 'Mag-asawang Sapa, Santa Maria', description: 'Recovering from an upper respiratory infection. Pepper is eating well and gaining weight.' },
  { name: 'Putol', species: 'dog', breed: 'Aspin (Asong Pinoy)', sex: 'male', ageMonths: 60, size: 'large', color: 'Fawn', energy: 'low', temperament: [], goodWithKids: 'unknown', goodWithDogs: 'unknown', goodWithCats: 'unknown', needsYard: false, aloneTolerance: 'medium', training: 'none', specialNeeds: false, healthStatus: 'critical', vaccinated: false, dewormed: false, neutered: false, rehabProgress: 5, status: 'rescued', rescueDays: 3, rescueLocation: 'Catmon, Santa Maria', description: 'Just rescued. Putol is severely underweight with a wound on the hind leg and is under veterinary care.' },
  { name: 'Snow', species: 'cat', breed: 'Puspin (Pusang Pinoy)', sex: 'female', ageMonths: 26, size: 'small', color: 'White', energy: 'low', temperament: ['calm', 'affectionate'], goodWithKids: 'yes', goodWithDogs: 'yes', goodWithCats: 'yes', needsYard: false, aloneTolerance: 'high', training: 'trained', specialNeeds: false, healthStatus: 'healthy', vaccinated: true, dewormed: true, neutered: true, rehabProgress: 100, status: 'adopted', rescueDays: 240, rescueLocation: 'San Vicente, Santa Maria', description: 'Snow now lives with a loving family in Santa Maria.' },
];

const CARE = {
  Bantay: [['checkup', 'Initial vet check: mild dehydration and a minor tick infestation.', 118], ['vaccination', '5 in 1 and anti rabies vaccines given.', 100], ['surgery', 'Neutered. Recovery was uneventful.', 80], ['behavior', 'Assessment: friendly with children and other dogs. Not yet tested with cats.', 60]],
  Brownie: [['checkup', 'Severe demodectic mange, underweight at 9 kg.', 12], ['treatment', 'Started medicated baths twice a week and oral medication.', 11], ['deworming', 'Dewormed.', 10], ['checkup', 'Skin improving with hair regrowth on the back. Weight 10.2 kg.', 2]],
  Pepper: [['checkup', 'Upper respiratory infection with nasal discharge.', 20], ['treatment', 'Seven day antibiotic course started.', 19], ['vaccination', 'First vaccine dose given.', 8], ['checkup', 'Breathing clear and appetite good.', 3]],
  Putol: [['checkup', 'Emaciated with an open wound on the right hind leg. Wound cleaned and dressed.', 3], ['treatment', 'IV fluids and antibiotics.', 2]],
  Lucky: [['surgery', 'Front left leg amputation after a road accident.', 175], ['checkup', 'Fully healed and walking confidently.', 120], ['behavior', 'Shy with strangers but warms up within a day. Good with dogs and cats.', 30]],
};

// Sample adopter accounts (password for all: adopter123).
const ADOPTERS = [
  { name: 'Juan Dela Cruz', email: 'adopter@ampon.local', phone: '0918 123 4567', address: 'Poblacion, Santa Maria, Bulacan', days: 14,
    preferences: { species: 'any', size: 'any', age: 'any', homeType: 'house_no_yard', hasChildren: true, otherPets: 'none', activity: 'moderate', hoursAlone: 'medium', experience: 'first', specialNeedsOk: false } },
  { name: 'Maria Santos', email: 'maria.santos@example.com', phone: '0917 555 2301', address: 'Bagbaguin, Santa Maria, Bulacan', days: 30,
    preferences: { species: 'cat', size: 'small', age: 'any', homeType: 'apartment', hasChildren: false, otherPets: 'none', activity: 'low', hoursAlone: 'long', experience: 'some', specialNeedsOk: false } },
  { name: 'Paolo Reyes', email: 'paolo.reyes@example.com', phone: '0919 420 8812', address: 'Guyong, Santa Maria, Bulacan', days: 22,
    preferences: { species: 'dog', size: 'large', age: 'young', homeType: 'house_yard', hasChildren: false, otherPets: 'cats', activity: 'high', hoursAlone: 'short', experience: 'experienced', specialNeedsOk: true } },
  { name: 'Andrea Villanueva', email: 'andrea.villanueva@example.com', phone: '0927 310 4456', address: 'San Vicente, Santa Maria, Bulacan', days: 60,
    preferences: { species: 'cat', size: 'any', age: 'adult', homeType: 'house_no_yard', hasChildren: true, otherPets: 'none', activity: 'low', hoursAlone: 'medium', experience: 'some', specialNeedsOk: false } },
  { name: 'Miguel Garcia', email: 'miguel.garcia@example.com', phone: '0995 218 7740', address: 'Santa Clara, Santa Maria, Bulacan', days: 9,
    preferences: null },
];

const APPLICATIONS = [
  { email: 'adopter@ampon.local', pet: 'Bantay', status: 'pending', days: 2, reason: 'Our family has been looking for a loyal companion. We have a fenced front porch and my kids (8 and 11) are excited to help walk him.' },
  { email: 'maria.santos@example.com', pet: 'Mingming', status: 'pending', days: 4, reason: 'I live alone in a quiet apartment and work from home three days a week. Mingming sounds like the perfect calm companion.' },
  { email: 'paolo.reyes@example.com', pet: 'Choco', status: 'rejected', days: 15, note: 'Choco is not yet tested with cats, and your household has cats. We would be happy to help you find another match.', reason: 'I run every morning and have a big yard. I would love an energetic partner for my runs.' },
  { email: 'andrea.villanueva@example.com', pet: 'Snow', status: 'approved', days: 50, note: 'Approved after a successful home visit. Welcome to the Ampon family!', reason: 'Our children grew up with cats and we have a quiet home with plenty of space for a gentle cat.' },
  { email: 'miguel.garcia@example.com', pet: 'Kisses', status: 'pending', days: 1, reason: 'We have a backyard and two kids who love dogs. Kisses looks like a great fit for our weekend hikes.' },
];

async function seed(store) {
  if ((await store.count('users')) > 0) return false;

  const now = new Date().toISOString();
  const admin = await store.insert('users', { name: 'Shelter Administrator', email: 'admin@ampon.local', passwordHash: bcrypt.hashSync('admin123', 10), role: 'admin', phone: '0917 000 0000', address: 'Santa Maria, Bulacan', preferences: null, createdAt: daysAgo(250) });
  const adopterHash = bcrypt.hashSync('adopter123', 10);
  const users = {};
  for (const a of ADOPTERS) {
    users[a.email] = await store.insert('users', { name: a.name, email: a.email, passwordHash: adopterHash, role: 'adopter', phone: a.phone, address: a.address, preferences: a.preferences, createdAt: daysAgo(a.days) });
  }

  const pets = {};
  for (const p of PETS) {
    const { rescueDays, ...rest } = p;
    pets[p.name] = await store.insert('pets', {
      specialNeedsNotes: null, views: 5 + Math.floor(Math.random() * 40), ...rest, photo: photo(p.name),
      rescueDate: dateOnly(rescueDays), createdAt: daysAgo(rescueDays), updatedAt: now,
    });
  }

  for (const [name, entries] of Object.entries(CARE)) {
    for (const [type, notes, d] of entries) {
      await store.insert('care_logs', { petId: pets[name].id, type, notes, recordedBy: admin.id, createdAt: daysAgo(d) });
    }
  }

  for (const a of APPLICATIONS) {
    const user = users[a.email]; const pet = pets[a.pet];
    let matchScore = null;
    if (user.preferences) {
      const ev = rules.evaluatePet(rules.normalizePreferences(user.preferences), { ...pet, status: 'available' });
      matchScore = ev.eligible ? ev.score : 0;
    }
    await store.insert('applications', {
      userId: user.id, petId: pet.id, phone: user.phone, address: user.address, reason: a.reason, homeVisitOk: true,
      matchScore, status: a.status, adminNote: a.note || null, createdAt: daysAgo(a.days), updatedAt: daysAgo(Math.max(0, a.days - 1)),
    });
  }

  await store.insert('logs', { userId: null, action: 'system', details: 'Database initialised with sample data', createdAt: now });
  return true;
}

module.exports = { seed, PETS, ADOPTERS, APPLICATIONS, photo };
