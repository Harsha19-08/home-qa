const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

// Get all messages for a student
router.get('/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const messages = await Message.find({ studentId })
      .sort({ createdAt: -1 })
      .limit(50); // Limit to last 50 messages for performance

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a new message (from parent)
router.post('/:studentId', auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const newMessage = new Message({
      studentId,
      sender: 'parent',
      message: message.trim()
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Reply to a message (from student)
router.post('/:messageId/reply', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({ message: 'Reply content is required' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.status === 'replied') {
      return res.status(400).json({ message: 'Message already replied to' });
    }

    message.reply = reply.trim();
    message.status = 'replied';
    await message.save();

    res.json(message);
  } catch (error) {
    console.error('Error replying to message:', error);
    res.status(500).json({ message: 'Error replying to message' });
  }
});

// Mark a message as read
router.patch('/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.status === 'unread') {
      message.status = 'read';
      await message.save();
    }

    res.json(message);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ message: 'Error marking message as read' });
  }
});

module.exports = router; 