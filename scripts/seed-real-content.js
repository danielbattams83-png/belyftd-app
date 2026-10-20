const fs = require('node:fs');
const path = require('node:path');
const mammoth = require('mammoth');
const {applicationDefault, initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const {getStorage} = require('firebase-admin/storage');

const projectIndex = process.argv.indexOf('--project');
const projectId = projectIndex >= 0 ? process.argv[projectIndex + 1] : '';
const applyChanges = process.argv.includes('--apply');
const siteFilesPath = process.env.LYFTD_SITE_FILES || "H:\\My Drive\\Lyft'd Lessons\\Site Files";
const contentRoot = path.join(siteFilesPath, '2. Documents', '3. Unit Documents');
const mediaRoots = [
  path.join(siteFilesPath, '3. Media Files'),
  path.join(siteFilesPath, '4. Mentors'),
];
const sponsorCodes = [
  {
    codeId: 'PARTNER2026',
    orgId: 'community-partner',
    sponsorName: 'Community Partner',
    subscriptionTier: 2,
    active: true,
  },
  {
    codeId: 'IMPACT2026',
    orgId: 'impact-sponsor',
    sponsorName: 'Impact Sponsor',
    subscriptionTier: 3,
    active: true,
  },
];
const tierByModule = {1: 1, 2: 2, 3: 2, 4: 3, 5: 3};
const lessonCodePattern = /^(\d+)[.-](\d+)(?=[.-])/;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function parseLessonCode(filePath) {
  const basename = path.basename(filePath).replace(/^LL-/i, '');
  const match = basename.match(lessonCodePattern);
  return match ? {moduleNumber: Number(match[1]), unitNumber: Number(match[2])} : null;
}

function safeSegment(value) {
  const segment = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_.-]+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '');
  if (!segment || segment === '.' || segment === '..') {
    throw new Error(`Could not create a safe Storage path segment from "${value}".`);
  }
  return segment;
}

