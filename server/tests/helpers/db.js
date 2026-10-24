const mongoose = require('mongoose');

// Each test file gets its own database (named test_*), dropped afterwards.
exports.connect = async (name) => {
  if (!process.env.TEST_DB_URI) throw new Error('TEST_DB_URI missing: jest globalSetup did not run');
  await mongoose.connect(process.env.TEST_DB_URI, { dbName: `test_${name}_${Date.now()}` });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init())); // make sure unique indexes exist
};
exports.clear = async () => { for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({}); };
exports.close = async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect(); };
