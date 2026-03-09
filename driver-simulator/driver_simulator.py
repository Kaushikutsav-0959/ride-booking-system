import requests
import random
import time
import threading

BASE_URL = "http://localhost:8080"

DRIVER_PASSWORD ="1234"
TOTAL_DRIVERS = 15

BASE_LAT = 12.9716
BASE_LONG = 77.5946

def login_driver(email):
    url = f"{BASE_URL}/auth/login"
    
    payload = {
        "email": email,
        "password":DRIVER_PASSWORD
    }
    
    response = requests.post(url, json=payload)
    
    if response.status_code != 200:
        print(f"[LOGIN FAILED] {email} -> {response.text}")
        return None
    
    data = response.json()
    token = data.get("token") or data.get("accessToken") or data.get("jwt")
    driver_id = data.get("driverId")

    if not token:
        print(f"[LOGIN FAILED - NO TOKEN] {email} -> {data}")
        return None, None
    
    if not driver_id:
        print(f"[LOGIN WARNING - NO DRIVER ID] {email} -> {data} ")

    print(f"[LOGIN OK] {email} (driverId={driver_id})")
    print("[DEBUG LOGIN RESPONSE]", response.json())
    return token, driver_id

def update_location(token, driver_id, driver_num):
    url = f"{BASE_URL}/drivers/location"
    
    headers = {"Authorization": f"Bearer {token}"}
    
    lat = BASE_LAT + random.uniform(-0.02, 0.02)
    lng = BASE_LONG + random.uniform(-0.02, 0.02)
    
    payload = {
        "latitude": lat,
        "longitude": lng
    }
    
    response = requests.patch(url, json=payload, headers=headers)
    
    if response.status_code != 200:
        print(f"[LOC FAIL] driver {driver_num} (id={driver_id}) -> {response.status_code} {response.text}")
    else:
        print(f"[LOC OK] driver {driver_num} (id={driver_id})")
        
        
def driver_worker(driver_num):
    email = f"driver{driver_num:02d}@test.com"
    
    token, driver_id = login_driver(email)
    if not token:
        return
    
    while True:
        update_location(token, driver_id, driver_num)
        time.sleep(10)
        
def start_simulation():
    threads = []
    
    for i in range(1,TOTAL_DRIVERS + 1):
        t = threading.Thread(target=driver_worker,args=(i,))
        t.start()
        threads.append(t)
        time.sleep(0.2)
    
    for t in threads:
        t.join()
        
if __name__ == "__main__":
    start_simulation()