function lessonTitle(filePath, text) {
  const firstLine = text.split(/\r?\n/).map(line => line.trim()).find(Boolean);
  if (firstLine && firstLine.length <= 100 && !/^\[(tone|style|voice)\b/i.test(firstLine)) {
    return firstLine;
  }
  return path.basename(filePath, path.extname(filePath))
    .replace(/^LL-/i, '')
    .replace(/^\d+[.-]\d+[-.]*/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

function matchingMediaFiles(lessonCode, moduleNumber, unitNumber) {
  return mediaRoots.flatMap(listFiles).filter(filePath => {
    const extension = path.extname(filePath).toLowerCase();
    if (!['.mp3', '.mp4'].includes(extension)) return false;
    const basename = path.basename(filePath);
    const code = parseLessonCode(basename);
    if (code) return `${code.moduleNumber}.${code.unitNumber}` === lessonCode;

    const parentMentor = path.basename(path.dirname(path.dirname(filePath)));
    if (moduleNumber === 2 && /^[A-Za-z]+ \(.*\)$/.test(parentMentor)) {
      return new RegExp(`^${unitNumber}(?:[.-]|$)`).test(basename);
    }
    return moduleNumber === 5 && unitNumber === 2 && /\bHOPE\b/i.test(basename);
  });
}

function mediaLabel(filePath) {
  const name = path.basename(filePath, path.extname(filePath));
  const mentorDirectory = path.basename(path.dirname(path.dirname(filePath)));
  const mentorName = mentorDirectory.match(/^[A-Za-z]+/)?.[0];
  const language = name.match(/english|swahili|chinese/i)?.[0];
  if (mentorName && language) return `${mentorName} (${language})`;
  if (mentorName) return mentorName;
  return name.replace(/^\d+[.-]\d+[-.]*/, '').replace(/[-_]+/g, ' ').trim() || name;
}

async function main() {
  if (!projectId) {
    fail('Specify the Firebase target explicitly: node scripts/seed-real-content.js --project belyft-d-app [--apply]');
    return;
  }
  if (projectId !== 'belyft-d-app') {
    fail(`Refusing to seed unexpected Firebase project "${projectId}". This script is restricted to belyft-d-app.`);
    return;
  }
  if (!fs.existsSync(contentRoot)) {
    fail(`Lesson folder not found: ${contentRoot}. Set LYFTD_SITE_FILES to the Site Files directory.`);
    return;
  }

  const candidates = listFiles(contentRoot).filter(file => path.extname(file).toLowerCase() === '.docx');
  const selectedByUnit = new Map();
  for (const filePath of candidates) {
    const code = parseLessonCode(filePath);
    if (!code) continue;
    const unitKey = `module-${code.moduleNumber}/unit-${code.unitNumber}`;
    const isMaster = /[\\/]Master Files[\\/]/i.test(filePath);
    const prior = selectedByUnit.get(unitKey);
    if (!prior || (prior.isMaster && !isMaster)) {
      selectedByUnit.set(unitKey, {filePath, isMaster});
    } else if (!prior.isMaster && !isMaster) {
      throw new Error(`Multiple script documents found for ${unitKey}: ${prior.filePath} and ${filePath}`);
    }
  }

  if (!selectedByUnit.size) {
    fail(`No numbered unit .docx files found under ${contentRoot}.`);
    return;
  }

  const units = [];
  for (const [unitPath, source] of [...selectedByUnit.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const [moduleId, unitId] = unitPath.split('/');
    const moduleNumber = Number(moduleId.slice('module-'.length));
    const text = (await mammoth.extractRawText({path: source.filePath})).value.trim();
    if (!text) throw new Error(`The lesson document is empty: ${source.filePath}`);

    const lessonCode = `${moduleNumber}.${Number(unitId.slice('unit-'.length))}`;
    const mediaUrls = {audio: {}, video: {}};
    for (const mediaPath of matchingMediaFiles(lessonCode, moduleNumber, Number(unitId.slice('unit-'.length)))) {
      const extension = path.extname(mediaPath).toLowerCase();
      const mediaType = extension === '.mp3' ? 'audio' : 'video';
      const mediaName = path.basename(mediaPath, extension);
      const avatarId = safeSegment(mediaName.replace(/^\d+[.-]\d+[-.]*/, '').toLowerCase());
      const label = mediaLabel(mediaPath);
      let uniqueLabel = label;
      let suffix = 2;
      while (Object.hasOwn(mediaUrls[mediaType], uniqueLabel)) {
        uniqueLabel = `${label} ${suffix++}`;
      }
      mediaUrls[mediaType][uniqueLabel] = {
        localPath: mediaPath,
        avatarId,
        extension: extension.slice(1),
      };
    }

    units.push({
      moduleId,
      unitId,
      data: {
        title: lessonTitle(source.filePath, text),
        minTier: tierByModule[moduleNumber] || 3,
        textContent: text,
        audioUrls: {},
        videoUrls: {},
        sourceFile: path.basename(source.filePath),
        updatedAt: FieldValue.serverTimestamp(),
      },
      media: mediaUrls,
      lessonCode,
    });
  }

  const totalAudio = units.reduce((count, unit) => count + Object.keys(unit.media.audio).length, 0);
  const totalVideo = units.reduce((count, unit) => count + Object.keys(unit.media.video).length, 0);
  console.log(`Target project: ${projectId}`);
  console.log(`Lesson documents: ${units.length}`);
  console.log(`Matched media: ${totalAudio} audio, ${totalVideo} video`);
  for (const unit of units) {
    console.log(`  ${unit.moduleId}/${unit.unitId} (tier ${unit.data.minTier}, ${Object.keys(unit.media.audio).length} audio, ${Object.keys(unit.media.video).length} video): ${unit.data.title}`);
  }

  if (!applyChanges) {
    console.log('Dry run only; no Firebase changes made. Review the plan, then rerun with --apply.');
    return;
  }

  initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket: `${projectId}.firebasestorage.app`,
  });
  const db = getFirestore();
  const bucket = getStorage().bucket();

  for (const unit of units) {
    for (const mediaType of ['audio', 'video']) {
      const map = {};
      for (const [label, media] of Object.entries(unit.media[mediaType])) {
        const extension = media.extension;
        const objectPath = `course-content/${unit.moduleId}/${unit.unitId}/${mediaType}/${media.avatarId}.${extension}`;
        await bucket.upload(media.localPath, {
          destination: objectPath,
          metadata: {
            contentType: extension === 'mp3' ? 'audio/mpeg' : 'video/mp4',
            cacheControl: 'public, max-age=31536000',
          },
        });
        map[label] = objectPath;
        console.log(`Uploaded ${objectPath}`);
      }
      unit.data[`${mediaType}Urls`] = map;
    }

    await db.collection('modules').doc(unit.moduleId).collection('units').doc(unit.unitId).set(unit.data, {merge: true});
    console.log(`Seeded ${unit.moduleId}/${unit.unitId}`);
  }

  for (const code of sponsorCodes) {
    const {codeId, ...document} = code;
    await db.collection('inviteCodes').doc(codeId).set({
      ...document,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
    console.log(`Seeded sponsor code ${codeId} for ${document.sponsorName}`);
  }

  console.log('Production content and reusable sponsor codes seeded successfully.');
}

main().catch(error => {
  console.error('Content ingestion failed:', error);
  process.exitCode = 1;
});
