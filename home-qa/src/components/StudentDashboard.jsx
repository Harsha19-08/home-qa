import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Card,
  CardContent,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import QRCode from 'qrcode.react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function StudentDashboard() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentId] = useState(() => {
    // Generate a unique student ID if not exists
    const existingId = localStorage.getItem('studentId');
    if (existingId) return existingId;
    const newId = `student_${Date.now()}`;
    localStorage.setItem('studentId', newId);
    return newId;
  });

  // Debug log when component mounts
  useEffect(() => {
    console.log('Component mounted with studentId:', studentId);
  }, [studentId]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/questions`);
        console.log('Fetched questions:', response.data);
        setQuestions(response.data);
        // Initialize answers object with empty strings for each question
        const initialAnswers = response.data.reduce((acc, question) => {
          acc[question.id] = '';
          return acc;
        }, {});
        console.log('Initialized answers:', initialAnswers);
        setAnswers(initialAnswers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching questions:', error);
        setError('Failed to load questions');
        setLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleAnswerChange = (questionId, value) => {
    console.log('Answer changed:', { questionId, value });
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate studentId
      if (!studentId) {
        console.error('No studentId available');
        setError('Student ID is missing. Please refresh the page and try again.');
        return;
      }

      // Ensure all questions have an answer (even if empty)
      const answersArray = questions.map(question => ({
        questionId: question.id,
        answer: answers[question.id] || ''
      }));

      // Create the request payload
      const payload = {
        studentId: studentId,
        answers: answersArray
      };

      // Log the data being sent
      console.log('Sending data:', payload);

      // Send the request
      const response = await axios.post(`${API_BASE_URL}/api/answers`, payload);

      console.log('Server response:', response.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving answers:', error);
      console.error('Error details:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to save answers');
      setTimeout(() => setError(null), 3000);
    }
  };

  const qrValue = `${window.location.origin}/view/${studentId}`;

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom align="center" color="primary">
        Home Q&A Dashboard
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h2" gutterBottom>
              Update Your Status
            </Typography>
            {questions.map((question) => (
              <TextField
                key={question.id}
                fullWidth
                label={question.label}
                variant="outlined"
                margin="normal"
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                multiline
                rows={2}
              />
            ))}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={saved}
                size="large"
              >
                {saved ? 'Saved!' : 'Save Answers'}
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Share with Parents
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <QRCode value={qrValue} size={200} />
              </Box>
              <Typography variant="body2" color="text.secondary" align="center">
                Scan this QR code to view your answers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={!!error}
        autoHideDuration={3000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={saved}
        autoHideDuration={3000}
        onClose={() => setSaved(false)}
      >
        <Alert severity="success" onClose={() => setSaved(false)}>
          Answers saved successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default StudentDashboard; 