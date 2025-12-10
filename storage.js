import { MongoClient } from 'mongodb'

const uri =
  process.env.MONGODB_URI ||
  'mongodb+srv://rushang007:jRtpV0Xm88OsFdCs@cluster0.illdjo7.mongodb.net/iFinance?retryWrites=true&w=majority'
const dbName = process.env.MONGODB_DB || 'whiteboard'
const collectionName = process.env.MONGODB_COLLECTION || 'boards'

// Schema: Single document with _id: 'singleton'
// Fields: content (string, supports 50,000+ characters, max ~16MB per MongoDB doc)
//         updatedAt (number, timestamp)
let collectionPromise

const getCollection = async () => {
  if (!uri) {
    throw new Error('Missing MONGODB_URI environment variable')
  }
  if (!collectionPromise) {
    const client = new MongoClient(uri)
    collectionPromise = client
      .connect()
      .then(() => client.db(dbName).collection(collectionName))
  }
  return collectionPromise
}

export const readBoard = async () => {
  const collection = await getCollection()
  const doc =
    (await collection.findOne({ _id: 'singleton' })) ||
    (await collection
      .findOneAndUpdate(
        { _id: 'singleton' },
        { $setOnInsert: { content: '', updatedAt: Date.now() } },
        { upsert: true, returnDocument: 'after' },
      )
      .then((r) => r.value))

  return {
    content: doc?.content ?? '',
    updatedAt: doc?.updatedAt ?? Date.now(),
  }
}

export const writeBoard = async (content) => {
  const collection = await getCollection()
  const updatedAt = Date.now()
  const textContent = content ?? ''
  
  // MongoDB supports up to 16MB per document (way more than 50,000 chars)
  // This validation is just a safety check
  const MAX_SIZE = 10 * 1024 * 1024 // 10MB safety limit
  if (Buffer.byteLength(textContent, 'utf8') > MAX_SIZE) {
    throw new Error(`Content too large. Maximum size is ${MAX_SIZE} bytes.`)
  }
  
  await collection.updateOne(
    { _id: 'singleton' },
    { $set: { content: textContent, updatedAt } },
    { upsert: true },
  )
  return { content: textContent, updatedAt }
}
