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
    const [driverDetails, setDriverDetails] = useState(null);
    const [drivers, setDrivers] = useState([]);
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [dropSuggestions, setDropSuggestions] = useState([]);
    const [pickupQuery, setPickupQuery] = useState("");
    const [dropQuery, setDropQuery] = useState("");
    const [selectingPickup, setSelectingPickup] = useState(true);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [refreshCountdown, setRefreshCountdown] = useState(null);
    // Auto-refresh/reset dashboard after ride ends (FAILED/CANCELLED/COMPLETED)
    useEffect(() => {
        if (
            rideStatus === "FAILED" || rideStatus === "CANCELLED" || rideStatus === "COMPLETED"
        ) {
            setRefreshCountdown(10);

            const countdownInterval = setInterval(() => {
                setRefreshCountdown((prev) => {
                    if (prev === 1) {
                        clearInterval(countdownInterval);

                        // reset dashboard
                        setRideId(null);
                        setRideStatus(null);
                        setPickupQuery("");
                        setDropQuery("");
                        setPickupLat("");
                        setDropLat("");
                        setPickupLong("");
                        setDropLong("");

                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(countdownInterval);
        }
    }, [rideStatus]);

    function resetDashboard() {
        setRideId(null);
        setRideStatus(null);
        setPickupQuery("");
        setDropQuery("");
        setPickupLat("");
        setDropLat("");
        setPickupLong("");
        setDropLong("");
        setDriverDetails(null);
        setSelectingPickup(true);
    }
    useEffect(() => {
        const storedName = localStorage.getItem("userName");
        if (storedName) {
            setUserName(storedName);
            return;
        }

        setUserName("there");
    }, []);

    // Fetch active ride on load (no need to pass customerId)
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        axios.get("http://localhost:8080/rides/customer/active", {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => {
            if (res.data) {
                const status = res.data.rideStatus || res.data.status;
                setRideId(res.data.id);
                setRideStatus(status);

                if (res.data.driverId) {
                    setDriverDetails({
                        driverId: res.data.driverId,
                        name: res.data.driverName || null,
                        phone: res.data.phone || null
                    });
                }
            }
        })
        .catch((err) => {
            // 204 No Content is expected if no active ride
            if (err?.response?.status !== 204) {
                console.error("Failed to fetch active ride:", err);
            }
        });
    }, []);
    const searchTimeoutRef = useRef(null);
    const searchCacheRef = useRef({});
    const driverIcon = new L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/744/744465.png",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
    const navigate = useNavigate();

    // --- CONSTELLATION BACKGROUND CANVAS LOGIC ---
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const particles = [];
        const COUNT = 90;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * (Math.random() * 0.6 + 0.2);
                this.vy = (Math.random() - 0.5) * (Math.random() * 0.6 + 0.2);
                this.size = Math.random() * 1.5 + 0.5;
                this.depth = Math.random();
            }
            update() {
                this.x += this.vx * (0.5 + this.depth);
                this.y += this.vy * (0.5 + this.depth);

                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);

                const glow = 4 + this.depth * 8;

                ctx.shadowBlur = glow;
                ctx.shadowColor = "rgba(255,255,255,0.8)";
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.fill();
            }
        }

        for (let i = 0; i < COUNT; i++) particles.push(new Particle());

        const connect = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 120) {
                        ctx.beginPath();
                        const opacity = 1 - dist / 120;
                        ctx.strokeStyle = `rgba(255,255,255,${opacity * 0.6})`;
                        ctx.lineWidth = opacity * 0.8;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            connect();
            requestAnimationFrame(animate);
        };

        animate();

        return () => window.removeEventListener("resize", resize);
    }, []);

    function MapClickHandler() {
        useMapEvents({
            async click(e) {
                const { lat, lng } = e.latlng;

                try {
                    const res = await axios.get(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
                    );

                    const locationName =
                        res.data && res.data.display_name
                            ? res.data.display_name
                            : `Selected location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

                    if (selectingPickup) {
                        setPickupLat(lat);
                        setPickupLong(lng);
                        setPickupQuery(locationName);
                        setSelectingPickup(false);
                    } else {
                        setDropLat(lat);
                        setDropLong(lng);
                        setDropQuery(locationName);
                    }

                } catch (err) {
                    console.error("Reverse geocoding failed:", err);

                    if (selectingPickup) {
                        setPickupLat(lat);
                        setPickupLong(lng);
                        setPickupQuery(`Selected location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
                        setSelectingPickup(false);
                    } else {
                        setDropLat(lat);
                        setDropLong(lng);
                        setDropQuery(`Selected location (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
                    }
                }
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
            axios.get(`http://localhost:8080/drivers/nearby?lat=${pickupLat}&lng=${pickupLong}`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then((res) => {
                setDrivers(res.data);
            }).catch((err) => {
                console.error("Failed to fetch nearby drivers:", err);
            });
        }, 3000);

        return () => clearInterval(interval);

    }, [pickupLat, pickupLong, pickupQuery]);

    // Poll ride status; if rideId missing, try active endpoint
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        let interval = null;

        interval = setInterval(() => {
            const url = rideId
                ? `http://localhost:8080/rides/${rideId}`
                : `http://localhost:8080/rides/customer/active`;

            axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            })
            .then((res) => {
                if (res.data) {
                    const status = res.data.rideStatus || res.data.status;

                    if (!rideId && res.data.id) {
                        setRideId(res.data.id);
                    }

                    if (status) {
                        setRideStatus(status);

                        if (res.data.driverId) {
                            setDriverDetails({
                                driverId: res.data.driverId,
                                name: res.data.driverName || null,
                                phone: res.data.phone || null
                            });
                        }

                        if (
                            status === "FAILED" ||
                            status === "CANCELLED" ||
                            status === "COMPLETED"
                        ) {
                            clearInterval(interval);
                        }
                    }
                }
            })
            .catch((err) => {
                if (err?.response?.status !== 204) {
                    console.error("Failed to fetch ride status:", err);
                }
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [rideId]);

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
        <div className="relative flex flex-col h-screen overflow-hidden text-gray-100 bg-black">
            {/* Constellation Canvas Background */}
            <canvas ref={canvasRef} className="absolute inset-0 z-0"></canvas>
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80"></div>
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_60%)]"></div>
            <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.06),transparent_50%)] animate-pulse"></div>

            <header className="relative z-10 h-[10%] flex items-center justify-between px-6 border-b border-white/10 bg-white/5 backdrop-blur-xl">
                <h1 className="text-xl font-bold tracking-wide text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                    Ride Booking
                </h1>
                <button
                    className="px-4 py-2 text-white transition-all border rounded bg-white/10 border-white/20 hover:bg-white/20"
                    onClick={handleLogout}
                >
                    Logout
                </button>
            </header>

            <main className="relative h-[80%] flex flex-col md:flex-row items-center md:items-stretch">
                <div className="relative z-10 flex-1 w-full p-4 md:w-1/2 md:h-full">
                    <div className="w-full h-full overflow-hidden border rounded-2xl border-white/10 backdrop-blur-xl bg-white/5 shadow-[inset_0_0_40px_rgba(0,0,0,0.6)]">
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
                </div>

                <div
                    className={`
                        w-full md:w-1/2 relative z-10
                        bg-white/5 backdrop-blur-xl border border-white/10
                        rounded-t-2xl md:rounded-2xl
                        p-6 md:p-8 flex flex-col gap-4
                        items-center md:items-start text-center md:text-left
                        transition-all duration-300
                        overflow-y-auto
                        ${sheetOpen ? "max-h-[70%]" : "max-h-[220px]"} md:max-h-none
                        hover:shadow-[0_0_60px_rgba(255,255,255,0.05)] scrollbar-hide
                    `}
                >
                    <div
                        className="flex flex-col items-center w-full gap-2 pb-2 mb-2 border-b cursor-pointer border-white/10 md:hidden"
                        onClick={() => setSheetOpen(!sheetOpen)}
                    >
                        <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                        <button
                            type="button"
                            className="flex items-center gap-1 text-sm text-gray-300"
                        >
                            {sheetOpen ? "▼ Hide ride panel" : "▲ Show ride panel"}
                        </button>
                    </div>
                    <div className="w-full max-w-md mb-2 text-left">
                        <p className="text-lg font-semibold text-transparent bg-gradient-to-r from-white to-gray-400 bg-clip-text">
                            Hi, {userName}.
                        </p>
                        <p className="text-sm text-gray-400">
                            Where would you like us to take you today?
                        </p>
                    </div>
                    <div className="w-full max-w-md p-4 mt-4 border bg-white/5 border-white/10 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                        <p className="font-semibold">Ride Status</p>

                        {!rideStatus && (
                            <p className="text-gray-400">No ride requested.</p>
                        )}

                        {rideStatus === "REQUESTED" && (
                            <p className="font-medium text-yellow-400 animate-pulse">
                                Searching for nearby drivers...
                            </p>
                        )}

                        {rideStatus === "FAILED" || rideStatus === "CANCELLED" || rideStatus === "REJECTED" ? (
                            <p className="font-medium text-red-400">
                                {rideStatus === "REJECTED"
                                    ? "Driver rejected the ride. Retrying with other drivers..."
                                    : "Sorry, we couldn’t find any drivers nearby."}
                            </p>
                        ) : rideStatus && rideStatus !== "REQUESTED" ? (
                            <p className="font-medium text-gray-200">
                                {rideStatus === "IN_PROGRESS"
                                    ? "You're on your way to the drop-off. Sit back and enjoy the ride 🚗"
                                        : rideStatus}
                                {rideStatus === "ASSIGNED" && "Driver assigned. Heading your way 🚗"}
                            </p>
                        ) : null}
                    </div>

                    {driverDetails && (
                        (rideStatus === "ASSIGNED" ||
                        rideStatus === "IN_PROGRESS") && (
                            <div className="w-full max-w-md p-4 mt-4 border bg-white/10 border-white/20 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                <p className="mb-2 text-lg font-semibold">Your Driver</p>

                                <p className="text-sm text-gray-300">
                                    Driver: {driverDetails.name || `#${driverDetails.driverId}`}
                                </p>

                                <p className="mt-1 text-sm text-gray-400">
                                    
                                </p>
                            </div>
                        )
                    )}
                    {(rideStatus === "FAILED" || rideStatus === "CANCELLED" || rideStatus === "COMPLETED") && (
                        <div className="flex flex-col w-full max-w-md gap-2 mt-2">
                            <button
                                onClick={resetDashboard}
                                className="px-4 py-2 text-black transition-all bg-white rounded hover:bg-gray-200"
                            >
                                Start New Ride
                            </button>
                            {refreshCountdown !== null && (
                                <p className="text-sm text-center text-gray-400">
                                    Resetting in {refreshCountdown}s...
                                </p>
                            )}
                        </div>
                    )}

                    {/* Ride COMPLETED card */}
                    {rideStatus === "COMPLETED" && (
                        <div className="w-full max-w-md p-4 mt-4 border bg-green-500/10 border-green-500/20 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(0,255,0,0.1)]">
                            <p className="mb-2 text-lg font-semibold text-green-300">Ride Completed 🎉</p>
                            <p className="text-sm text-gray-300">
                                You've reached your destination. Hope you had a smooth ride!
                            </p>
                            {refreshCountdown !== null && (
                                <p className="mt-2 text-sm text-gray-400">
                                    Resetting in {refreshCountdown}s...
                                </p>
                            )}
                        </div>
                    )}

                    {/* Ride REJECTED card */}
                    {rideStatus === "REJECTED" && (
                        <div className="w-full max-w-md p-4 mt-4 border bg-yellow-500/10 border-yellow-500/20 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(255,255,0,0.1)]">
                            <p className="mb-2 text-lg font-semibold text-yellow-300">Ride Update</p>
                            <p className="text-sm text-gray-300">
                                Your ride was rejected by a driver. We're trying to find another one...
                            </p>
                        </div>
                    )}
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
                            className="w-full max-w-md p-2 text-gray-100 border rounded bg-white/5 border-white/20 backdrop-blur-md focus:border-white/40 focus:shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                        />
                        {pickupSuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full max-w-md overflow-y-auto text-gray-100 bg-black/80 border border-white/30 rounded shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl max-h-40">
                                {pickupSuggestions.map((place, index) => (
                                    <li
                                        key={index}
                                        className="p-2 cursor-pointer hover:bg-white/30"
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
                    <p className="text-sm text-gray-400">Pickup coordinates will be fetched automatically.</p>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Drop Location (e.g. Bangalore Airport)"
                            value={dropQuery}
                            onChange={(e) => {
                                setDropQuery(e.target.value);
                                searchLocation(e.target.value, setDropSuggestions);
                            }}
                            className="w-full max-w-md p-2 text-gray-100 border rounded bg-white/5 border-white/20 backdrop-blur-md focus:border-white/40 focus:shadow-[0_0_12px_rgba(255,255,255,0.15)]"
                        />
                        {dropSuggestions.length > 0 && (
                            <ul className="absolute z-10 w-full max-w-md overflow-y-auto text-gray-100 bg-black/80 border border-white/30 rounded shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl max-h-40">
                                {dropSuggestions.map((place, index) => (
                                    <li
                                        key={index}
                                        className="p-2 cursor-pointer hover:bg-white/30"
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
                    <p className="mb-4 text-sm text-gray-400">Drop coordinates will be fetched automatically.</p>

                    {rideStatus === "REQUESTED" ? (
                        <button
                            type="button"
                            className="w-full max-w-md px-4 py-2 mt-8 mb-2 text-white bg-white/10 border border-white/20 hover:bg-red-500/80 active:scale-[0.98] rounded"
                            onClick={() => handleCancelRide()}
                        >
                            Cancel Ride Request
                        </button>
                    ) : (
                        <button
                            className={`
                                px-4 py-2 rounded w-full max-w-md mt-8 mb-2 transition-all duration-200 active:scale-[0.98]
                                ${!pickupLat || !pickupLong || !dropLat || !dropLong || rideId
                                    ? "bg-white/10 text-gray-400 cursor-not-allowed"
                                    : "bg-white text-black hover:bg-gray-200 hover:scale-[1.02]"}
                            `}
                            onClick={handleRideRequest}
                            disabled={!pickupLat || !pickupLong || !dropLat || !dropLong || rideId}
                        >
                            Request Ride
                        </button>
                    )}

                    {rideId && (
                        <div
                            className="w-full max-w-md p-4 mt-4 border bg-white/5 border-white/10 rounded-2xl backdrop-blur-md shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                        >
                            <p className="font-semibold">Ride Created</p>
                            <p>Ride ID: {rideId}</p>
                        </div>
                    )}

                </div>
            </main>

            <footer className="hidden md:flex h-[10%] items-center justify-center border-t border-white/10 bg-white/5 backdrop-blur-xl">
                <p className="text-sm text-gray-400">Ride Booking App</p>
            </footer>

        </div>
    );
}