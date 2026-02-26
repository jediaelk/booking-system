import os
from datetime import date
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import schemas
from database import Base, engine, get_db
from models import Booking, Car, TierEnum, StatusEnum
from email_service import notify_approver, notify_client_submitted, notify_approval, notify_rejection

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Chauffeur Booking API", version="1.0.0")

_cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:4173").split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TIME_SLOTS = ["09:00", "12:00", "14:00"]
CARS_PER_TIER = 5


# ─── Startup seed ────────────────────────────────────────────────────────────

def _seed_fleet(db: Session):
    if db.query(Car).count() > 0:
        return
    cars = [
        # Premium
        Car(name="Mercedes E-Class", plate="PRM-001", tier=TierEnum.premium),
        Car(name="BMW 5 Series", plate="PRM-002", tier=TierEnum.premium),
        Car(name="Audi A6", plate="PRM-003", tier=TierEnum.premium),
        Car(name="Volvo S90", plate="PRM-004", tier=TierEnum.premium),
        Car(name="Lexus ES 350", plate="PRM-005", tier=TierEnum.premium),
        # Ultra Premium
        Car(name="Mercedes S-Class", plate="ULT-001", tier=TierEnum.ultra_premium),
        Car(name="BMW 7 Series", plate="ULT-002", tier=TierEnum.ultra_premium),
        Car(name="Rolls-Royce Ghost", plate="ULT-003", tier=TierEnum.ultra_premium),
        Car(name="Bentley Flying Spur", plate="ULT-004", tier=TierEnum.ultra_premium),
        Car(name="Range Rover Autobiography", plate="ULT-005", tier=TierEnum.ultra_premium),
    ]
    db.add_all(cars)
    db.commit()


def _seed_bookings(db: Session):
    if db.query(Booking).count() > 0:
        return

    from datetime import timedelta
    import random

    random.seed(42)

    names = [
        ("James Whitfield", "james.whitfield@email.com", "+44 7700 900101"),
        ("Sophie Hargreaves", "sophie.h@outlook.com", "+44 7700 900202"),
        ("Marcus Chen", "m.chen@gmail.com", "+44 7911 223344"),
        ("Olivia Bennett", "olivia.b@icloud.com", "+44 7800 555666"),
        ("Daniel Okafor", "d.okafor@company.co.uk", "+44 7712 334455"),
        ("Priya Sharma", "priya.sharma@gmail.com", "+44 7811 667788"),
        ("Tom Gallagher", "tom.g@hotmail.com", "+44 7922 445566"),
        ("Isabella Moore", "i.moore@gmail.com", "+44 7700 123456"),
        ("Ethan Williams", "ethan.w@email.com", "+44 7833 556677"),
        ("Charlotte Davis", "c.davis@outlook.com", "+44 7744 778899"),
        ("Liam Foster", "liam.f@gmail.com", "+44 7855 223344"),
        ("Amelia Johnson", "amelia.j@company.com", "+44 7766 445566"),
    ]
    pickups = [
        "1 Canada Square, Canary Wharf, London",
        "The Shard, 32 London Bridge St, London",
        "Claridge's Hotel, Brook Street, London",
        "10 Downing Street, Westminster, London",
        "Selfridges, 400 Oxford Street, London",
        "Mandarin Oriental, 66 Knightsbridge, London",
        "Goldman Sachs, 25 Shoe Lane, London",
        "Four Seasons Hotel, Hamilton Place, London",
    ]
    dropoffs = [
        "Heathrow Airport, Terminal 5",
        "Gatwick Airport, South Terminal",
        "St Pancras International, London",
        "Eurostar Terminal, Waterloo, London",
        "Royal Lancaster Hotel, Bayswater, London",
        "Soho House, 76 Dean Street, London",
        "The Dorchester, Park Lane, London",
        "London City Airport, Royal Docks",
    ]

    today = date.today()

    # 10 bookings spread across last 3 days
    seed_data = [
        (0, names[0],  pickups[0], dropoffs[0], TierEnum.ultra_premium, "09:00", StatusEnum.pending,   2, None),
        (0, names[1],  pickups[2], dropoffs[3], TierEnum.premium,       "14:00", StatusEnum.approved,  1, "Meet & greet please"),
        (0, names[2],  pickups[4], dropoffs[1], TierEnum.premium,       "12:00", StatusEnum.pending,   3, None),
        (1, names[3],  pickups[1], dropoffs[4], TierEnum.ultra_premium, "12:00", StatusEnum.approved,  2, None),
        (1, names[4],  pickups[5], dropoffs[2], TierEnum.premium,       "14:00", StatusEnum.completed, 1, "Child seat required"),
        (1, names[5],  pickups[6], dropoffs[7], TierEnum.ultra_premium, "09:00", StatusEnum.rejected,  2, None),
        (2, names[6],  pickups[3], dropoffs[5], TierEnum.premium,       "09:00", StatusEnum.completed, 4, None),
        (2, names[7],  pickups[7], dropoffs[0], TierEnum.premium,       "12:00", StatusEnum.completed, 1, "Extra luggage space"),
        (2, names[8],  pickups[0], dropoffs[6], TierEnum.ultra_premium, "14:00", StatusEnum.approved,  2, None),
        (2, names[11], pickups[2], dropoffs[3], TierEnum.premium,       "14:00", StatusEnum.completed, 3, None),
    ]

    bookings = [
        Booking(
            client_name=name, client_email=email, client_phone=phone,
            pickup_location=pickup, dropoff_location=dropoff,
            tier=tier, booking_date=today - timedelta(days=days_ago),
            time_slot=slot, status=status,
            passengers=pax, special_requests=notes,
        )
        for days_ago, (name, email, phone), pickup, dropoff, tier, slot, status, pax, notes
        in seed_data
    ]

    db.add_all(bookings)
    db.commit()


