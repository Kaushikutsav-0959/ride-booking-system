import requests
import random
import time
import threading

BASE_URL = "http://localhost:8080"
PASSWORD = "1234"
TOTAL_DRIVERS = 100
TOTAL_PASSENGERS = 100
MAX_ACTIVE_RIDES = 100

MAX_TOTAL_RIDES = 100

# deterministic buckets
TIMEOUT_BUCKET = 10
CANCEL_BUCKET = 10
REJECT_BUCKET = 10
# remaining → complete

BASE_LAT = 12.9716
BASE_LNG = 77.5946

drivers = []
passengers = []
ride_queue = []
active_rides = set()
passenger_active_ride = {}

total_rides_created = 0

def register_user(name, email, role):
    payload = {
        "name" : name,
        "email" : email,
        "password" : PASSWORD,
        "role": role
    }
    
    r = requests.post(f"{BASE_URL}/auth/register", json = payload)
    
    if r.status_code != 200:
        print("REGISTERATION FAILED: ", email, r.text)
    else:
        print("REGISTERATION OK: ", email)
        
def seed_users():
    
    print("Creating passengers...")
    
    for i in range(1,TOTAL_PASSENGERS + 1):
        register_user(
            f"Passenger {i}",
            f"passenger{i}@test.com",
            "PASSENGER"
        )

    print("Creating drivers...")
    
    for i in range(1,TOTAL_DRIVERS + 1):
        register_user(
            f"Driver {i}",
            f"driver{i}@test.com",
            "DRIVER"
        )
        
def login(email):
    
    payload = {
        "email" : email,
        "password" : PASSWORD
    }
    
    r = requests.post(f"{BASE_URL}/auth/login", json=payload)
    
    if r.status_code != 200:
        print("LOGIN FAILED: ", email)
        return None
    
    data = r.json()
    
    token = data.get("accessToken") or data.get("token")
    driver_id = data.get("driverId")
    user_id = data.get("userId")
    
    return token, driver_id, user_id

def load_drivers():
    
    for i in range(1,TOTAL_DRIVERS + 1):
        email = f"driver{i}@test.com"
        token, driver_id, user_id = login(email)
        drivers.append({
            "token":token,
            "driverId":driver_id,
            "email":email
        })
        
        print("DRIVER LOGGED IN: ", email, driver_id)
        set_driver_online(drivers[-1])
        
def load_passengers():
    
    for i in range(1,TOTAL_PASSENGERS + 1):
        
        email = f"passenger{i}@test.com"
        
        token, driver_id, user_id = login(email)
        
        passengers.append({
            "token":token,
            "userId":user_id,
            "email":email
        })
        
        print("PASSENGER LOGGED IN: ", email)
        
def set_driver_online(driver):
    
    headers = {"Authorization": f"Bearer {driver['token']}"}

    r = requests.post(
        f"{BASE_URL}/drivers/{driver['driverId']}/status",
        params={"status": "ONLINE"},
        headers=headers
    )

    if r.status_code == 200:
        print("DRIVER ONLINE:", driver["driverId"])
    else:
        print("FAILED TO SET DRIVER ONLINE:", driver["driverId"], r.status_code, r.text)
    
def driver_location_worker(driver):
    
    headers = {"Authorization": f"Bearer {driver['token']}"}
    
    while True:
        
        lat = BASE_LAT + random.uniform(-0.03, 0.03)
        lng = BASE_LNG + random.uniform(-0.03, 0.03)
        
        payload = {
            "latitude": lat,
            "longitude": lng
        }
        
        r = requests.patch(
            f"{BASE_URL}/drivers/location",
            json=payload,
            headers=headers
        )
        
        if r.status_code == 200:
            print("LOCATION OK", driver["driverId"])
        else:
            print("LOCATION FAILED", r.text)
            
        time.sleep(5)
        
def driver_heartbeat_worker(driver):

    headers = {"Authorization": f"Bearer {driver['token']}"}

    while True:
        try:
            r = requests.post(
                f"{BASE_URL}/drivers/heartbeat",
                headers=headers
            )

            if r.status_code == 200:
                print("HEARTBEAT OK", driver["driverId"])
            else:
                print("HEARTBEAT FAILED", driver["driverId"], r.status_code, r.text)
                print("HEADERS SENT:", headers)

        except Exception as e:
            print("HEARTBEAT ERROR", driver["driverId"], e)

        time.sleep(5)
        
