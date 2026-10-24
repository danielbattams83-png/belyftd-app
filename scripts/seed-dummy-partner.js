const {applicationDefault, initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');

const projectId = process.argv[process.argv.indexOf('--project') + 1] || process.env.GCLOUD_PROJECT;
initializeApp({credential: applicationDefault(), ...(projectId ? {projectId} : {})});

const partner = {
  id: 'summit-fc', organizationName: 'Summit FC Youth Academy', contactEmail: 'director@summitfc.org', subscriptionTier: 4, active: true,
  branding: {logoUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=200&auto=format&fit=crop&q=80', primaryColor: '#0EA5E9', accentColor: '#F59E0B', backgroundColor: '#1E293B', welcomeHeadline: 'Welcome to Summit FC Academy Hub', welcomeSubtext: 'Sharpen your mindset, build matchday grit, and unlock your true potential on and off the pitch.', sponsorBadgeText: 'Official Development Partner', customPartnerTabName: 'Academy Hub'},
  redemptionCodes: ['SUMMIT2026', 'SUMMIT-FALL'], analytics: {totalRedemptions: 48, activeMentees: 42, lessonsCompleted: 156},
};

getFirestore().collection('partners').doc('summit-fc').set(partner, {merge: true}).then(() => console.log('Seeded partners/summit-fc')).catch(error => { console.error(error); process.exitCode = 1; });
