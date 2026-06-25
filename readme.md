# LegalEase Backend API

LegalEase Backend powers the LegalEase platform, providing authentication, lawyer management, hiring workflows, payments, comments, and administrative operations.

---

## Features

### Authentication

* Better Auth Integration
* JWT Authorization
* Secure API endpoints
* Role-based access control

### Lawyer Management

* Lawyer registration
* Lawyer profile management
* Lawyer approval workflow
* Specialization management

### Hiring System

* Create hire requests
* Approve/reject requests
* Hiring history
* Client-lawyer communication support

### Payment System

* Payment tracking
* Revenue analytics
* Transaction history

### Comments & Reviews

* User reviews
* Lawyer ratings
* Review validation

### Admin System

* User management
* Lawyer management
* Platform analytics
* Transaction oversight

---

## Tech Stack

### Backend

* Node.js
* Express.js

### Database

* MongoDB
* Mongoose

### Authentication

* Better Auth
* JWT

### Security

* bcrypt
* CORS
* Environment Variables

---

## Installation

Clone repository:

```bash
git clone <backend-repository-url>
```

Install dependencies:

```bash
npm install
```

Create environment file:

```env
PORT=5000

MONGODB_URI=

BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

STRIPE_SECRET_KEY=

CLIENT_URL=http://localhost:3000
```

Start development server:

```bash
npm run dev
```

Server runs on:

```text
http://localhost:5000
```

---

## API Modules

### Authentication

```text
/api/auth/*
```

### Users

```text
/api/user/*
```

### Lawyers

```text
/api/lawyer/*
```

### Hiring Requests

```text
/api/hiring-request/*
```

### Payments

```text
/api/payments/*
```

### Comments

```text
/api/comments/*
```

### Admin

```text
/api/admin/*
```

---

## Deployment

Production deployment supported on:

* VPS
* Railway
* Render
* DigitalOcean
* AWS
* Azure

Build:

```bash
npm install
npm start
```

---

## Security

* JWT Authentication
* Protected Routes
* Role Validation
* Request Validation
* Environment Variable Protection

---

## Contributors

Developed by Jaber

---

## License

This project is licensed for educational and commercial use.
