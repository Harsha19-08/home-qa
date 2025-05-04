import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  TextField,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';
import { requestNotificationPermission, showNotification } from '../utils/notifications';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function StudentMessages({ studentId }) {
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Request notification permission on component mount
  useEffect(() => {
    const enableNotifications = async () => {
      const enabled = await requestNotificationPermission();
      setNotificationsEnabled(enabled);
    };
    enableNotifications();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/messages/${studentId}`);
        const newMessages = response.data;
        
        // Check for new unread messages and show notifications
        if (notificationsEnabled) {
          const previousMessages = new Set(messages.map(m => m._id));
          
          newMessages.forEach(message => {
            if (!previousMessages.has(message._id) && message.status === 'unread') {
              showNotification('New Message from Parent', {
                body: message.message,
                tag: message._id, // Prevent duplicate notifications
                requireInteraction: true, // Keep notification until user interacts
                silent: false // Enable sound
              });
            }
          });
        }

        setMessages(newMessages);
        setLoading(false);

        // Mark unread messages as read
        const unreadMessages = newMessages.filter(msg => msg.status === 'unread');
        for (const msg of unreadMessages) {
          await axios.patch(`${API_BASE_URL}/api/messages/${msg._id}/read`);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages');
        setLoading(false);
      }
    };

    fetchMessages();
    // Set up polling for new messages
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [studentId, messages.length, notificationsEnabled]);

  const handleReply = async (messageId) => {
    if (!reply.trim()) return;

    try {
      setSendingReply(true);
      setError(null);

      const response = await axios.post(`${API_BASE_URL}/api/messages/${messageId}/reply`, {
        reply: reply.trim()
      });

      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? response.data : msg
      ));
      setReply('');
      setReplyingTo(null);

      // Show notification for successful reply
      if (notificationsEnabled) {
        showNotification('Reply Sent', {
          body: 'Your reply has been sent successfully',
          tag: 'reply-' + messageId,
        });
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      setError('Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography
        variant="h6"
        sx={{
          fontSize: { xs: '1.125rem', sm: '1.25rem' },
          fontWeight: 600,
          mb: 2,
          color: '#000',
        }}
      >
        Messages from Parents
      </Typography>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <List sx={{ 
        flex: 1,
        overflow: 'auto',
        maxHeight: { xs: '300px', lg: 'none' },
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: '#f1f1f1',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
          '&:hover': {
            background: '#555',
          },
        },
      }}>
        {messages.map((message) => (
          <ListItem
            key={message._id}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              mb: 1.5,
              p: 0,
            }}
          >
            <Card
              sx={{
                width: '100%',
                backgroundColor: message.status === 'unread' ? '#FFF8E7' : '#FFF',
                borderRadius: '8px',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
              }}
            >
              <CardContent sx={{ p: 1.5 }}>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: '0.875rem', sm: '1rem' },
                    color: '#000',
                    mb: 0.5,
                    wordBreak: 'break-word'
                  }}
                >
                  {message.message}
                </Typography>
                {message.reply && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                        color: '#666',
                        pl: 1.5,
                        borderLeft: '2px solid #FFA500',
                        wordBreak: 'break-word'
                      }}
                    >
                      {message.reply}
                    </Typography>
                  </>
                )}
                {!message.reply && replyingTo === message._id && (
                  <Box sx={{ mt: 1 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      placeholder="Type your reply..."
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      disabled={sendingReply}
                      size="small"
                      sx={{
                        mb: 1,
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={() => handleReply(message._id)}
                        disabled={sendingReply || !reply.trim()}
                        size="small"
                        sx={{
                          flex: 1,
                          py: 0.75,
                          backgroundColor: '#FFA500',
                          color: '#000',
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          '&:hover': {
                            backgroundColor: '#FF8C00',
                          }
                        }}
                      >
                        {sendingReply ? 'Sending...' : 'Send Reply'}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          setReplyingTo(null);
                          setReply('');
                        }}
                        size="small"
                        sx={{
                          py: 0.75,
                          borderColor: '#FFA500',
                          color: '#FFA500',
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          '&:hover': {
                            borderColor: '#FF8C00',
                            backgroundColor: 'rgba(255, 165, 0, 0.1)',
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                )}
                {!message.reply && replyingTo !== message._id && (
                  <Button
                    size="small"
                    onClick={() => setReplyingTo(message._id)}
                    sx={{
                      mt: 1,
                      color: '#FFA500',
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '&:hover': {
                        backgroundColor: 'rgba(255, 165, 0, 0.1)',
                      }
                    }}
                  >
                    Reply
                  </Button>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    textAlign: 'right',
                    mt: 0.5,
                    color: '#666',
                    fontSize: { xs: '0.75rem', sm: '0.8125rem' }
                  }}
                >
                  {new Date(message.createdAt).toLocaleTimeString(undefined, {
                    hour: 'numeric',
                    minute: 'numeric',
                    hour12: true
                  })}
                </Typography>
              </CardContent>
            </Card>
          </ListItem>
        ))}
        {messages.length === 0 && (
          <Typography
            variant="body2"
            sx={{
              color: '#666',
              textAlign: 'center',
              py: 2,
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }}
          >
            No messages yet
          </Typography>
        )}
      </List>
    </Box>
  );
}

export default StudentMessages; 