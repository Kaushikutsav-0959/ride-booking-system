import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";

export default function PassengerDashboard() {

    const [pickupLat, setPickupLat] = useState("");
    const [pickupLong, setPickupLong] = useState("");
    const [dropLat, setDropLat] = useState("");
    const [dropLong, setDropLong] = useState("");
    const [rideId, setRideId] = useState(null);
    const [rideStatus, setRideStatus] = useState(null);
    const [drivers, setDrivers] = useState([]);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [dropSuggestions, setDropSuggestions] = useState([]);
    const [pickupQuery, setPickupQuery] = useState("");
    const [dropQuery, setDropQuery] = useState("");
    const [sheetOpen, setSheetOpen] = useState(false);
    const searchTimeoutRef = useRef(null);
    const searchCacheRef = useRef({});
    const driverIcon = new L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
    const navigate = useNavigate();

    function MapClickHandler() {
        useMapEvents({
            click(e) {
                const { lat, lng } = e.latlng;
                setPickupLat(lat);
                setPickupLong(lng);
                setPickupQuery(`Selected location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
            }
        });
        return null;
    }

    function handleLogout() {
        localStorage.removeItem("token");
        navigate("/");
        return;
    }

    function searchLocation(query, setSuggestions) {

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        const normalized = query.trim().toLowerCase();

        if (searchCacheRef.current[normalized]) {
            setSuggestions(searchCacheRef.current[normalized]);
            return;
        }

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await axios.get(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&email=test@example.com`
                );

                if (res.data) {
                    searchCacheRef.current[normalized] = res.data;
                    setSuggestions(res.data);
                }
            } catch (err) {
                console.error("Location search failed:", err);
            }
        }, 1500);
    }


    useEffect(() => {

        if (!pickupQuery || !pickupLat || !pickupLong) {
            setDrivers([]);
            return;
        }

        const token = localStorage.getItem("token");

        const interval = setInterval(() => {

            axios.get(`http://localhost:8080/drivers/nearby?lat=${pickupLat}&long=${pickupLong}`, {

                headers: { Authorization: `Bearer ${token}` }

            }).then((res) => {
                setDrivers(res.data);
            }).catch((err) => {
                console.error("Failed to fetch nearby drivers:", err);
            });
        }, 3000);

        return () => clearInterval(interval);

    }, [pickupLat, pickupLong, pickupQuery]);

    function handleRideRequest() {

        if (rideId || rideStatus === "REQUESTED") {
            console.warn("Ride request blocked: an active ride already exists.", { rideId, rideStatus });
            return;
        }

        if (!pickupLat || !pickupLong || !dropLat || !dropLong) {
            console.warn("Ride request blocked: pickup or drop location missing.", {
                pickupLat, pickupLong, dropLat, dropLong
            });
            return;
        }

        const token = localStorage.getItem("token");
        const payload = {
            pickupLat: parseFloat(pickupLat),
            pickupLong: parseFloat(pickupLong),
            dropLat: parseFloat(dropLat),
            dropLong: parseFloat(dropLong)
        }

        axios.post(
            "http://localhost:8080/rides/request", payload, { headers: { Authorization: `Bearer ${token}` } }
        ).then((res) => {
            console.log("Ride created: ", res.data);

            setRideId(res.data.id);
            setRideStatus(res.data.rideStatus);
        }).catch((err) => {
            console.error("Ride request failed: ", err);
        })
    
    }

    function handleCancelRide() {

        console.log("Cancel button clicked", { rideId, rideStatus });

        if (!rideId) {
            console.warn("Cancel attempted but rideId is missing");
            return;
        }

        const token = localStorage.getItem("token");

        axios.post(`http://localhost:8080/rides/${rideId}/cancel`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => {
            console.log("Ride cancelled:", res.data);

            setRideId(null);
            setRideStatus(null);
            setPickupQuery("");
            setDropQuery("");
            setPickupLat("");
            setDropLat("");
            setPickupLong("");
            setDropLong("");
        })
        .catch((err) => {
            console.error("Ride cancel failed:", err);
        });
    }


    return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-100">
            <header className="h-[10%] flex items-center justify-between px-6 border-b border-gray-700 bg-gray-800">
                <h1 className="text-xl font-bold">Ride Booking</h1>
                <button
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </header>

            <main className="relative h-[80%] flex flex-col md:flex-row items-center md:items-stretch">
                <div className="w-full md:w-1/2 flex-1 md:h-full">
                    <MapContainer
                        center={pickupLat && pickupLong ? [parseFloat(pickupLat), parseFloat(pickupLong)] : [12.9, 77.6]}
                        zoom={13}
                        scrollWheelZoom={true}
                        className="w-full h-full transition-all duration-300"
                    >
                        <TileLayer
                            attribution="&copy; OpenStreetMap contributors"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapClickHandler />

                        {pickupLat && pickupLong && (
                            <Marker position={[parseFloat(pickupLat), parseFloat(pickupLong)]}>
                                <Popup>Pickup Location</Popup>
                            </Marker>
                        )}

                        {dropLat && dropLong && (
                            <Marker position={[parseFloat(dropLat), parseFloat(dropLong)]}>
                                <Popup>Drop Location</Popup>
                            </Marker>
                        )}
                        {pickupLat && pickupLong && dropLat && dropLong && (
                            <Polyline
                                positions={[
                                    [parseFloat(pickupLat), parseFloat(pickupLong)],
                                    [parseFloat(dropLat), parseFloat(dropLong)]
                                ]}
                            />
                        )}

                        {drivers.map((driver, index) => {
                            if (!driver || driver.latitude === undefined || driver.longitude === undefined) {
                                return null;
                            }

                            return (
                                <Marker
                                    key={driver.driverId || index}
                                    position={[parseFloat(driver.latitude), parseFloat(driver.longitude)]}
                                    icon={driverIcon}
                                >
                                    <Popup>Driver {driver.driverId || index}</Popup>
                                </Marker>
                            );
                        })}

                    </MapContainer>
                </div>

                <div
                className={`
                    w-full md:w-1/2
                    bg-gray-900 border-t border-gray-700 md:border-none
                    rounded-t-2xl md:rounded-none
                    p-6 md:p-8 flex flex-col gap-4
                    items-center md:items-start text-center md:text-left
                    transition-all duration-300
                    overflow-y-auto
                    ${sheetOpen ? "max-h-[70%]" : "max-h-[220px]"} md:max-h-none
                `}
                >
                    <div
                        className="w-full flex flex-col items-center gap-2 mb-2 cursor-pointer md:hidden pb-2 border-b border-gray-700"
                        onClick={() => setSheetOpen(!sheetOpen)}
                    >
                        <div className="w-12 h-1.5 bg-gray-600 rounded-full"></div>
                        <button
                            type="button"
                            className="text-gray-400 text-sm flex items-center gap-1"
                        >
                            {sheetOpen ? "▼ Hide ride panel" : "▲ Show ride panel"}
                        </button>
                    </div>
                <div className="mt-4 p-4 border border-gray-700 rounded bg-gray-800 w-full max-w-md">
                    <p className="font-semibold">Ride Status</p>

                    {!rideStatus && (
                        <p className="text-gray-600">No ride requested.</p>
                    )}

                    {rideStatus === "REQUESTED" && (
                        <p className="text-yellow-600 font-medium">
                            Ride requested — finding you a driver...
                        </p>
                    )}

                    {rideStatus && rideStatus !== "REQUESTED" && (
                        <p className="text-gray-800 font-medium">{rideStatus}</p>
                    )}
                </div>
                    <h2 className="text-2xl font-semibold">Request a ride</h2>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Pickup Location (e.g. Indiranagar Bangalore)"
                            value={pickupQuery}
                            onChange={(e) => {
                                setPickupQuery(e.target.value);
                                searchLocation(e.target.value, setPickupSuggestions);
                            }}
                            className="border border-gray-600 bg-gray-800 text-gray-100 p-2 rounded w-full max-w-md"
                        />
                        {pickupSuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full max-w-md border border-gray-700 rounded bg-gray-800 text-gray-100 max-h-40 overflow-y-auto shadow-lg">
                                {pickupSuggestions.map((place, index) => (
                                    <li
                                        key={index}
                                        className="p-2 hover:bg-gray-700 cursor-pointer"
                                        onClick={() => {
                                            setPickupLat(place.lat);
                                            setPickupLong(place.lon);
                                            setPickupQuery(place.display_name);
                                            setPickupSuggestions([]);
                                        }}
                                    >
                                        {place.display_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">Pickup coordinates will be fetched automatically.</p>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Drop Location (e.g. Bangalore Airport)"
                            value={dropQuery}
                            onChange={(e) => {
                                setDropQuery(e.target.value);
                                searchLocation(e.target.value, setDropSuggestions);
                            }}
                            className="border border-gray-600 bg-gray-800 text-gray-100 p-2 rounded w-full max-w-md"
                        />
                        {dropSuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full max-w-md border border-gray-700 rounded bg-gray-800 text-gray-100 max-h-40 overflow-y-auto shadow-lg">
                                {dropSuggestions.map((place, index) => (
                                    <li
                                        key={index}
                                        className="p-2 hover:bg-gray-700 cursor-pointer"
                                        onClick={() => {
                                            setDropLat(place.lat);
                                            setDropLong(place.lon);
                                            setDropQuery(place.display_name);
                                            setDropSuggestions([]);
                                        }}
                                    >
                                        {place.display_name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 mb-4">Drop coordinates will be fetched automatically.</p>

                    {rideStatus === "REQUESTED" ? (
                        <button
                            type="button"
                            className="bg-red-500 text-white px-4 py-2 rounded w-full max-w-md mt-8 mb-2"
                            onClick={() => handleCancelRide()}
                        >
                            Cancel Ride Request
                        </button>
                    ) : (
                        <button
                            className={`px-4 py-2 rounded text-white w-full max-w-md mt-8 mb-2 ${
                                !pickupLat || !pickupLong || !dropLat || !dropLong || rideId
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600"
                            }`}
                            onClick={handleRideRequest}
                            disabled={!pickupLat || !pickupLong || !dropLat || !dropLong || rideId}
                        >
                            Request Ride
                        </button>
                    )}

                    {rideId && (
                        <div
                            className="mt-4 p-4 border border-gray-700 rounded bg-gray-800 w-full max-w-md"
                        >
                            <p className="font-semibold">Ride Created</p>
                            <p>Ride ID: {rideId}</p>
                        </div>
                    )}

                </div>
            </main>

            <footer className="hidden md:flex h-[10%] items-center justify-center border-t border-gray-700 bg-gray-800">
                <p className="text-sm text-gray-500">Ride Booking App</p>
            </footer>

        </div>
    );
}