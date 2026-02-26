import enum
from sqlalchemy import Column, Integer, String, DateTime, Date, Enum as SQLEnum, Text, Boolean
from sqlalchemy.sql import func
from database import Base


class TierEnum(str, enum.Enum):
    premium = "premium"
    ultra_premium = "ultra_premium"


class StatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class Car(Base):
    __tablename__ = "cars"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    plate = Column(String, unique=True, nullable=False)
    tier = Column(SQLEnum(TierEnum), nullable=False)
    is_active = Column(Boolean, default=True)


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String, nullable=False)
    client_email = Column(String, nullable=False)
    client_phone = Column(String, nullable=False)
    pickup_location = Column(String, nullable=False)
    dropoff_location = Column(String, nullable=False)
    passengers = Column(Integer, default=1)
    special_requests = Column(Text, nullable=True)
    tier = Column(SQLEnum(TierEnum), nullable=False)
    booking_date = Column(Date, nullable=False)
    time_slot = Column(String, nullable=False)
    status = Column(SQLEnum(StatusEnum), default=StatusEnum.pending, nullable=False)
    car_id = Column(Integer, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
