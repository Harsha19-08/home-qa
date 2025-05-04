const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: String,
    required: true,
    enum: ['parent', 'student']
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  reply: {
    type: String,
    trim: true,
    default: null
  },
  status: {
    type: String,
    enum: ['unread', 'read', 'replied'],
    default: 'unread'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

messageSchema.index({ studentId: 1, createdAt: -1 });
messageSchema.index({ status: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 