def passenger_worker(passenger):
    
    headers = {"Authorization": f"Bearer {passenger['token']}"}
    
    while True:
        global total_rides_created

        if total_rides_created >= MAX_TOTAL_RIDES:
            time.sleep(5)
            continue

        # prevent passenger from creating multiple simultaneous rides
        if passenger["userId"] in passenger_active_ride:
            time.sleep(3)
            continue

        # throttling ride generation so simulator does not flood the system
        if len(active_rides) >= MAX_ACTIVE_RIDES:
            time.sleep(3)
            continue
        
        pickup_lat = BASE_LAT + random.uniform(-0.02, 0.02)
        pickup_lng = BASE_LNG + random.uniform(-0.02, 0.02)
        
        drop_lat = BASE_LAT + random.uniform(-0.02, 0.02)
        drop_lng = BASE_LNG + random.uniform(-0.02, 0.02)
        
        payload = {
            "pickupLat":pickup_lat,
            "pickupLong":pickup_lng,
            "dropLat":drop_lat,
            "dropLong":drop_lng
        }
        
        r = requests.post(
            f"{BASE_URL}/rides/request",
            json=payload,
            headers=headers
        )
        
        if r.status_code == 200:
            data = r.json()
           
            ride_id = data.get("rideId") or data.get("id") or data.get("ride_id")

            if ride_id is None:
                print("RIDE CREATED BUT ID MISSING:", data)
            else:
                eligible = data.get("eligibleDrivers") or []
                ride_queue.append({
                    "rideId": ride_id,
                    "eligibleDrivers": eligible,
                    "status": "REQUESTED",
                    "createdAt": time.time()
                })
                active_rides.add(ride_id)
                passenger_active_ride[passenger["userId"]] = ride_id
                total_rides_created += 1

                # assign deterministic type
                if total_rides_created <= TIMEOUT_BUCKET:
                    ride_queue[-1]["type"] = "TIMEOUT"
                elif total_rides_created <= TIMEOUT_BUCKET + CANCEL_BUCKET:
                    ride_queue[-1]["type"] = "CANCEL"
                elif total_rides_created <= TIMEOUT_BUCKET + CANCEL_BUCKET + REJECT_BUCKET:
                    ride_queue[-1]["type"] = "REJECT"
                else:
                    ride_queue[-1]["type"] = "COMPLETE"
                print("RIDE CREATED:", ride_id, "ELIGIBLE:", eligible)
        else:
            print("RIDE CREATION FAILED: ",r.status_code, r.text)
            
        time.sleep(random.randint(10,30))
        
def driver_accept_worker(driver):
    headers = {"Authorization":f"Bearer {driver['token']}"}
    
    while True:
        ride = None

        # pick first REQUESTED ride safely (avoid multiple drivers grabbing same ride)
        for r in ride_queue:
            if r.get("status") == "REQUESTED":
                ride = r
                break

        if not ride:
            time.sleep(1)
            continue

        ride_id = ride["rideId"]
        eligible = ride.get("eligibleDrivers", [])

        if eligible and driver["driverId"] not in eligible:
            time.sleep(2)
            continue

        # skip if already assigned
        if ride.get("status") != "REQUESTED":
            time.sleep(1)
            continue

        # 30% chance to reject instead of accept
        if ride.get("type") == "REJECT":
            print("REJECTED BY DRIVER:", ride_id)
            ride["status"] = "REJECTED"
            try:
                ride_queue.remove(ride)
            except:
                pass
            active_rides.discard(ride_id)
            for user_id, r_id in list(passenger_active_ride.items()):
                if r_id == ride_id:
                    del passenger_active_ride[user_id]
            time.sleep(2)
            continue

        r = requests.post(
            f"{BASE_URL}/rides/{ride_id}/accept",
            headers=headers
        )

        if r.status_code == 200:
            print("ACCEPTED:", ride_id)
            ride["status"] = "ASSIGNED"
            ride["driverId"] = driver["driverId"]
            ride["driverToken"] = driver["token"]

            # DO NOT remove from queue → lifecycle worker needs it
            active_rides.discard(ride_id)
        else:
            print("RIDE ACCEPT FAILED: ", ride_id, r.status_code)

        time.sleep(random.randint(5,15))
        
