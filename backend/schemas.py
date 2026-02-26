from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class TierEnum(str, Enum):
    premium = "premium"
    ultra_premium = "ultra_premium"


class StatusEnum(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    completed = "completed"


class BookingCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    pickup_location: str
    dropoff_location: str
    passengers: int = 1
    special_requests: Optional[str] = None
    tier: TierEnum
    booking_date: date
    time_slot: str


class BookingResponse(BaseModel):
    id: int
    client_name: str
    client_email: str
    client_phone: str
    pickup_location: str
    dropoff_location: str
    passengers: int
    special_requests: Optional[str]
    tier: TierEnum
    booking_date: date
    time_slot: str
    status: StatusEnum
    car_id: Optional[int]
    rejection_reason: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ApprovalAction(BaseModel):
    reason: Optional[str] = None


class CarResponse(BaseModel):
    id: int
    name: str
    plate: str
    tier: TierEnum
    is_active: bool

    model_config = {"from_attributes": True}


class StatsResponse(BaseModel):
    total_bookings: int
    pending: int
    approved: int
    completed: int
    rejected: int
    today_bookings: int
    today_remaining: int
