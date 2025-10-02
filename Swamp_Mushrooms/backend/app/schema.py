from pydantic import BaseModel, Field, validator
from typing import List, Optional
from math import pi

class BeaconScanItem(BaseModel):
    beacon_id: str
    rssi: int

class ScanMessage(BaseModel):
    device_id: str
    scan: List[BeaconScanItem]
    timestamp_us: int
    seq: Optional[int] = None
