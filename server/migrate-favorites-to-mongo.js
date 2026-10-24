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

const User = mongoose.model('User', new mongoose.Schema({
  login: { type: String, required: true },
  favorites: { type: [String], default: [] },
}, { collection: 'accounts' }))

/**
 * Reads favorites.json for a given user directory.
 *
 * @param {string} login - Account login (folder name).
 * @returns {Promise<string[]>} Parsed favorites or empty array.
 */
async function readFavoritesFile(login) {
  const filePath = path.join(USERS_DIR, login, 'favorites.json')
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
 * @param {string} login - Account login (folder name).
 * @returns {Promise<void>} Resolves when migration is done.
 */
async function migrateUser(login) {
  const favorites = await readFavoritesFile(login)
  if (!favorites.length) {
    console.log(`[migrate] User "${login}" has no favorites, skipping`)
    return
  }

  const result = await User.updateOne(
    { login },
    { $addToSet: { favorites: { $each: favorites } } },
  ).exec()
  if (result.matchedCount > 0) {
    console.log(`[migrate] Updated user "${login}" with ${favorites.length} favorites`)
  } else {
    console.warn(`[migrate] No existing account found for "${login}"; skipped without creating an account`)
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

  console.log(`[migrate] Found ${userDirs.length} user directories, starting migration...`)

  for (const login of userDirs) {
    // eslint-disable-next-line no-await-in-loop
    await migrateUser(login)
  }

  console.log('[migrate] Migration finished')
}

/**
 * Entrypoint: connects to MongoDB and runs migration.
 */
async function main() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('[migrate] Connected to MongoDB at', MONGODB_URI)

    await migrateAll()
  } catch (error) {
    console.error('[migrate] Migration failed', error)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    console.log('[migrate] Disconnected from MongoDB')
  }
}

void main()
