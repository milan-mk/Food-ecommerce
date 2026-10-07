// Starts ONE throw-away in-memory MongoDB for the whole run (first run downloads the mongod binary).
// To use your own server instead, set TEST_MONGODB_URI. Tests only ever use databases named "test_*".
module.exports = async () => {
  if (process.env.TEST_MONGODB_URI) { process.env.TEST_DB_URI = process.env.TEST_MONGODB_URI; return; }
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  globalThis.__MONGOD__ = mongod;
  process.env.TEST_DB_URI = mongod.getUri();
};
