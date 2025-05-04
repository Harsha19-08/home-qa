const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/home-qa')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Answer Schema
const answerSchema = new mongoose.Schema({
  questionId: String,
  answer: String,
  timestamp: { type: Date, default: Date.now }
});

const Answer = mongoose.model('Answer', answerSchema);

// Routes
app.post('/api/answers', async (req, res) => {
  try {
    const answers = await Answer.create(req.body);
    res.status(201).json(answers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/answers', async (req, res) => {
  try {
    const answers = await Answer.find().sort({ timestamp: -1 });
    res.json(answers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 