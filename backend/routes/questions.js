const express = require('express');
const router = express.Router();
const Question = require('../models/Question');

// Get all questions with translations
router.get('/', async (req, res) => {
  try {
    const questions = await Question.find().sort('order');
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
});

// Get questions for a specific language
router.get('/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const supportedLanguages = ['en', 'te'];
    
    if (!supportedLanguages.includes(lang)) {
      return res.status(400).json({ message: 'Unsupported language' });
    }

    const questions = await Question.find().sort('order');
    const translatedQuestions = questions.map(q => ({
      id: q.id,
      label: q.translations[lang],
      order: q.order
    }));

    res.json(translatedQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
});

module.exports = router; 