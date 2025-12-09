import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const PORT = process.env.PORT

// Prefer production MongoDB connection string from env var; fallback to local for development
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streetpaws_db';
const JWT_SECRET = process.env.JWT_SECRET || 'please_change_me';

// Setup Mongoose schemas & connection
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  // optional profile image stored as base64 (small images only)
  profileImageData: { type: String, default: null },
  profileImageType: { type: String, default: null },
  profileImageUrl: { type: String, default: null },
}, { timestamps: { createdAt: 'createdAt' } });

const petSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: String,
  type: String,
  age: String,
  location: String,
  distance: Number,
  description: String,
  imageUrl: String,
  // Store uploaded images as base64 (when user uploads from gallery)
  imageData: { type: String, default: null },
  imageType: { type: String, default: null },
  // Traits and comments persisted on the pet document
  traits: { type: String, default: '' },
  comments: [{ id: String, text: String, author: String, createdAt: Date }],
  contactNumber: String,
  postedAt: { type: Date, default: Date.now },
  urgency: { type: String, default: 'Medium' },
  status: { type: String, default: 'Available' },
  donationUrl: String,
  cheers: { type: Number, default: 0 },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const User = mongoose.model('User', userSchema);
const Pet = mongoose.model('Pet', petSchema);
function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function initDb() {
  // Register connection event handlers
  mongoose.connection.on('connected', () => console.log('Mongoose connected to', MONGO_URI));
  mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err && err.message ? err.message : err));
  mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected'));

  try {
    console.log('Attempting MongoDB connection to', MONGO_URI);
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected successfully');
    return true;
  } catch (err) {
    console.error('Database connection failed:', err && err.message ? err.message : err);
    // Do not throw — allow the server to start and operate in degraded mode
    return false;
  }
}

const app = express();
// CORS allow frontend deployment domain
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://streetpawss.up.railway.app',
  ],
  credentials: true
}));
// allow larger payloads for base64 image uploads (e.g. a few MBs)
// Allow larger payloads for base64 image uploads (increase from 10mb)
app.use(express.json({ limit: '50mb' }));
// Also parse urlencoded bodies in case the client sends multipart-like forms
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function signToken(user) {
async function authenticate(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace(/^Bearer\s+/, '');
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
}}

