import requests
import random
import time
import threading

BASE_URL = "http://localhost:8080"
PASSWORD = "1234"
TOTAL_DRIVERS = 200
TOTAL_PASSENGERS = 200

BASE_LAT = 12.9716
BASE_LNG = 77.5946

drivers = []
passengers = []
ride_queue = []  # each item: {"rideId": int, "eligibleDrivers": [ids]}

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
        
def passenger_worker(passenger):
    
    headers = {"Authorization": f"Bearer {passenger['token']}"}
    
    while True:
        
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
                    "eligibleDrivers": eligible
                })
                print("RIDE CREATED:", ride_id, "ELIGIBLE:", eligible)
        else:
            print("RIDE CREATION FAILED: ",r.status_code, r.text)
            
        time.sleep(random.randint(10,30))
        
def driver_accept_worker(driver):
    headers = {"Authorization":f"Bearer {driver['token']}"}
    
    while True:
        if ride_queue:
            
            ride = random.choice(ride_queue)
            ride_id = ride["rideId"]
            eligible = ride.get("eligibleDrivers", [])

            if eligible and driver["driverId"] not in eligible:
                time.sleep(2)
                continue
            
            r = requests.post(
                f"{BASE_URL}/rides/{ride_id}/accept",
                headers=headers
            )
            
            if r.status_code == 200:
                print("ACCEPTED: ",ride_id)
            else:
                print("RIDE ACCEPT FAILED: ",ride_id, r.status_code)
                
        time.sleep(random.randint(5,15))
        
        
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
            target=driver_accept_worker,
            args=(driver,)
        ).start()
        
    for passenger in passengers:
        threading.Thread(
            target=passenger_worker,
            args=(passenger,)
        ).start()
        
if __name__ == "__main__":
    start()