import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Snackbar,
  Chip,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import { QRCode } from 'react-qr-code';
import axios from 'axios';
import StudentMessages from './StudentMessages';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import TipsAndUpdatesIcon from '@mui/icons-material/TipsAndUpdates';
import TimerIcon from '@mui/icons-material/Timer';

function StudentDashboard() {
  const [studentId, setStudentId] = useState('');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [activityStats, setActivityStats] = useState({
    totalUpdates: 0,
    lastLocation: '',
    averageResponseTime: '5 min'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get student ID from local storage or generate a new one
        let id = localStorage.getItem('studentId');
        if (!id) {
          const response = await axios.post('http://localhost:5000/api/auth/register', {
            email: `student${Date.now()}@example.com`,
            password: 'tempPass123!',
            name: 'Student'
          });
          id = response.data.user.studentId;
          localStorage.setItem('studentId', id);
        }
        setStudentId(id);

        // Fetch questions
        const questionsResponse = await axios.get('http://localhost:5000/api/questions');
        setQuestions(questionsResponse.data);

        // Fetch existing answers
        const answersResponse = await axios.get(`http://localhost:5000/api/answers/${id}`);
        const answersMap = {};
        answersResponse.data.forEach(answer => {
          answersMap[answer._id] = answer.answer;
        });
        setAnswers(answersMap);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        const errorMessage = getErrorMessage(error);
        setError(errorMessage);
        
        if (retryCount < maxRetries) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000 * (retryCount + 1)); // Exponential backoff
        } else {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [retryCount]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      setLastUpdateTime(new Date());
      setActivityStats(prev => ({
        ...prev,
        totalUpdates: prev.totalUpdates + 1,
        lastLocation: answers['location'] || prev.lastLocation
      }));
    }
  }, [answers]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const getErrorMessage = (error) => {
    if (!error.response) {
      return 'Network error. Please check your internet connection.';
    }

    switch (error.response.status) {
      case 404:
        return 'Student ID not found. Please refresh the page.';
      case 400:
        return 'Invalid data format. Please check your answers.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return 'An error occurred while saving. Please try again.';
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const answersArray = questions.map(question => ({
        questionId: question.id,
        answer: answers[question.id] || ''
      }));

      const payload = {
        studentId: studentId,
        answers: answersArray
      };

      await axios.post('http://localhost:5000/api/answers', payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving answers:', error);
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);

      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          handleSubmit();
        }, 2000 * (retryCount + 1));
      }
    } finally {
      setIsSaving(false);
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
                HOME Q&A DASHBOARD
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  color: '#666',
                  maxWidth: '600px',
                }}
              >
                Keep your family updated about your whereabouts and activities
              </Typography>
            </Box>

            <Box sx={{ 
              maxWidth: '1000px',
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 2, sm: 3 },
            }}>
              <Card
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#FFF',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <TipsAndUpdatesIcon sx={{ color: '#FFA500', mr: 1 }} />
                    <Typography
                      variant="h6"
                      sx={{
                        fontSize: { xs: '1.125rem', sm: '1.25rem' },
                        fontWeight: 600,
                        color: '#000',
                      }}
                    >
                      Activity Overview
                    </Typography>
                  </Box>
                  
                  <Grid container spacing={2}>
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
                          Last Update
                        </Typography>
                        <Typography variant="h6" sx={{ textAlign: 'center' }}>
                          {lastUpdateTime ? new Date(lastUpdateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'No updates yet'}
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
                          Updates Today
                        </Typography>
                        <Typography variant="h6" sx={{ textAlign: 'center' }}>
                          {activityStats.totalUpdates}
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
                        <TimerIcon sx={{ color: '#FFA500', mb: 1 }} />
                        <Typography variant="body2" sx={{ mb: 1, textAlign: 'center' }}>
                          Avg. Response Time
                        </Typography>
                        <Typography variant="h6" sx={{ textAlign: 'center' }}>
                          {activityStats.averageResponseTime}
                        </Typography>
                      </Card>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: '#666' }}>
                      Quick Tips:
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                      <Chip 
                        label="Regular Updates" 
                        variant="outlined" 
                        size="small"
                        sx={{ borderColor: '#FFA500', color: '#000' }}
                      />
                      <Chip 
                        label="Be Specific" 
                        variant="outlined" 
                        size="small"
                        sx={{ borderColor: '#FFA500', color: '#000' }}
                      />
                      <Chip 
                        label="Stay Connected" 
                        variant="outlined" 
                        size="small"
                        sx={{ borderColor: '#FFA500', color: '#000' }}
                      />
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

              <Card
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#FFF',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: '1.125rem', sm: '1.25rem' },
                      fontWeight: 600,
                      mb: 2,
                      color: '#000',
                    }}
                  >
                    Update Your Status
                  </Typography>

                  <Box sx={{ 
                    display: 'grid',
                    gap: { xs: 2, sm: 3 },
                  }}>
                    {questions.map((question) => (
                      <TextField
                        key={question.id}
                        fullWidth
                        label={question.label}
                        variant="outlined"
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        multiline
                        rows={2}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: { xs: '0.875rem', sm: '1rem' },
                          }
                        }}
                      />
                    ))}
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={isSaving || saved}
                    sx={{
                      mt: 3,
                      py: 1.5,
                      backgroundColor: '#FFA500',
                      color: '#000',
                      fontSize: { xs: '0.875rem', sm: '1rem' },
                      '&:hover': {
                        backgroundColor: '#FF8C00',
                      }
                    }}
                  >
                    {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Answers'}
                  </Button>
                </CardContent>
              </Card>

              <Card
                sx={{
                  borderRadius: '12px',
                  backgroundColor: '#FFF',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                }}
              >
                <CardContent sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: { xs: '1.125rem', sm: '1.25rem' },
                      fontWeight: 600,
                      mb: 2,
                      color: '#000',
                    }}
                  >
                    Share with Parents
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      backgroundColor: '#FFF',
                      p: { xs: 1, sm: 2 },
                      maxWidth: '400px',
                      margin: '0 auto',
                    }}
                  >
                    <QRCode
                      value={`${window.location.origin}/parent/${studentId}`}
                      size={200}
                      level="H"
                      style={{ 
                        maxWidth: '100%',
                        width: '100%',
                        maxHeight: '200px',
                        height: 'auto',
                      }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      color: '#666',
                      mt: 2,
                    }}
                  >
                    Scan this QR code to view your answers
                  </Typography>
                </CardContent>
              </Card>
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
                  overflow: 'hidden',
                }}
              >
                <StudentMessages studentId={studentId} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          onClose={() => setError(null)}
          sx={{ 
            width: '100%',
            borderRadius: '8px',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Error Saving Answers
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
          {retryCount > 0 && retryCount < maxRetries && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Retrying... Attempt {retryCount} of {maxRetries}
            </Typography>
          )}
        </Alert>
      </Snackbar>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setSaved(false)}
          sx={{ 
            width: '100%',
            borderRadius: '8px',
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Success!
          </Typography>
          <Typography variant="body2">
            Your answers have been saved successfully.
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default StudentDashboard; 