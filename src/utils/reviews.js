// Deterministic product review generator for static builds
// Uses seeded PRNG so results are identical across builds

function djb2Hash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function createRNG(seed) {
  let state = seed;
  return function next() {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

const FIRST_NAMES = [
  "Anna", "Ben", "Clara", "David", "Emma", "Felix", "Hannah", "Jonas",
  "Laura", "Lukas", "Mia", "Noah", "Sophie", "Leon", "Marie", "Paul",
  "Lena", "Max", "Julia", "Tim", "Nina", "Moritz", "Lea", "Jan",
  "Katharina", "Tobias", "Sarah", "Daniel", "Lisa", "Florian", "Mara", "Simon",
  "Franziska", "Niklas", "Amelie", "Tom", "Johanna", "Philipp", "Klara", "Robin",
  "Melina", "Sebastian", "Jana", "Marc", "Alina", "Matthias", "Luisa", "Fabian"
];

const LAST_INITIALS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"
];

const REVIEW_TITLES = [
  "Sehr gute Qualität",
  "Genau das Richtige",
  "Gut, aber mit Luft nach oben",
  "Sehr guter Geschmack",
  "Solides Produkt",
  "Klare Empfehlung",
  "Zuverlässiger Kauf",
  "Besser als erwartet",
  "Würde ich wieder kaufen",
  "Passt perfekt für mich",
  "Sehr zufrieden",
  "Gut für den Alltag",
  "Sanft und konstant",
  "Top verarbeitet",
  "Fünf Sterne von mir",
  "Positiv überrascht",
  "Guter Geschmack, gute Dampfentwicklung",
  "Macht genau, was es soll",
  "Schön zuverlässig",
  "Sehr zufrieden damit",
  "Hätte ich früher kaufen sollen",
  "Gute Qualität für den Preis",
  "Starkes Produkt",
  "Eher durchschnittlich",
  "Nicht ganz wie erwartet",
  "Enttäuschend",
  "Würde ich nicht erneut kaufen",
  "Ganz okay",
  "Könnte besser sein",
  "Gute Dampfentwicklung",
  "Angenehm bei jedem Zug",
  "Mein neues Alltagsgerät",
  "Brillante Qualität",
  "Fühlt sich hochwertig an",
  "Schnelle Lieferung",
  "Perfektes Upgrade",
  "Macht wirklich Spaß",
  "Geschmack sehr intensiv",
  "Kompakt und leistungsstark",
  "Einfach zu bedienen",
  "Gut für Einsteiger",
  "Sehr gutes Preis-Leistungs-Verhältnis",
  "Schick und funktional",
  "Keine Beschwerden"
];

const POSITIVE_BODIES = [
  "Sehr angenehmer Zug und sauberer Geschmack. Würde ich ohne Zögern wieder bestellen.",
  "Ich nutze das Produkt seit einigen Wochen und bin von Geschmack und Leistung wirklich überzeugt.",
  "Genau das, was ich gesucht habe. Gute Qualität und der Geschmack passt sehr gut.",
  "Eines der besten Produkte, die ich bisher getestet habe. Der Geschmack bleibt lange konstant.",
  "Sehr zufrieden mit dem Kauf. Funktioniert wie beschrieben und wirkt hochwertig.",
  "Ich habe schon einiges ausprobiert, aber dieses Produkt gehört klar zu meinen Favoriten.",
  "Solide Verarbeitung und starke Leistung. Bisher gibt es nichts zu beanstanden.",
  "Der Geschmack kommt sehr klar durch, der Zug ist angenehm und gleichmäßig.",
  "Spontan bestellt und inzwischen mein Favorit für den Alltag.",
  "Gutes Produkt und schneller Versand von Mr. Nice Vape. Bin sehr zufrieden.",
  "Gut geeignet für den ganzen Tag. Nicht zu stark, nicht zu mild, genau richtig.",
  "Der Umstieg von meinem alten Gerät hat sich definitiv gelohnt.",
  "Direkt einsatzbereit und qualitativ überzeugend. Funktioniert tadellos.",
  "Sehr guter Kauf. Der Geschmack ist sauber und die Dampfentwicklung ordentlich.",
  "Nutze es täglich und bekomme eine konstant gute Leistung.",
  "Wurde mir empfohlen und die Empfehlung war absolut richtig.",
  "Die Geschmacksnoten kommen gut durch und die Dampfentwicklung ist stabil.",
  "Für den Preis wirklich stark. Macht einen deutlich hochwertigeren Eindruck.",
  "Sehr sanft, keine unangenehme Schärfe. Für mich genau passend.",
  "Erfüllt für mich alle wichtigen Punkte: Qualität, Geschmack und Haltbarkeit.",
  "Besser als erwartet. Der Zug ist angenehm und die Laufzeit überzeugt.",
  "Sehr gutes Produkt, das ich bereits weiterempfohlen habe.",
  "Der Geschmack bleibt von Anfang bis Ende konstant. Sehr angenehm.",
  "Top Qualität. Funktioniert zuverlässig und schmeckt jedes Mal gut."
];

const NEUTRAL_BODIES = [
  "Erfüllt seinen Zweck. Nicht außergewöhnlich, aber zuverlässig.",
  "In Ordnung. Funktioniert gut, ich würde beim nächsten Mal aber vielleicht etwas anderes testen.",
  "Für den Preis solide. Nicht mein Favorit, aber auch nicht schlecht.",
  "Ziemlich durchschnittlich. Funktioniert, der Geschmack ist okay.",
  "Macht, was es soll. Beim nächsten Mal probiere ich vielleicht eine andere Variante.",
  "Ordentliches Produkt, der Zug könnte für mich etwas sanfter sein.",
  "Brauchbar und zuverlässig, aber nicht überragend.",
  "Einige Punkte sind gut, andere könnten besser sein. Insgesamt okay.",
  "Nicht schlecht, aber auch nicht außergewöhnlich. Immerhin konstant.",
  "Solide Qualität. Für mich etwa drei von fünf Sternen.",
  "Für den Alltag okay. Nichts Besonderes, aber auch kein Fehlkauf.",
  "Der Geschmack könnte intensiver sein, ansonsten passt es."
];

const NEGATIVE_BODIES = [
  "Nicht ganz wie erwartet. Der Geschmack war schwächer und der Zug zu straff.",
  "Leider enttäuschend. Der Geschmack war nicht überzeugend und die Laufzeit kürzer als erhofft.",
  "Würde ich eher nicht empfehlen. Hatte von Anfang an kleinere Probleme damit.",
  "Für meinen Geschmack zu hart im Zug und insgesamt etwas flach.",
  "Ich hatte anhand der Beschreibung mehr erwartet. Der Geschmack war mir zu schwach.",
  "Hat mich nicht überzeugt. Der Zug war unangenehm und der Geschmack kaum vorhanden."
];

const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];