def ride_lifecycle_worker():
    while True:
        for ride in list(ride_queue):
            ride_id = ride["rideId"]
            status = ride.get("status")
            created_at = ride.get("createdAt", time.time())

            try:
                # timeout logic (FAILED)
                if status == "REQUESTED" and ride.get("type") == "TIMEOUT" and time.time() - created_at > 5:
                    print(f"[SIM] Ride {ride_id} TIMED OUT → FAILED")
                    requests.post(
                        f"{BASE_URL}/rides/{ride_id}/fail"
                    )
                    ride["status"] = "FAILED"
                    ride_queue.remove(ride)
                    active_rides.discard(ride_id)
                    # remove passenger mapping
                    for user_id, r_id in list(passenger_active_ride.items()):
                        if r_id == ride_id:
                            del passenger_active_ride[user_id]
                    continue

                # simulate user cancellation (20%)
                if status == "REQUESTED" and ride.get("type") == "CANCEL":
                    print(f"[SIM] Ride {ride_id} CANCELLED BY USER")
                    requests.post(
                        f"{BASE_URL}/rides/{ride_id}/cancel"
                    )
                    ride["status"] = "CANCELLED"
                    ride_queue.remove(ride)
                    active_rides.discard(ride_id)
                    for user_id, r_id in list(passenger_active_ride.items()):
                        if r_id == ride_id:
                            del passenger_active_ride[user_id]
                    continue

                if status == "ASSIGNED":
                    print(f"[SIM] Ride {ride_id} → STARTING")
                    driverId = ride.get("driverId")

                    if not driverId:
                        print(f"[SIM] Missing driverId for ride {ride_id}, cannot start")
                        continue

                    r = requests.post(
                        f"{BASE_URL}/rides/{ride_id}/start",
                        params={"driverId": driverId},
                        headers={"Authorization": f"Bearer {ride['driverToken']}"}
                    )
                    
                    if r.status_code == 200:
                        ride["status"] = "STARTED"
                        print(f"[SIM] Ride {ride_id} → STARTED (backend accepted)")
                        print(f"[SIM DEBUG] Driver {driverId} started ride {ride_id}")
                    else:
                        print(f"[SIM] START FAILED for {ride_id}", r.status_code, r.text)
                        continue

                elif status == "STARTED":
                    print(f"[SIM] Ride {ride_id} → IN_PROGRESS (trip ongoing)")
                    time.sleep(7)

                    print(f"[SIM] Ride {ride_id} → REACHED DROP, COMPLETING")

                    driverId = ride.get("driverId")
                    token = ride.get("driverToken")

                    if not token:
                        print(f"[SIM] Missing driverToken for {ride_id}, cannot complete")
                        continue

                    r = requests.post(
                        f"{BASE_URL}/rides/{ride_id}/complete",
                        params={"driverId": driverId},
                        headers={"Authorization": f"Bearer {token}"}
                    )

                    if r.status_code == 200:
                        ride["status"] = "COMPLETED"
                        ride_queue.remove(ride)
                        for user_id, r_id in list(passenger_active_ride.items()):
                            if r_id == ride_id:
                                del passenger_active_ride[user_id]
                    else:
                        print(f"[SIM] COMPLETE FAILED for {ride_id}", r.status_code, r.text)

            except Exception as e:
                print("LIFECYCLE ERROR", e)

        time.sleep(1)

def start():
    seed_users()
    load_drivers()
    load_passengers()
    
    for driver in drivers:
        threading.Thread(
            target=driver_location_worker,
            args=(driver,)
        ).start()

        threading.Thread(
            target=driver_heartbeat_worker,
            args=(driver,)
        ).start()
        
        threading.Thread(
            target=driver_accept_worker,
            args=(driver,)
        ).start()
    
    threading.Thread(target=ride_lifecycle_worker).start()
        
    for passenger in passengers:
        threading.Thread(
            target=passenger_worker,
            args=(passenger,)
        ).start()
        
if __name__ == "__main__":
    start()