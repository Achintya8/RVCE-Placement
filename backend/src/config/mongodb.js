import { MongoClient, GridFSBucket } from 'mongodb';
import { env } from './env.js';

let client = null;
let db = null;
let bucket = null;

export const connectMongo = async () => {
  if (db) return { db, bucket };

  try {
    client = new MongoClient(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db();
    bucket = new GridFSBucket(db, { bucketName: 'resumes' });
    console.log('🔌 Connected to MongoDB (GridFS)');
    return { db, bucket };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    return { db: null, bucket: null };
  }
};

export const getBucket = async () => {
  if (!bucket) {
    const res = await connectMongo();
    return res.bucket;
  }
  return bucket;
};