function formatDate(timestamp) {
  const d = new Date(timestamp);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${mon} ${year}`;
}

function pickWeightedRating(rand) {
  const r = rand();
  if (r < 0.40) return 5;
  if (r < 0.70) return 4;
  if (r < 0.90) return 3;
  if (r < 0.95) return 2;
  return 1;
}

function pickBody(rating, rand) {
  if (rating >= 4) {
    return POSITIVE_BODIES[Math.floor(rand() * POSITIVE_BODIES.length)];
  }
  if (rating === 3) {
    return NEUTRAL_BODIES[Math.floor(rand() * NEUTRAL_BODIES.length)];
  }
  return NEGATIVE_BODIES[Math.floor(rand() * NEGATIVE_BODIES.length)];
}

// Date range: 2024-01-01 to 2026-02-01
const DATE_START = new Date("2024-01-01T00:00:00Z").getTime();
const DATE_END = new Date("2026-02-01T00:00:00Z").getTime();
const DATE_RANGE = DATE_END - DATE_START;

export function generateReviews(handle) {
  const seed = djb2Hash(handle);
  const rand = createRNG(seed);

  const reviewCount = 10 + Math.floor(rand() * 91); // 10-100
  const reviews = [];

  for (let i = 0; i < reviewCount; i++) {
    const firstName = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const lastInit = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)];
    const rating = pickWeightedRating(rand);
    const timestamp = DATE_START + Math.floor(rand() * DATE_RANGE);
    const title = REVIEW_TITLES[Math.floor(rand() * REVIEW_TITLES.length)];
    const body = pickBody(rating, rand);
    const verified = rand() < 0.7;

    reviews.push({
      id: `${handle}-${i}`,
      name: `${firstName} ${lastInit}.`,
      rating,
      date: formatDate(timestamp),
      title,
      body,
      verified,
      _ts: timestamp,
    });
  }

  // Sort newest first
  reviews.sort((a, b) => b._ts - a._ts);

  // Entfernen internal timestamp
  reviews.forEach((r) => delete r._ts);

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / reviews.length) * 10) / 10;

  return {
    reviews,
    averageRating,
    totalReviews: reviews.length,
  };
}

export function getStarDistribution(reviews) {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of reviews) {
    dist[r.rating]++;
  }
  return dist;
}
