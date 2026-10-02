# Software Requirement Specification (SRS)
## Project Title: TripWise – AI-based Travel Itinerary Generator

### 1. Introduction
**TripWise** is a full-stack travel planning platform that helps users generate smart travel itineraries based on destination, dates, budget, interests, and other preferences.

### 2. Functional Requirements
- User authentication (Sign up, Login, Logout)
- Select destination, budget, interests, and dates
- Generate itinerary with day-wise plan
- Save & download itinerary as PDF
- View popular destinations & suggestions
- Admin dashboard for managing content

### 3. Non-Functional Requirements
- Responsive design (desktop/mobile)
- Scalable backend (Node.js + MongoDB)
- Fast loading time (< 3 sec)
- Secure APIs with JWT

### 4. Tech Stack
- Frontend: React.js
- Backend: Node.js, Express.js
- Database: MongoDB Atlas
- Mobile App: React Native (Phase 2)
- Hosting: Render (backend), Vercel/Netlify (frontend)

### 5. Users
- Normal User: Can generate, save, view, and download itineraries
- Admin: Can view analytics, manage destinations, moderate content

### 6. Future Enhancements
- Travel booking API integration
- Social sharing of itineraries
- AI Chatbot recommendations
- Premium memberships