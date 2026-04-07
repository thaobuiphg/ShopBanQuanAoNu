require('./db');
process.env.TZ = 'Asia/Ho_Chi_Minh';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());
app.use(express.static('public'));


// ===================== MODELS =====================

// USER
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  role: Number
}));

// PRODUCT
const Product = mongoose.model('Product', new mongoose.Schema({
  product_name: String,
  price: Number,
  image_url: String,
  price_promotion: Number,
  detail: String,
  collection_id: String,
  status: Number,
  created_at: { type: Date, default: Date.now }
}));

// ===================== UPLOAD =====================

const UPLOAD_ROOT = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_ROOT),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, unique + '-' + file.originalname);
  }
});
const upload = multer({ storage });


// ===================== AUTH =====================

async function checkLogin(username, password) {
  const user = await User.findOne({ username });
  if (!user) return { error: 'Tên đăng nhập không tồn tại' };

  const match = await bcrypt.compare(password, user.password);
  if (!match) return { error: 'Sai mật khẩu' };

  return { user };
}

app.post('/api/auth/admin-login', async (req, res) => {
  const { username, password } = req.body;
  const { user, error } = await checkLogin(username, password);

  if (error) return res.status(401).json({ message: error });
  if (user.role !== 1) return res.status(403).json({ message: 'Không phải admin' });

  res.json({ message: 'Login OK', username: user.username });
});

app.post('/api/auth/user-login', async (req, res) => {
  const { username, password } = req.body;
  const { user, error } = await checkLogin(username, password);

  if (error) return res.status(401).json({ message: error });

  res.json({
    message: 'Login OK',
    username: user.username,
    user_id: user._id
  });
});


// ===================== USERS =====================

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '-password');
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const { username, password, email, role } = req.body;

  const exist = await User.findOne({ username });
  if (exist) return res.status(400).json({ message: 'User tồn tại' });

  const hash = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    password: hash,
    email,
    role: role || 0
  });

  res.json(user);
});

app.delete('/api/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.sendStatus(200);
});


// ===================== PRODUCTS =====================

app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const p = await Product.create(req.body);
  res.json(p);
});

app.put('/api/products/:id', async (req, res) => {
  await Product.findByIdAndUpdate(req.params.id, req.body);
  res.sendStatus(200);
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.sendStatus(200);
});


// ===================== UPLOAD =====================

app.post('/api/upload', upload.single('image'), (req, res) => {
  res.json({ image_url: `/uploads/${req.file.filename}` });
});


// ===================== TEST =====================

app.get('/test', async (req, res) => {
  await Product.create({
    product_name: "Áo test",
    price: 100000,
    image_url: "test.jpg"
  });
  res.send("OK Mongo");
});


// ===================== START =====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));