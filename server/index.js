/** @file Express backend for MongoDB-backed media library and auth. */

const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const fsp = require('fs/promises')
const path = require('path')
const mongoose = require('mongoose')
const {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} = require('crypto')

const ROOT_DIR = path.resolve(__dirname, '..')
const MEDIA_STORAGE_DIR = path.join(ROOT_DIR, 'media-storage')
const VIDEO_STORAGE_DIR = path.join(MEDIA_STORAGE_DIR, 'videos')
const IMAGE_STORAGE_DIR = path.join(MEDIA_STORAGE_DIR, 'images')
const CLIENT_BUILD_DIR = path.join(ROOT_DIR, 'dist')

const PORT = Number.parseInt(process.env.PORT || '2486', 10)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/media-library'
const ADMIN_LOGIN = 'admin'
const ADMIN_PASSWORD = 'lolkek135790'

const app = express()

app.use(cors())
app.use(express.json())

const userSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true, index: true },
    login: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    whitelisted: { type: Boolean, default: false },
    favorites: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'accounts',
  },
)

const mediaSchema = new mongoose.Schema(
  {
    uuid: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'image'], required: true },
    extension: { type: String, required: true },
    categories: { type: [String], default: [] },
    isPublic: { type: Boolean, default: true, index: true },
    authorUuid: { type: String, required: true, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'media_items',
  },
)

const sessionSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userUuid: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  {
    versionKey: false,
    collection: 'sessions',
  },
)

/** @type {import('mongoose').Model<any>} */
const User = mongoose.model('User', userSchema)
/** @type {import('mongoose').Model<any>} */
const Media = mongoose.model('Media', mediaSchema)
/** @type {import('mongoose').Model<any>} */
const Session = mongoose.model('Session', sessionSchema)

function ensureDir(dirPath) {
  return fsp.mkdir(dirPath, { recursive: true })
}

function isValidLogin(login) {
  return typeof login === 'string' && /^[a-zA-Z0-9_-]{3,64}$/.test(login)
}

function normalizeDisplayName(name, login) {
  const candidate = typeof name === 'string' ? name.trim() : ''
  return candidate || login
}

function normalizeTitle(title) {
  if (typeof title !== 'string') return null
  const trimmed = title.trim()
  if (!trimmed) return null
  return trimmed.slice(0, 200)
}

function normalizeCategory(category) {
  if (typeof category !== 'string') return null
  const trimmed = category.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!trimmed) return null
  return trimmed.slice(0, 64)
}

function parseCategories(input) {
  let parsedInput = input
  if (typeof input === 'string' && input.trim().startsWith('[')) {
    try {
      parsedInput = JSON.parse(input)
    } catch {
      parsedInput = input
    }
  }

  const rawValues = Array.isArray(parsedInput)
    ? parsedInput
    : typeof parsedInput === 'string'
      ? parsedInput
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : []

  return Array.from(new Set(rawValues.map(normalizeCategory).filter(Boolean)))
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return fallback
}

function getExtensionFromName(fileName) {
  const ext = path.extname(fileName || '').replace('.', '').toLowerCase()
  return ext || null
}

function detectMediaType(file) {
  const mime = file?.mimetype || ''
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'

  const ext = getExtensionFromName(file?.originalname || '')
  if (!ext) return null

  const videoExts = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv', 'm4v'])
  const imageExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'])

  if (videoExts.has(ext)) return 'video'
  if (imageExts.has(ext)) return 'image'
  return null
}

function getStorageDir(type) {
  return type === 'image' ? IMAGE_STORAGE_DIR : VIDEO_STORAGE_DIR
}

function getMediaFilePath(media) {
  return path.join(getStorageDir(media.type), `${media.uuid}.${media.extension}`)
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || '').split(':')
  if (!salt || !hash) return false

  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

async function createAuthToken(user) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  await Session.create({ tokenHash: hashToken(token), userUuid: user.uuid, expiresAt })
  return token
}

function readBearerToken(req) {
  const header = req.headers.authorization || ''
  if (header.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim() || null
  }

  const cookieHeader = req.headers.cookie || ''
  const sessionCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('media_session='))

  return sessionCookie ? decodeURIComponent(sessionCookie.slice('media_session='.length)) : null
}

function setSessionCookie(req, res, token) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  res.setHeader(
    'Set-Cookie',
    `media_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}`,
  )
}

