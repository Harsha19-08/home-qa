const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const { auth } = require('./middleware/auth');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection with retry logic
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://22r21a12h1:22r21a12h1@home.1hlkyj8.mongodb.net/home-qa?retryWrites=true&w=majority&appName=home';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Question Schema
const questionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  order: { type: Number, required: true },
  translations: {
    en: { type: String },
    te: { type: String }
  }
});

// Answer Schema
const answerSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  questionId: { type: String, required: true },
  answer: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Create indexes for better query performance
answerSchema.index({ studentId: 1, timestamp: -1 });
answerSchema.index({ questionId: 1 });

const Question = mongoose.model('Question', questionSchema);
const Answer = mongoose.model('Answer', answerSchema);

// Initialize default questions if none exist
const initializeQuestions = async () => {
  try {
    const count = await Question.countDocuments();
    if (count === 0) {
      const defaultQuestions = [
        {
          id: 'where_are_you',
          order: 1,
          translations: {
            en: 'Where are you?',
            te: 'మీరు ఎక్కడ ఉన్నారు?'
          }
        },
        {
          id: 'what_are_you_doing',
          order: 2,
          translations: {
            en: 'What are you doing?',
            te: 'మీరు ఏమి చేస్తున్నారు?'
          }
        },
        {
          id: 'when_will_you_return',
          order: 3,
          translations: {
            en: 'When will you return?',
            te: 'మీరు ఎప్పుడు తిరిగి వస్తారు?'
          }
        }
      ];
      await Question.insertMany(defaultQuestions);
      console.log('Default questions initialized with translations');
    }
  } catch (error) {
    console.error('Error initializing questions:', error);
  }
};

initializeQuestions();

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Routes
// Get all questions
app.get('/api/questions', auth, async (req, res, next) => {
  try {
    const questions = await Question.find().sort({ order: 1 });
    res.json(questions);
  } catch (error) {
    next(error);
  }
});

// Save answers for a student
app.post('/api/answers', auth, async (req, res, next) => {
  try {
    console.log('Raw request body:', req.body);
    
    // Extract studentId and answers from request body
    const { studentId, answers } = req.body;
    
    // Log incoming request for debugging
    console.log('Processed request:', { 
      studentId, 
      answers,
      studentIdType: typeof studentId,
      answersType: typeof answers,
      isAnswersArray: Array.isArray(answers)
    });
    
    // Validate request format
    if (!studentId || typeof studentId !== 'string') {
      console.error('Invalid studentId:', { 
        studentId, 
        type: typeof studentId,
        isString: typeof studentId === 'string'
      });
      return res.status(400).json({ 
        message: 'Invalid studentId. Must be a non-empty string.' 
      });
    }

    if (!answers || !Array.isArray(answers)) {
      console.error('Invalid answers format:', { 
        answers, 
        type: typeof answers,
        isArray: Array.isArray(answers)
      });
      return res.status(400).json({ 
        message: 'Invalid answers format. Must be an array.' 
      });
    }

    // Get all valid question IDs
    const questions = await Question.find();
    const validQuestionIds = questions.map(q => q.id);
    console.log('Valid question IDs:', validQuestionIds);

    // Validate each answer
    for (const answer of answers) {
      if (!answer.questionId || !validQuestionIds.includes(answer.questionId)) {
        console.error('Invalid question ID:', answer.questionId);
        return res.status(400).json({
          message: `Invalid question ID: ${answer.questionId}`,
          validQuestionIds
        });
      }
      if (typeof answer.answer !== 'string') {
        console.error('Invalid answer format:', answer);
        return res.status(400).json({
          message: `Invalid answer format for question ${answer.questionId}. Must be a string.`
        });
      }
    }

    // Create answer documents
    const answerDocs = answers.map(answer => ({
      studentId,
      questionId: answer.questionId,
      answer: answer.answer.trim()
    }));

    console.log('Attempting to save answers:', answerDocs);

    // Save answers
    const savedAnswers = await Answer.insertMany(answerDocs);
    console.log('Successfully saved answers:', savedAnswers);
    res.status(201).json(savedAnswers);
  } catch (error) {
    console.error('Error saving answers:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'Duplicate answer found'
      });
    }
    next(error);
  }
});

// Get answers for a specific student
app.get('/api/answers/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Get the latest answers for each question
    const answers = await Answer.aggregate([
      { $match: { studentId } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$questionId',
          answer: { $first: '$answer' },
          timestamp: { $first: '$timestamp' }
        }
      }
    ]);

    if (answers.length === 0) {
      return res.status(404).json({ 
        message: 'No answers found for this student',
        studentId 
      });
    }

    res.json(answers);
  } catch (error) {
    next(error);
  }
});

// Get all answers (for admin purposes)
app.get('/api/answers', async (req, res, next) => {
  try {
    const answers = await Answer.find()
      .sort({ timestamp: -1 });
    res.json(answers);
  } catch (error) {
    next(error);
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);

// Apply error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 