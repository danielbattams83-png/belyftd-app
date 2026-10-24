// Seeds Tier 4 partner documents into Firestore `partners/{id}` using the logged-in Firebase CLI account.
// Usage: node scripts/seed-partners.js [--project <firebase-project-id>]
const os = require('os');
const path = require('path');

const projectArgIndex = process.argv.indexOf('--project');
const projectId = projectArgIndex > -1 ? process.argv[projectArgIndex + 1] : 'belyft-d-app';

const partners = [
  {
    id: 'harbour-city-rowing',
    organizationName: 'Harbour City Rowing Club',
    contactEmail: 'coaching@harbourcityrowing.org',
    subscriptionTier: 4,
    active: true,
    branding: {
      logoUrl: '/partners/harbour-city-rowing.png',
      themeId: 'pacific-cyan',
      primaryColor: '#06b6d4',
      accentColor: '#3b82f6',
      backgroundColor: '#164e63',
      surfaceColor: '#ffffff',
      textOnHeroColor: '#ecfeff',
      welcomeHeadline: 'Welcome to the Harbour City Crew Room',
      welcomeSubtext: 'Train your focus, row in rhythm with your crew, and build the calm confidence that wins close races.',
      sponsorBadgeText: 'Official Performance Partner',
      customPartnerTabName: 'Crew Room',
    },
    redemptionCodes: ['HARBOUR2026', 'HCRC-SQUAD'],
    analytics: {totalRedemptions: 31, activeMentees: 27, lessonsCompleted: 94},
  },
  {
    id: 'ironbark-netball',
    organizationName: 'Ironbark Netball Association',
    contactEmail: 'pathways@ironbarknetball.org',
    subscriptionTier: 4,
    active: true,
    branding: {
      logoUrl: '/partners/ironbark-netball.png',
      themeId: 'royal-purple',
      primaryColor: '#8b5cf6',
      accentColor: '#ec4899',
      backgroundColor: '#2e1065',
      surfaceColor: '#ffffff',
      textOnHeroColor: '#faf5ff',
      welcomeHeadline: 'Welcome to the Ironbark Pathways Hub',
      welcomeSubtext: 'Lead from the circle, back yourself under pressure, and grow the mindset of a match-winning teammate.',
      sponsorBadgeText: 'Official Pathways Partner',
      customPartnerTabName: 'Pathways Hub',
    },
    redemptionCodes: ['IRONBARK2026', 'INA-PATHWAYS'],
    analytics: {totalRedemptions: 22, activeMentees: 19, lessonsCompleted: 61},
  },
];

function toFirestoreValue(value) {
  if (Array.isArray(value)) return {arrayValue: {values: value.map(toFirestoreValue)}};
  if (typeof value === 'boolean') return {booleanValue: value};
  if (typeof value === 'number') return Number.isInteger(value) ? {integerValue: String(value)} : {doubleValue: value};
  if (typeof value === 'string') return {stringValue: value};
  if (value && typeof value === 'object') {
    return {mapValue: {fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFirestoreValue(v)]))}};
  }
  return {nullValue: null};
}

async function getCliAccessToken() {
  const globalRoot = require('child_process').execSync('npm root -g').toString().trim();
  const auth = require(path.join(globalRoot, 'firebase-tools/lib/auth.js'));
  const config = require(path.join(os.homedir(), '.config/configstore/firebase-tools.json'));
  const refreshToken = config.tokens && config.tokens.refresh_token;
  if (!refreshToken) throw new Error('Firebase CLI is not logged in. Run `firebase login` first.');
  const token = await auth.getAccessToken(refreshToken, config.loginScopes || []);
  return token.access_token;
}

async function main() {
  const accessToken = await getCliAccessToken();
  for (const partner of partners) {
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/partners/${partner.id}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({fields: toFirestoreValue(partner).mapValue.fields}),
    });
    if (!response.ok) throw new Error(`Failed to seed ${partner.id}: ${response.status} ${await response.text()}`);
    console.log(`Seeded partners/${partner.id}`);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
