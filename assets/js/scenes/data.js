/* Sample data shared by all scenes, so the page tells one consistent story.
   Structure and labels follow the app (CheckInVisualResultsView,
   CheckInSkinBreakdownCard, CheckInSkinZonesCard, SkinScoreBand). */

export const user = { greeting: 'Guten Morgen', subtitle: 'Blick zurück auf deinen Hauttag' };

/* Hautscore 0 to 100. Bands: Sehr gut ≥ 80, Gut ≥ 60, Mittel ≥ 40, sonst Pflege nötig */
export const score = { before: 75, after: 78, band: 'Gut' };
export const bandFor = s => (s >= 80 ? 'Sehr gut' : s >= 60 ? 'Gut' : s >= 40 ? 'Mittel' : 'Pflege nötig');

/* Hautprofil, 1 to 10, higher is better (Rötung: 10 = no visible redness) */
export const metrics = [
  { name: 'Klarheit', value: 8, prev: 7 },
  { name: 'Textur', value: 7, prev: 7 },
  { name: 'Feuchte', value: 8, prev: 7 },
  { name: 'Rötung', value: 9, prev: 8 },
  { name: 'Ebenheit', value: 7, prev: 7 },
];

/* Nach Gesichtsbereich, 0 to 100 */
export const zones = [
  { key: 'stirn', name: 'Stirn', value: 82, prev: 80 },
  { key: 'wangen', name: 'Wangen', value: 74, prev: 70 },
  { key: 'nase', name: 'Nase', value: 80, prev: 79 },
  { key: 'kinn', name: 'Kinn', value: 69, prev: 66 },
];

/* Genauer hinsehen: zones with the most blemishes */
export const closeUps = [
  { key: 'kinn', name: 'Kinn', active: 2, note: 'Zwei kleine entzündete Stellen, etwas weniger gerötet als beim letzten Scan.' },
  { key: 'wangeL', name: 'Linke Wange', active: 1, note: 'Eine Stelle am Kieferrand, sonst ruhig.' },
];

/* Analysis stages, verbatim from CheckInFlowTypes.swift */
export const analysisSteps = [
  'Check-in wird vorbereitet…',
  'Hautprofil wird erstellt…',
  'Vorherige Check-ins werden geladen…',
  'Haut wird analysiert…',
  'Score wird berechnet…',
  'Ergebnisse werden gespeichert…',
  'Analyse fertig!',
];

/* Last 7 Hautscore values, oldest first (the last one is today after the scan) */
export const sparkline = [71, 73, 72, 74, 73, 75, 78];

/* Entzündete Unreinheiten per scan over 30 days, trending down with daily noise */
export const blemishes = [9, 8, 10, 7, 8, 9, 7, 6, 8, 7, 6, 7, 5, 6, 8, 5, 6, 5, 4, 6, 5, 4, 5, 3, 4, 5, 3, 4, 3, 3];

export const routine = {
  morgens: [
    { step: 'Reiniger', name: 'Toleriane Hydrating Gentle Cleanser' },
    { step: 'Serum', name: 'Hyaluronic Acid 2% + B5' },
    { step: 'Feuchtigkeitspflege', name: 'Daily Moisturizing Lotion' },
    { step: 'Sonnenschutz', name: 'Anthelios UVMune 400 SPF 50+' },
  ],
  abends: [
    { step: 'Reiniger', name: 'Toleriane Hydrating Gentle Cleanser' },
    { step: 'Serum', name: 'Niacinamide 10% + Zinc 1%' },
    { step: 'Feuchtigkeitspflege', name: 'Daily Moisturizing Lotion' },
  ],
};

/* Serie: milestone at 28 days = "Vollständiger Zyklus" */
export const streak = { days: 28, milestone: 'Vollständiger Zyklus', milestoneText: 'Die Haut erneuert sich ungefähr alle vier Wochen, und du hast gerade eine davon komplett begleitet.' };
export const weekdays = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
