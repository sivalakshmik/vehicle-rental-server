import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// 🔐 Login route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: {
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

 //Register route

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  console.log('📥 Register attempt:', { name, email, password });

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('⚠️ User already exists');
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({ name, email, password });
    console.log('✅ User created:', user);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


export default router;