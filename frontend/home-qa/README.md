# Home Q&A System

A simple Q&A system for students to share their status with parents through QR codes.

## Features

- Student dashboard to input answers to predefined questions
- QR code generation for sharing answers
- Parent view to see student's answers
- Real-time updates
- Modern, user-friendly interface

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or a cloud instance)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following content:
   ```
   MONGODB_URI=mongodb://localhost:27017/home-qa
   PORT=5000
   ```

4. Start the backend server:
   ```bash
   cd server
   node index.js
   ```

5. In a new terminal, start the frontend development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173`

## Usage

1. As a student:
   - Open the dashboard
   - Fill in your answers to the questions
   - Click "Save Answers"
   - Share the QR code with your parents

2. As a parent:
   - Scan the QR code
   - View the student's answers in real-time

## Technologies Used

- Frontend:
  - React
  - Vite
  - Material-UI
  - QRCode.react
  - Axios

- Backend:
  - Node.js
  - Express
  - MongoDB
  - Mongoose