function clearSessionCookie(req, res) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  res.setHeader('Set-Cookie', `media_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
}

function verifyAuthToken(token) {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expectedSignature = signTokenPayload(payload)
  const signatureBuffer = Buffer.from(signature, 'utf8')
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8')

  if (signatureBuffer.length !== expectedBuffer.length) return null
  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed?.uuid || !parsed?.login || parsed.expiresAt < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

function toSafeUser(userDoc) {
  if (!userDoc) return null
  return {
    uuid: userDoc.uuid,
    login: userDoc.login,
    name: userDoc.name,
    isAdmin: Boolean(userDoc.isAdmin),
    whitelisted: Boolean(userDoc.whitelisted),
    createdAt: userDoc.createdAt,
    updatedAt: userDoc.updatedAt,
  }
}

function canViewMedia(mediaDoc, viewer) {
  if (mediaDoc.isPublic) return true
  if (!viewer) return false
  if (viewer.isAdmin) return true
  return viewer.uuid === mediaDoc.authorUuid
}

function canEditMedia(mediaDoc, viewer) {
  if (!viewer) return false
  if (viewer.isAdmin) return true
  return viewer.uuid === mediaDoc.authorUuid
}

async function getCurrentUser(req) {
  const token = readBearerToken(req)
  if (!token) return null

  const session = await Session.findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } })
    .lean()
    .exec()
  if (!session) return null
  return User.findOne({ uuid: session.userUuid }).exec()
}

async function attachCurrentUser(req, res, next) {
  try {
    req.currentUser = await getCurrentUser(req)
    if (req.currentUser && req.headers.authorization) {
      setSessionCookie(req, res, readBearerToken(req))
    }
    next()
  } catch (error) {
    next(error)
  }
}

function requireAuth(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  return next()
}

function requireAdmin(req, res, next) {
  if (!req.currentUser?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' })
  }
  return next()
}

function requireUploaderAccess(req, res, next) {
  if (!req.currentUser) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (req.currentUser.isAdmin || req.currentUser.whitelisted) {
    return next()
  }
  return res.status(403).json({ error: 'Whitelist approval required' })
}

async function connectMongo() {
  await mongoose.connect(MONGODB_URI)
  console.log('[mongo] Connected to MongoDB at', MONGODB_URI)
}

async function ensureAdminUser() {
  const existingAdmin = await User.findOne({ login: ADMIN_LOGIN }).exec()
  if (existingAdmin) {
    if (!existingAdmin.isAdmin) {
      existingAdmin.isAdmin = true
      existingAdmin.whitelisted = true
      await existingAdmin.save()
    }
    return existingAdmin
  }

  return User.create({
    uuid: randomUUID(),
    login: ADMIN_LOGIN,
    name: ADMIN_LOGIN,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    isAdmin: true,
    whitelisted: true,
    favorites: [],
  })
}

async function buildMediaList(viewer) {
  const mediaDocs = await Media.find({}).sort({ createdAt: -1 }).lean().exec()
  const visibleDocs = mediaDocs.filter((item) => canViewMedia(item, viewer))
  const authorUuids = Array.from(new Set(visibleDocs.map((item) => item.authorUuid)))
  const authors = await User.find({ uuid: { $in: authorUuids } })
    .select({ uuid: 1, name: 1, _id: 0 })
    .lean()
    .exec()

  const authorMap = new Map(authors.map((author) => [author.uuid, author.name]))
  const categoryMap = new Map()

  const items = visibleDocs.map((item) => {
    const categories = Array.isArray(item.categories) ? item.categories : []
    if (categories.length === 0) {
      const fallbackId = 'uncategorized'
      categoryMap.set(fallbackId, { id: fallbackId, name: fallbackId, count: 1 })
    }

    for (const category of categories) {
      const existing = categoryMap.get(category) || { id: category, name: category, count: 0 }
      existing.count += 1
      categoryMap.set(category, existing)
    }

    return {
      id: item.uuid,
      uuid: item.uuid,
      type: item.type,
      extension: item.extension,
      title: item.title,
      categories,
      categoryId: categories[0] || 'uncategorized',
      isPublic: Boolean(item.isPublic),
      src: `/api/media/${item.uuid}/file`,
      authorUuid: item.authorUuid,
      authorName: authorMap.get(item.authorUuid) || 'Unknown',
      canEdit: canEditMedia(item, viewer),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }
  })

  return {
    categories: Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    items,
  }
}

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const type = detectMediaType(file)
      if (!type) {
        cb(new Error('Unsupported media type'))
        return
      }

      const dir = getStorageDir(type)
      await ensureDir(dir)
      cb(null, dir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    const extension = getExtensionFromName(file.originalname)
    if (!extension) {
      cb(new Error('Unable to determine file extension'))
      return
    }

    const uuid = randomUUID()
    file.generatedMediaUuid = uuid
    cb(null, `${uuid}.${extension}`)
  },
})

const upload = multer({
  storage,
  limits: { files: 20 },
})

app.use('/api', attachCurrentUser)

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: toSafeUser(req.currentUser) })
})

app.post('/api/auth/register', async (req, res) => {
  const { login, password, name } = req.body || {}

  if (!isValidLogin(login)) {
    return res.status(400).json({ error: 'Login must contain 3-64 characters: letters, digits, _ or -' })
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Password must contain at least 6 characters' })
  }

  const existing = await User.findOne({ login }).exec()
  if (existing) {
    return res.status(409).json({ error: 'User already exists' })
  }

  const user = await User.create({
    uuid: randomUUID(),
    login,
    name: normalizeDisplayName(name, login),
    passwordHash: hashPassword(password),
    isAdmin: false,
    whitelisted: false,
    favorites: [],
  })

  const token = await createAuthToken(user)
  setSessionCookie(req, res, token)
  return res.status(201).json({ token, user: toSafeUser(user) })
})

app.post('/api/auth/login', async (req, res) => {
  const { login, password } = req.body || {}
  if (!isValidLogin(login) || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid credentials' })
  }

  const user = await User.findOne({ login }).exec()
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = await createAuthToken(user)
  setSessionCookie(req, res, token)
  return res.json({ token, user: toSafeUser(user) })
})

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const token = readBearerToken(req)
  if (token) {
    await Session.deleteOne({ tokenHash: hashToken(token) }).exec()
  }
  clearSessionCookie(req, res)
  return res.json({ success: true })
})

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Current and new passwords are required' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must contain at least 6 characters' })
  }
  if (!verifyPassword(currentPassword, req.currentUser.passwordHash)) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }

  req.currentUser.passwordHash = hashPassword(newPassword)
  await req.currentUser.save()
  await Session.deleteMany({ userUuid: req.currentUser.uuid }).exec()
  clearSessionCookie(req, res)
  return res.json({ success: true })
})

app.get('/api/media', async (req, res) => {
  try {
    const data = await buildMediaList(req.currentUser || null)
    res.json(data)
  } catch (error) {
    console.error('Failed to build media list', error)
    res.status(500).json({ error: 'Failed to build media list' })
  }
})

app.get('/api/media/:mediaUuid/file', async (req, res) => {
  const media = await Media.findOne({ uuid: req.params.mediaUuid }).lean().exec()
  if (!media) {
    return res.status(404).json({ error: 'Media not found' })
  }

  if (!canViewMedia(media, req.currentUser || null)) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const filePath = getMediaFilePath(media)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Media file not found on disk' })
  }

  return res.sendFile(filePath)
})

app.get('/api/users/me/favorites', requireAuth, async (req, res) => {
  res.json({ favorites: Array.isArray(req.currentUser.favorites) ? req.currentUser.favorites : [] })
})

app.post('/api/users/me/favorites', requireAuth, async (req, res) => {
  const { favorites } = req.body || {}
  if (!Array.isArray(favorites)) {
    return res.status(400).json({ error: 'favorites must be an array' })
  }

  const normalizedFavorites = favorites
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => value.trim())

  await User.updateOne(
    { uuid: req.currentUser.uuid },
    { $set: { favorites: Array.from(new Set(normalizedFavorites)) } },
  ).exec()

  return res.json({ success: true })
})

app.post('/api/media', requireUploaderAccess, upload.array('files', 20), async (req, res) => {
  const uploadedFiles = req.files || []
  if (uploadedFiles.length === 0) {
    return res.status(400).json({ error: 'File is required' })
  }

  try {
    let titles = []
    try {
      titles = JSON.parse(req.body?.titles || '[]')
    } catch {
      throw new Error('Invalid titles metadata')
    }
    if (!Array.isArray(titles)) {
      throw new Error('Titles must be an array')
    }

    const categories = parseCategories(req.body?.categories)
    const isPublic = parseBoolean(req.body?.isPublic, false)
    const records = uploadedFiles.map((file, index) => {
      const type = detectMediaType(file)
      const extension = getExtensionFromName(file.originalname)
      if (!type || !extension || !file.generatedMediaUuid) {
        throw new Error(`Unsupported media type: ${file.originalname}`)
      }

      const title = normalizeTitle(titles[index]) || path.parse(file.originalname).name.slice(0, 200)
      return {
        uuid: file.generatedMediaUuid,
        title,
        type,
        extension,
        categories,
        isPublic,
        authorUuid: req.currentUser.uuid,
      }
    })

    const mediaItems = await Media.insertMany(records)

    return res.status(201).json({
      success: true,
      items: mediaItems.map((media) => ({
        id: media.uuid,
        uuid: media.uuid,
        src: `/api/media/${media.uuid}/file`,
      })),
    })
  } catch (error) {
    await Promise.all(
      uploadedFiles.map((file) =>
        file.path && fs.existsSync(file.path) ? fsp.unlink(file.path).catch(() => {}) : Promise.resolve(),
      ),
    )
    return res.status(400).json({ error: error.message || 'Failed to upload media' })
  }
})

app.patch('/api/media/:mediaUuid', requireAuth, async (req, res) => {
  const media = await Media.findOne({ uuid: req.params.mediaUuid }).exec()
  if (!media) {
    return res.status(404).json({ error: 'Media not found' })
  }

  if (!canEditMedia(media, req.currentUser)) {
    return res.status(403).json({ error: 'Editing is allowed only for the author or administrator' })
  }

  const title = normalizeTitle(req.body?.title)
  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  media.title = title
  media.categories = parseCategories(req.body?.categories)
  media.isPublic = parseBoolean(req.body?.isPublic, media.isPublic)
  await media.save()

  return res.json({ success: true })
})

app.delete('/api/media/:mediaUuid', requireAuth, async (req, res) => {
  const media = await Media.findOne({ uuid: req.params.mediaUuid }).exec()
  if (!media) {
    return res.status(404).json({ error: 'Media not found' })
  }

  if (!canEditMedia(media, req.currentUser)) {
    return res.status(403).json({ error: 'Deleting is allowed only for the author or administrator' })
  }

  const filePath = getMediaFilePath(media)
  await Media.deleteOne({ uuid: media.uuid }).exec()
  if (fs.existsSync(filePath)) {
    await fsp.unlink(filePath).catch(() => {})
  }

  return res.json({ success: true })
})

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const query = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const userFilter = query
    ? {
        $or: [
          { login: { $regex: escapedQuery, $options: 'i' } },
          { name: { $regex: escapedQuery, $options: 'i' } },
        ],
      }
    : {}

  const users = await User.find(userFilter)
    .sort({ whitelisted: 1, createdAt: -1 })
    .limit(50)
    .select({ uuid: 1, login: 1, name: 1, isAdmin: 1, whitelisted: 1, createdAt: 1, updatedAt: 1, _id: 0 })
    .lean()
    .exec()

  res.json({ users })
})

app.patch('/api/admin/users/:userUuid', requireAuth, requireAdmin, async (req, res) => {
  const updates = {}
  if (typeof req.body?.whitelisted !== 'undefined') {
    updates.whitelisted = Boolean(req.body.whitelisted)
  }

  const user = await User.findOneAndUpdate(
    { uuid: req.params.userUuid },
    { $set: updates },
    { new: true },
  )
    .select({ uuid: 1, login: 1, name: 1, isAdmin: 1, whitelisted: 1, createdAt: 1, updatedAt: 1, _id: 0 })
    .lean()
    .exec()

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  return res.json({ user })
})

if (fs.existsSync(CLIENT_BUILD_DIR)) {
  app.use(express.static(CLIENT_BUILD_DIR))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next()
      return
    }
    res.sendFile(path.join(CLIENT_BUILD_DIR, 'index.html'))
  })
}

app.use((error, req, res, next) => {
  console.error(error)
  if (res.headersSent) {
    next(error)
    return
  }
  res.status(500).json({ error: error.message || 'Internal server error' })
})

async function start() {
  await ensureDir(VIDEO_STORAGE_DIR)
  await ensureDir(IMAGE_STORAGE_DIR)
  await connectMongo()
  await ensureAdminUser()

  app.listen(PORT, () => {
    console.log(`Media server listening on http://localhost:${PORT}`)
  })
}

void start()