@app.on_event("startup")
async def startup():
    db = next(get_db())
    try:
        _seed_fleet(db)
        _seed_bookings(db)
    finally:
        db.close()


# ─── Availability ─────────────────────────────────────────────────────────────

@app.get("/api/availability")
def get_availability(
    booking_date: date = Query(...),
    tier: str = Query(...),
    db: Session = Depends(get_db),
):
    active = [StatusEnum.pending, StatusEnum.approved]
    bookings = (
        db.query(Booking)
        .filter(
            Booking.booking_date == booking_date,
            Booking.tier == tier,
            Booking.status.in_(active),
        )
        .all()
    )
    slot_counts = {s: 0 for s in TIME_SLOTS}
    for b in bookings:
        if b.time_slot in slot_counts:
            slot_counts[b.time_slot] += 1

    return {
        "date": str(booking_date),
        "tier": tier,
        "available_slots": [s for s, c in slot_counts.items() if c < CARS_PER_TIER],
        "slots_detail": {s: CARS_PER_TIER - c for s, c in slot_counts.items()},
    }


# ─── Bookings ─────────────────────────────────────────────────────────────────

@app.post("/api/bookings", response_model=schemas.BookingResponse, status_code=201)
def create_booking(data: schemas.BookingCreate, db: Session = Depends(get_db)):
    active = [StatusEnum.pending, StatusEnum.approved]
    taken = (
        db.query(Booking)
        .filter(
            Booking.booking_date == data.booking_date,
            Booking.tier == data.tier,
            Booking.time_slot == data.time_slot,
            Booking.status.in_(active),
        )
        .count()
    )
    if taken >= CARS_PER_TIER:
        raise HTTPException(status_code=409, detail="No cars available for this slot")

    booking = Booking(**data.model_dump())
    db.add(booking)
    db.commit()
    db.refresh(booking)

    try:
        notify_client_submitted(booking)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"Client submitted email failed: {exc}")

    try:
        notify_approver(booking)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"Approver email failed: {exc}")

    return booking


