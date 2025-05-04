import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Alert,
  Skeleton,
  useTheme,
  useMediaQuery,
  Grid,
  Divider,
  TextField,
  Button,
  List,
  ListItem,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Stack,
  Tooltip,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from '@mui/lab';
import SendIcon from '@mui/icons-material/Send';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';
import { requestNotificationPermission, showNotification } from '../utils/notifications';
import { useLanguage } from '../context/LanguageContext';
import { 
  initializeTransliteration, 
  handleInputTransliteration, 
  translateText, 
  detectLanguage 
} from '../utils/translation';

function ParentView() {
  const { translate, currentLanguage } = useLanguage();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { studentId } = useParams();
  
  // State management
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [autoTransliterate, setAutoTransliterate] = useState(true);
  
  // Translation state
  const [translatedAnswers, setTranslatedAnswers] = useState({});
  const [translatedMessages, setTranslatedMessages] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // Refs for tracking previous values
  const prevLangRef = useRef(currentLanguage);
  const maxRetries = 3;

  const [studentActivity, setStudentActivity] = useState([]);
  const [lastActive, setLastActive] = useState(null);

  // Initialize transliteration
  useEffect(() => {
    initializeTransliteration();
  }, []);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [questionsRes, answersRes] = await Promise.all([
          axios.get('http://localhost:5000/api/questions'),
          axios.get(`http://localhost:5000/api/answers/${studentId}`)
        ]);

        setQuestions(questionsRes.data);
        
        const answersMap = {};
        answersRes.data.forEach(answer => {
          answersMap[answer._id] = answer.answer;
        });
        
        setAnswers(answersMap);
        setTranslatedAnswers(answersMap); // Initialize with original answers
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        const errorMessage = error.response?.data?.message || 'An error occurred while loading the data.';
        setError(errorMessage);
        
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000 * (retryCount + 1));
        } else {
        setLoading(false);
      }
      }
    };

    fetchData();
  }, [studentId, retryCount]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/messages/${studentId}`);
        setMessages(response.data);
        setTranslatedMessages(response.data); // Initialize with original messages
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [studentId]);

  // Handle language change
  useEffect(() => {
    const translateContent = async () => {
      // Skip if no content to translate
      if (!Object.keys(answers).length && !messages.length) return;
      
      // Only translate if language has actually changed
      if (prevLangRef.current === currentLanguage) return;
      prevLangRef.current = currentLanguage;

      setIsTranslating(true);
      
      try {
        // Batch translate answers
        const answerPromises = Object.entries(answers)
          .filter(([_, answer]) => answer && detectLanguage(answer) !== currentLanguage)
          .map(async ([id, answer]) => [id, await translateText(answer, currentLanguage)]);
        
        const translatedAnswerEntries = await Promise.all(answerPromises);
        const newTranslatedAnswers = { ...answers };
        translatedAnswerEntries.forEach(([id, translation]) => {
          newTranslatedAnswers[id] = translation;
        });
        setTranslatedAnswers(newTranslatedAnswers);

        // Batch translate messages
        const messagePromises = messages
          .filter(msg => 
            (msg.message && detectLanguage(msg.message) !== currentLanguage) ||
            (msg.reply && detectLanguage(msg.reply) !== currentLanguage)
          )
          .map(async (msg) => {
            const translatedMsg = { ...msg };
            if (msg.message && detectLanguage(msg.message) !== currentLanguage) {
              translatedMsg.message = await translateText(msg.message, currentLanguage);
            }
            if (msg.reply && detectLanguage(msg.reply) !== currentLanguage) {
              translatedMsg.reply = await translateText(msg.reply, currentLanguage);
            }
            return translatedMsg;
          });

        const translatedMsgs = await Promise.all(messagePromises);
        const newTranslatedMessages = messages.map(msg => 
          translatedMsgs.find(tMsg => tMsg._id === msg._id) || msg
        );
        setTranslatedMessages(newTranslatedMessages);
      } catch (error) {
        console.error('Translation error:', error);
      } finally {
        setIsTranslating(false);
      }
    };

    translateContent();
  }, [currentLanguage]); // Only depend on language changes

  // Handle message input with transliteration
  const handleMessageChange = useCallback((e) => {
    const text = e.target.value;
    if (autoTransliterate && currentLanguage === 'te') {
      handleInputTransliteration(text, setNewMessage);
    } else {
      setNewMessage(text);
    }
  }, [autoTransliterate, currentLanguage]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      setMessageError(null);

      // Always store original message in English
      const messageToSend = currentLanguage === 'te' 
        ? await translateText(newMessage.trim(), 'en')
        : newMessage.trim();

      const response = await axios.post(`http://localhost:5000/api/messages/${studentId}`, {
        message: messageToSend
      });

      // Add message to state with translation if needed
      const translatedMessage = {
        ...response.data,
        message: currentLanguage === 'te' ? newMessage.trim() : messageToSend
      };

      setMessages(prev => [response.data, ...prev]);
      setTranslatedMessages(prev => [translatedMessage, ...prev]);
      setNewMessage('');

      if (notificationsEnabled) {
        showNotification(translate('message_sent'), {
          body: translatedMessage.message,
          tag: 'send-' + response.data._id,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessageError(translate('error_sending'));
    } finally {
      setSendingMessage(false);
    }
  };

  // Request notification permission on component mount
  useEffect(() => {
    const enableNotifications = async () => {
      const enabled = await requestNotificationPermission();
      setNotificationsEnabled(enabled);
    };
    enableNotifications();
  }, []);

  // Fetch messages with notifications
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/messages/${studentId}`);
        const newMessages = response.data;

        // Check for new replies and show notifications
        if (notificationsEnabled) {
          const previousMessages = new Map(messages.map(m => [m._id, m]));
          
          newMessages.forEach(message => {
            const previousMessage = previousMessages.get(message._id);
            // Show notification if:
            // 1. Message existed before AND
            // 2. Message didn't have a reply before but has one now
            if (previousMessage && 
                !previousMessage.reply && 
                message.reply) {
              showNotification('New Reply from Student', {
                body: message.reply,
                tag: 'reply-' + message._id,
                requireInteraction: true, // Keep notification until user interacts
                silent: false // Enable sound
              });
            }
          });
        }

        setMessages(newMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
    // Set up polling for new messages
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [studentId, messages.length, notificationsEnabled]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      const activities = [];
      const currentTime = new Date();

      Object.entries(answers).forEach(([questionId, answer]) => {
        if (answer) {
          activities.push({
            id: questionId,
            type: questionId,
            content: answer,
            time: currentTime
          });
        }
      });

      setStudentActivity(activities);
      setLastActive(currentTime);
    }
  }, [answers]);

  const getErrorMessage = (error) => {
    if (!error.response) {
      return 'Network error. Please check your internet connection.';
    }

    switch (error.response.status) {
      case 404:
        return 'No answers found for this student. The link might be invalid.';
      case 400:
        return 'Invalid student ID format.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An error occurred while loading the data. Please try again.';
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#FFF8E7',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#FFF8E7',
          py: { xs: 4, sm: 6, md: 8 },
          px: { xs: 2, sm: 4 },
        }}
      >
        <Container maxWidth="lg">
          <Alert 
            severity="error" 
            sx={{ 
              borderRadius: '12px',
              p: 3,
              '& .MuiAlert-message': { width: '100%' }
            }}
          >
            <Typography variant="h6" gutterBottom>
              {translate('error_loading')}
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
          {error}
        </Typography>
            {retryCount < maxRetries && (
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {translate('try_again')}
              </Typography>
            )}
          </Alert>
      </Container>
      </Box>
    );
  }

  // Get current time and format it
  const currentTime = new Date();
  const timeOptions = { 
    hour: 'numeric', 
    minute: 'numeric', 
    hour12: true 
  };
  const dateOptions = { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#FFF8E7',
        py: { xs: 2, sm: 3, md: 4 },
        px: { xs: 1, sm: 2, md: 3 },
      }}
    >
      <Container 
        maxWidth={false}
        sx={{ 
          height: '100%',
          maxWidth: '1600px',
          margin: '0 auto',
        }}
      >
        <Grid 
          container 
          spacing={{ xs: 2, sm: 3, md: 4 }}
          sx={{ height: '100%' }}
        >
          <Grid item xs={12} lg={8}>
            <Box sx={{ 
              mb: { xs: 2, sm: 3, md: 4 },
              maxWidth: '1000px',
            }}>
              <Typography 
                variant="h1" 
                component="h1"
                sx={{
                  fontSize: { xs: '1.75rem', sm: '2rem', md: '2.5rem' },
                  fontWeight: 800,
                  color: '#000',
                  mb: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {translate('student_status')}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  color: '#666',
                  maxWidth: '600px',
                }}
              >
                {translate('real_time_updates')}
              </Typography>
            </Box>

            {/* Status Overview Card */}
            <Card 
              sx={{ 
                borderRadius: '12px',
                backgroundColor: '#FFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                mb: 3,
                maxWidth: '1000px',
              }}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <InfoIcon sx={{ color: '#FFA500', mr: 1 }} />
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: '1.125rem', sm: '1.25rem' },
                      fontWeight: 600,
                      color: '#000',
                    }}
                  >
                    Status Overview
                  </Typography>
                </Box>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ 
                      bgcolor: '#FFF8E7', 
                      p: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      <AccessTimeIcon sx={{ color: '#FFA500', mb: 1 }} />
                      <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
                        Last Active
                      </Typography>
                      <Typography variant="h6" sx={{ textAlign: 'center' }}>
                        {lastActive ? new Date(lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Not available'}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ 
                      bgcolor: '#FFF8E7', 
                      p: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      <LocationOnIcon sx={{ color: '#FFA500', mb: 1 }} />
                      <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
                        Current Location
                      </Typography>
                      <Typography variant="h6" sx={{ textAlign: 'center' }}>
                        {answers['location'] || 'Not specified'}
                      </Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ 
                      bgcolor: '#FFF8E7', 
                      p: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                      <ScheduleIcon sx={{ color: '#FFA500', mb: 1 }} />
                      <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
                        Expected Return
                      </Typography>
                      <Typography variant="h6" sx={{ textAlign: 'center' }}>
                        {answers['return'] || 'Not specified'}
                      </Typography>
                    </Card>
                  </Grid>
                </Grid>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
                    Status Indicators:
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    <Chip 
                      icon={<CheckCircleIcon />}
                      label="Location Updated" 
                      color={answers['location'] ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip 
                      icon={<CheckCircleIcon />}
                      label="Activity Shared" 
                      color={answers['status'] ? 'success' : 'default'}
                      size="small"
                    />
                    <Chip 
                      icon={<CheckCircleIcon />}
                      label="Return Time Set" 
                      color={answers['return'] ? 'success' : 'default'}
                      size="small"
                    />
                  </Stack>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                    Recent Activity Timeline:
                  </Typography>
                  <Timeline sx={{ p: 0 }}>
                    {studentActivity.map((activity, index) => (
                      <TimelineItem key={activity.id}>
                        <TimelineSeparator>
                          <TimelineDot sx={{ bgcolor: '#FFA500' }} />
                          {index < studentActivity.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {activity.type === 'location' ? 'Location Update' :
                             activity.type === 'status' ? 'Status Update' :
                             'Return Time Update'}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {activity.content}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(activity.time).toLocaleTimeString()}
      </Typography>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                  </Timeline>
                </Box>
              </CardContent>
            </Card>

            {isTranslating && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {translate('translating')}
              </Alert>
            )}

            <Box sx={{ 
              display: 'grid',
              gap: { xs: 2, sm: 3 },
              gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fit, minmax(300px, 1fr))' },
              maxWidth: '1000px',
            }}>
              {questions.map((question, index) => (
                <Card 
                  key={question.id} 
                  sx={{ 
                    backgroundColor: '#FFF',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                    },
                    height: '100%',
                  }}
                >
                  <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          width: { xs: 28, sm: 32 },
                          height: { xs: 28, sm: 32 },
                          borderRadius: '50%',
                          backgroundColor: '#FFA500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 2,
                        }}
                      >
                        <Typography
                          sx={{
                            color: '#000',
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                            fontWeight: 600,
                          }}
                        >
                          {index + 1}
            </Typography>
                      </Box>
                      <Typography 
                        variant="h6" 
                        sx={{
                          fontSize: { xs: '1rem', sm: '1.25rem' },
                          fontWeight: 600,
                          color: '#000',
                        }}
                      >
                        {translate(question.id)}
            </Typography>
          </Box>
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        fontSize: { xs: '0.875rem', sm: '1rem' },
                        color: translatedAnswers[question.id] ? '#000' : '#666',
                        pl: { xs: '40px', sm: '44px' },
                      }}
                    >
                      {translatedAnswers[question.id] || translate('not_answered_yet')}
                    </Typography>
                  </CardContent>
                </Card>
        ))}
            </Box>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card 
              sx={{ 
                borderRadius: '12px',
                position: { xs: 'relative', lg: 'sticky' },
                top: { lg: 24 },
                backgroundColor: '#FFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                height: { xs: 'auto', lg: 'calc(100vh - 48px)' },
                display: 'flex',
                flexDirection: 'column',
                maxWidth: { lg: '400px' },
                width: '100%',
                ml: { lg: 'auto' },
              }}
            >
              <CardContent 
                sx={{ 
                  p: { xs: 2, sm: 3 },
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2,
                  flexWrap: 'wrap',
                  gap: 1
                }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontSize: { xs: '1.125rem', sm: '1.25rem' },
                      fontWeight: 600,
                      color: '#000',
                    }}
                  >
                    {translate('messages')}
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoTransliterate}
                        onChange={(e) => setAutoTransliterate(e.target.checked)}
                        color="primary"
                        size="small"
                      />
                    }
                    label={translate('auto_transliterate')}
                    sx={{ 
                      mr: 0,
                      '& .MuiFormControlLabel-label': {
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }
                    }}
                  />
                </Box>

                <Box sx={{ mb: 2, flex: '0 0 auto' }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    placeholder={translate('type_message')}
                    value={newMessage}
                    onChange={handleMessageChange}
                    disabled={sendingMessage}
                    sx={{
                      mb: 1.5,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#FFF',
                        borderRadius: '8px',
                        fontSize: { xs: '0.875rem', sm: '1rem' }
                      }
                    }}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    endIcon={<SendIcon />}
                    sx={{
                      py: 1,
                      backgroundColor: '#FFA500',
                      color: '#000',
                      '&:hover': {
                        backgroundColor: '#FF8C00',
                      },
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    {sendingMessage ? translate('sending') : translate('send_message')}
                  </Button>
                </Box>

                {messageError && (
                  <Alert 
                    severity="error" 
                    sx={{ mb: 2 }}
                    onClose={() => setMessageError(null)}
                  >
                    {messageError}
                  </Alert>
                )}

                <Divider sx={{ mb: 2 }} />

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
                  {translatedMessages.map((message) => (
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
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
    </Container>
    </Box>
  );
}

export default ParentView; 