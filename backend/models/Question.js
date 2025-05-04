const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  order: {
    type: Number,
    required: true
  },
  translations: {
    en: {
      type: String,
      required: true
    },
    te: {
      type: String,
      required: true
    }
  }
});

const Question = mongoose.model('Question', questionSchema);

module.exports = Question; 