app.post('/api/signup', async (req, res) => {
app.post('/api/login', async (req, res) => {
// Authentication endpoints removed: app no longer exposes signup/login routes.
// Existing protected routes still respect Authorization header when present.

app.get('/api/pets', async (req, res) => {
  try {
    // populate author with name and avatar fields for convenience
    const pets = await Pet.find({}).sort({ postedAt: -1 }).lean();
    // fetch author info for each pet (batch by unique author ids)
    const authorIds = Array.from(new Set(pets.map(p => p.author ? p.author.toString() : null).filter(Boolean)));
    const authors = await User.find({ _id: { $in: authorIds } }).lean();
    const authorMap = {};
    authors.forEach(a => { authorMap[a._id.toString()] = { id: a._id.toString(), name: a.name, email: a.email, profileImageData: a.profileImageData || null, profileImageType: a.profileImageType || null, profileImageUrl: a.profileImageUrl || null }; });
    const out = pets.map(p => {
      const pid = p._id.toString();
      const authorId = p.author ? p.author.toString() : null;
      const author = authorId ? authorMap[authorId] || null : null;
      return { ...p, id: pid, authorId, author };
    });
    res.json({ pets: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch pets' });
  }
});

app.post('/api/pets', authenticate, async (req, res) => {
  const p = req.body;
  console.log('POST /api/pets payload keys:', Object.keys(p));
  if (p.imageData) {
    console.log('imageData length', p.imageData.length, 'imageType', p.imageType);
    if (p.imageData.length > 5 * 1024 * 1024) {
      console.warn('Warning: imageData is large (>5MB). Consider resizing before upload.');
    }
  }
  try {
    let authorId = null;
    const auth = req.headers.authorization || '';
    const token = auth.replace(/^Bearer\s+/, '');
    if (token) {
      try {
        const data = jwt.verify(token, JWT_SECRET);
        authorId = data?.id || null;
      } catch (e) {
        authorId = null;
      }
    }

    const newPet = await Pet.create({
      author: authorId,
      name: p.name,
      type: p.type,
      age: p.age,
      location: p.location,
      distance: p.distance || 0,
      description: p.description,
      imageUrl: p.imageUrl || null,
      imageData: p.imageData || null,
      imageType: p.imageType || null,
      traits: p.traits || '',
      comments: p.comments || [],
      contactNumber: p.contactNumber,
      postedAt: p.postedAt ? new Date(p.postedAt) : new Date(),
      urgency: p.urgency || 'Medium',
      status: p.status || 'Available',
      donationUrl: p.donationUrl || null,
      cheers: p.cheers || 0
    });
    const petObj = newPet.toObject();
    const author = petObj.author ? await User.findById(petObj.author).lean() : null;
    const out = { ...petObj, id: petObj._id.toString(), authorId: petObj.author ? petObj.author.toString() : null, author: author ? { id: author._id.toString(), name: author.name, profileImageData: author.profileImageData || null, profileImageType: author.profileImageType || null, profileImageUrl: author.profileImageUrl || null } : null };
    res.json({ pet: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create pet' });
  }
});

// Update pet (owner only)
app.patch('/api/pets/:id', authenticate, async (req, res) => {
  const petId = req.params.id;
  const updates = req.body || {};
  try {
    const pet = await Pet.findById(petId).lean();
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    // Only the owner (author) can update
    if (!pet.author || pet.author.toString() !== req.user.id) return res.status(403).json({ error: 'Not permitted' });

    const set = {};
    // only allow certain fields
    ['name','type','age','location','description','imageUrl','imageData','imageType','contactNumber','urgency','status','donationUrl','cheers','traits','comments'].forEach(k => {
      if (typeof updates[k] !== 'undefined') set[k] = updates[k];
    });

    const updated = await Pet.findByIdAndUpdate(petId, set, { new: true }).lean();
    const author = updated.author ? await User.findById(updated.author).lean() : null;
    const out = { ...updated, id: updated._id.toString(), authorId: updated.author ? updated.author.toString() : null, author: author ? { id: author._id.toString(), name: author.name, profileImageData: author.profileImageData || null, profileImageType: author.profileImageType || null, profileImageUrl: author.profileImageUrl || null } : null };
    res.json({ pet: out });
  } catch (err) {
    console.error('Failed updating pet', err);
    res.status(500).json({ error: 'Could not update pet' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  try {
    const gkey = process.env.API_KEY;
    if (!gkey) {
      const fallback = `AI assistant temporarily unavailable. Here are some concise general tips for common street-animal questions:\n\n- Keep the animal warm, quiet, and hydrated. Offer clean water and a small amount of easy-to-digest food.\n- For wounds, gently clean with saline or clean water and cover with a clean cloth. Seek vet care for deep wounds.\n- If the animal is distressed or aggressive, do not force contact; call local animal rescue.\n- For suspected poisoning, try to identify the substance and call a poison control or vet immediately.\n\nIf you want more specific advice, provide details (injuries, behavior, species, location).`;
      return res.json({ reply: fallback });
    }
    const ai = new GoogleGenAI({ apiKey: gkey });
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `You are a helpful veterinary assistant for street animals. Give concise, safe, and practical advice. User Question: ${message}` });
    res.json({ reply: response?.text || '' });
  } catch (err) {
    console.error(err);
    const fallbackErr = `I'm sorry — the AI assistant encountered an error. Here are general care tips: keep the animal warm, hydrated, and seek veterinary help for injuries or poisoning.`;
    res.json({ reply: fallbackErr });
  }
});

// Update current authenticated user profile (name, email, password)
app.patch('/api/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, password, profileImageData, profileImageType, profileImageUrl } = req.body;
    const updates = {};
    if (typeof name === 'string') updates.name = name;
    if (typeof email === 'string') {
      // ensure email uniqueness
      const existing = await User.findOne({ email }).lean();
      if (existing && existing._id.toString() !== userId) return res.status(400).json({ error: 'Email already in use' });
      updates.email = email;
    }
    if (typeof password === 'string' && password.length > 0) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    // profile image updates (client may send base64 or a remote URL)
    if (typeof profileImageData === 'string') updates.profileImageData = profileImageData;
    if (typeof profileImageType === 'string') updates.profileImageType = profileImageType;
    if (typeof profileImageUrl === 'string') updates.profileImageUrl = profileImageUrl;

    const updated = await User.findByIdAndUpdate(userId, updates, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: 'User not found' });

    res.json({ user: { id: updated._id.toString(), name: updated.name, email: updated.email, joinedAt: updated.createdAt, profileImageData: updated.profileImageData || null, profileImageType: updated.profileImageType || null, profileImageUrl: updated.profileImageUrl || null } });
  } catch (err) {
    console.error('Failed updating profile', err);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

// Start
// Start
(async () => {
  try {
    await initDb();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
})();
