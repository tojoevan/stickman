const Datastore = require('nedb-promises');
const path = require('path');

async function test() {
  try {
    console.log('Testing DB connection...');
    const db = Datastore.create({ filename: path.join(__dirname, 'test.db'), autoload: true });
    await db.insert({ test: 1 });
    const doc = await db.findOne({ test: 1 });
    console.log('Success:', doc);
    process.exit(0);
  } catch (err) {
    console.error('Failure:', err);
    process.exit(1);
  }
}
test();
