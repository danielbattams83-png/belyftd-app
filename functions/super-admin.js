const {getFirestore} = require('firebase-admin/firestore');
const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');
const {createAdminHandlers} = require('./admin-session');

const masterKey = defineSecret('LYFTD_ADMIN_MASTER_KEY');
const handlers = createAdminHandlers({db: getFirestore(), masterKey: () => masterKey.value(), HttpsError});
const options = {region: 'us-central1', invoker: 'public', maxInstances: 5, secrets: [masterKey]};

exports.superAdminLogin = onCall(options, handlers.login);
exports.superAdminValidate = onCall(options, handlers.validate);
exports.superAdminLogout = onCall(options, handlers.logout);
exports.superAdminListPartners = onCall(options, handlers.listPartners);
exports.superAdminSavePartner = onCall(options, handlers.savePartner);
