/** @file One-off migration script to move favorites from filesystem JSON files into MongoDB. */

const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const mongoose = require('mongoose')

/**
 * Absolute paths reused from main server.
 */
const ROOT_DIR = path.resolve(__dirname, '..')
const USERS_DIR = path.join(ROOT_DIR, 'users')

/**
 * MongoDB connection string; must be the same as used by the server.
 */
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/media-library'

/**
 * User schema identical to the one in server/index.js.
 */
const userSchema = new mongoose.Schema({
  nickname: { type: String, required: true, unique: true },
  favorites: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
})

/** @type {import('mongoose').Model<any>} */
const User = mongoose.model('User', userSchema)

/**
 * Reads favorites.json for a given user directory.
 *
 * @param {string} nickname - User nickname (folder name).
 * @returns {Promise<string[]>} Parsed favorites or empty array.
 */
async function readFavoritesFile(nickname) {
  const filePath = path.join(USERS_DIR, nickname, 'favorites.json')
  try {
    const raw = await fsp.readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

/**
 * Migrates a single user favorites file into MongoDB.
 *
 * @param {string} nickname - User nickname (folder name).
 * @returns {Promise<void>} Resolves when migration is done.
 */
async function migrateUser(nickname) {
  const favorites = await readFavoritesFile(nickname)
  if (!favorites.length) {
    // eslint-disable-next-line no-console
    console.log(`[migrate] User "${nickname}" has no favorites, skipping`)
    return
  }

  const existing = await User.findOne({ nickname }).exec()
  if (existing) {
    existing.favorites = favorites
    await existing.save()
    // eslint-disable-next-line no-console
    console.log(`[migrate] Updated user "${nickname}" with ${favorites.length} favorites`)
  } else {
    await User.create({ nickname, favorites })
    // eslint-disable-next-line no-console
    console.log(`[migrate] Created user "${nickname}" with ${favorites.length} favorites`)
  }
}

/**
 * Main migration routine scanning all user directories.
 *
 * @returns {Promise<void>} Resolves when migration is complete.
 */
async function migrateAll() {
  if (!fs.existsSync(USERS_DIR)) {
    // eslint-disable-next-line no-console
    console.log('[migrate] No "users" directory found, nothing to migrate')
    return
  }

  const entries = await fsp.readdir(USERS_DIR, { withFileTypes: true })
  const userDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)

  if (!userDirs.length) {
    // eslint-disable-next-line no-console
    console.log('[migrate] No user directories found, nothing to migrate')
    return
  }

  // eslint-disable-next-line no-console
  console.log(`[migrate] Found ${userDirs.length} user directories, starting migration...`)

  for (const nickname of userDirs) {
    // eslint-disable-next-line no-await-in-loop
    await migrateUser(nickname)
  }

  // eslint-disable-next-line no-console
  console.log('[migrate] Migration finished')
}

/**
 * Entrypoint: connects to MongoDB and runs migration.
 */
async function main() {
  try {
    await mongoose.connect(MONGODB_URI)
    // eslint-disable-next-line no-console
    console.log('[migrate] Connected to MongoDB at', MONGODB_URI)

    await migrateAll()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[migrate] Migration failed', error)
  } finally {
    await mongoose.disconnect()
    // eslint-disable-next-line no-console
    console.log('[migrate] Disconnected from MongoDB')
  }
}

void main()