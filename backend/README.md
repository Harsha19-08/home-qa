# Home Q&A System Backend

Backend server for the Home Q&A System that handles data storage and API endpoints.

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or a cloud instance)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the `env` directory with the following content:
   ```
   MONGODB_URI=mongodb://localhost:27017/home-qa
   PORT=5000
   ```

3. Start the server:
   ```bash
   # For development with auto-reload
   npm run dev

   # For production
   npm start
   ```

## API Endpoints

### GET /api/questions
Get all predefined questions, sorted by order.

Response:
```json
[
  {
    "id": "string",
    "label": "string",
    "order": number
  }
]
```

### POST /api/answers
Save new answers for a student.

Request body:
```json
{
  "studentId": "string",
  "answers": [
    {
      "questionId": "string",
      "answer": "string"
    }
  ]
}
```

### GET /api/answers/:studentId
Get the latest answers for a specific student.

Response:
```json
[
  {
    "studentId": "string",
    "questionId": "string",
    "answer": "string",
    "timestamp": "date"
  }
]
```

### GET /api/answers
Get all answers (for admin purposes), sorted by timestamp (newest first).

## Features

- Predefined questions with automatic initialization
- Student-specific answer storage
- Latest answer retrieval for QR code viewing
- Input validation and error handling
- Timestamp tracking for all answers

## Technologies Used

- Node.js
- Express
- MongoDB
- Mongoose
- CORS
- dotenv 