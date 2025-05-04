import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Alert,
} from '@mui/material';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function ParentView() {
  const { studentId } = useParams();
  const [answers, setAnswers] = useState({});
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch questions
        const questionsResponse = await axios.get(`${API_BASE_URL}/api/questions`);
        setQuestions(questionsResponse.data);

        // Fetch student's answers
        const answersResponse = await axios.get(`${API_BASE_URL}/api/answers/${studentId}`);
        const answersMap = answersResponse.data.reduce((acc, curr) => {
          acc[curr.questionId] = curr.answer;
          return acc;
        }, {});
        setAnswers(answersMap);
        setLoading(false);
      } catch (error) {
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

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

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h1" gutterBottom align="center" color="primary">
        Student Status
      </Typography>

      <Box sx={{ mt: 4 }}>
        {questions.map((question) => (
          <Card key={question.id} sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {question.label}
              </Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                {answers[question.id] || 'Not answered yet'}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Last updated: {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Container>
  );
}

export default ParentView; 