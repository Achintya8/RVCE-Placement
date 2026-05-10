import { connectMongo, getBucket } from './src/config/mongodb.js';

async function run() {
  await connectMongo();
  const bucket = await getBucket();
  const files = await bucket.find().toArray();
  console.log(JSON.stringify(files.slice(-2), null, 2));
  process.exit(0);
}

run();
