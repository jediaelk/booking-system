# Chauffeur Booking System

A full-stack chauffeur booking platform with a FastAPI backend and React frontend.

## Stack

- **Backend**: FastAPI · SQLite (SQLAlchemy) · Python 3.11+
- **Frontend**: React 18 · TypeScript · Vite · Tailwind CSS

## Features

- **2 Service Tiers** — Premium & Ultra Premium (5 cars each, 10 total)
- **3-hour booking slots** with 30-min buffer (5 slots/day per tier)
- **Real-time availability** — slot selector only shows open cars
- **Booking form** — tier, date, time slot, pickup/dropoff, contact info
- **Approval workflow** — pending → approved/rejected, with email notifications
- **Calendar view** — monthly grid with booking status dots, click to inspect
- **History table** — searchable/filterable log of all bookings with status
- **Fleet view** — all 10 vehicles with utilization and confirmed bookings
- **Email notifications** — approver notified on new booking; client emailed on approval/rejection

## Quick Start

### 1. Backend

```bash
cd backend
pip install -r requirements.txt

# Configure email (optional — bookings work without it, emails are just logged)
cp .env.example .env
# Edit .env with your Gmail SMTP credentials (use an App Password)

uvicorn main:app --reload
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

## Time Slots

| Slot  | Label        | Window              |
|-------|--------------|---------------------|
| 07:00 | Morning      | 7:00 AM – 10:00 AM  |
| 10:30 | Late Morning | 10:30 AM – 1:30 PM  |
| 14:00 | Afternoon    | 2:00 PM – 5:00 PM   |
| 17:30 | Evening      | 5:30 PM – 8:30 PM   |
| 21:00 | Night        | 9:00 PM – Midnight  |

Each slot is 3 hours of service + 30-minute buffer. Up to 5 bookings per tier per slot.

## Email Setup (Gmail)

1. Enable 2FA on your Google account
2. Generate an **App Password** at myaccount.google.com/apppasswords
3. Add to `backend/.env`:
   ```
   SMTP_USER=your@gmail.com
   SMTP_PASSWORD=your-16-char-app-password
   APPROVER_EMAIL=jediaelk@gmail.com
   ```

Without SMTP credentials the app still works — emails are just logged as warnings.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/availability` | Available slots for date + tier |
| POST | `/api/bookings` | Create booking + email approver |
| GET | `/api/bookings` | List bookings (filterable by status/tier/date) |
| PATCH | `/api/bookings/{id}/approve` | Approve + email client confirmation |
| PATCH | `/api/bookings/{id}/reject` | Reject with optional reason + email client |
| PATCH | `/api/bookings/{id}/complete` | Mark job as completed |
| GET | `/api/fleet` | List all 10 vehicles |
| GET | `/api/stats` | Dashboard stats |