@app.get("/api/bookings", response_model=List[schemas.BookingResponse])
def list_bookings(
    status: Optional[str] = None,
    tier: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Booking)
    if status:
        q = q.filter(Booking.status == status)
    if tier:
        q = q.filter(Booking.tier == tier)
    if start_date:
        q = q.filter(Booking.booking_date >= start_date)
    if end_date:
        q = q.filter(Booking.booking_date <= end_date)
    return q.order_by(Booking.created_at.desc()).all()


@app.get("/api/bookings/{booking_id}", response_model=schemas.BookingResponse)
def get_booking(booking_id: int, db: Session = Depends(get_db)):
    b = db.query(Booking).filter(Booking.id == booking_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found")
    return b


@app.patch("/api/bookings/{booking_id}/approve", response_model=schemas.BookingResponse)
def approve_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status != StatusEnum.pending:
        raise HTTPException(status_code=400, detail="Only pending bookings can be approved")

    # Assign an available car for this slot
    active = [StatusEnum.pending, StatusEnum.approved]
    occupied_car_ids = [
        b.car_id
        for b in db.query(Booking)
        .filter(
            Booking.booking_date == booking.booking_date,
            Booking.tier == booking.tier,
            Booking.time_slot == booking.time_slot,
            Booking.status.in_(active),
            Booking.id != booking.id,
        )
        .all()
        if b.car_id
    ]
    car = (
        db.query(Car)
        .filter(Car.tier == booking.tier, Car.is_active == True, Car.id.notin_(occupied_car_ids))
        .first()
    )
    if car:
        booking.car_id = car.id

    booking.status = StatusEnum.approved
    db.commit()
    db.refresh(booking)

    try:
        notify_approval(booking)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"Approval email failed: {exc}")

    return booking


@app.patch("/api/bookings/{booking_id}/reject", response_model=schemas.BookingResponse)
def reject_booking(
    booking_id: int, action: schemas.ApprovalAction, db: Session = Depends(get_db)
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking.status = StatusEnum.rejected
    booking.rejection_reason = action.reason
    db.commit()
    db.refresh(booking)

    try:
        notify_rejection(booking)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning(f"Rejection email failed: {exc}")

    return booking


@app.patch("/api/bookings/{booking_id}/complete", response_model=schemas.BookingResponse)
def complete_booking(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking.status = StatusEnum.completed
    db.commit()
    db.refresh(booking)
    return booking


# ─── Fleet ───────────────────────────────────────────────────────────────────

@app.get("/api/fleet", response_model=List[schemas.CarResponse])
def get_fleet(db: Session = Depends(get_db)):
    return db.query(Car).order_by(Car.tier, Car.id).all()


# ─── Stats ───────────────────────────────────────────────────────────────────

@app.get("/api/daily-stats")
def get_daily_stats(days: int = 30, db: Session = Depends(get_db)):
    from datetime import timedelta
    today = date.today()
    result = []
    for i in range(days - 1, -1, -1):
        d = today - timedelta(days=i)
        count = db.query(Booking).filter(Booking.booking_date == d).count()
        result.append({"date": str(d), "count": count})
    return result


@app.get("/api/stats", response_model=schemas.StatsResponse)
def get_stats(db: Session = Depends(get_db)):
    from datetime import date as today_date
    today = today_date.today()
    return {
        "total_bookings": db.query(Booking).count(),
        "pending": db.query(Booking).filter(Booking.status == StatusEnum.pending).count(),
        "approved": db.query(Booking).filter(Booking.status == StatusEnum.approved).count(),
        "completed": db.query(Booking).filter(Booking.status == StatusEnum.completed).count(),
        "rejected": db.query(Booking).filter(Booking.status == StatusEnum.rejected).count(),
        "today_bookings": db.query(Booking)
            .filter(Booking.booking_date == today, Booking.status.in_([StatusEnum.pending, StatusEnum.approved]))
            .count(),
        "today_remaining": (len(TIME_SLOTS) * 2 * CARS_PER_TIER) - db.query(Booking)
            .filter(Booking.booking_date == today, Booking.status.in_([StatusEnum.pending, StatusEnum.approved]))
            .count(),
    }
