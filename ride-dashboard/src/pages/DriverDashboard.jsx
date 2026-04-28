import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import axios from "axios";
axios.defaults.baseURL = "http://localhost:8080";

export default function DriverDashboard() {

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
        const COUNT = 80;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * (Math.random() * 0.5 + 0.2);
                this.vy = (Math.random() - 0.5) * (Math.random() * 0.5 + 0.2);
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
                ctx.shadowBlur = 4 + this.depth * 6;
                ctx.shadowColor = "rgba(255,255,255,0.8)";
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.fill();
            }
        }

        for (let i = 0; i < COUNT; i++) particles.push(new Particle());

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        };

        animate();
        return () => window.removeEventListener("resize", resize);
    }, []);

    const [driverStatus, setDriverStatus] = useState(() => {
        const savedStatus = localStorage.getItem("driverStatus");
        return savedStatus ? savedStatus : "OFFLINE";
    });
    const [currentRide, setCurrentRide] = useState(null);
    const [driverPosition, setDriverPosition] = useState([12.9, 77.6]);
    const [targetPosition, setTargetPosition] = useState(null);
    useEffect(() => {
        if (!currentRide) return;

        // If ride not started → go to pickup
        if (currentRide.rideStatus === "REQUESTED") {
            setTargetPosition([currentRide.pickupLat, currentRide.pickupLong]);
        }
        // If ride started → go to drop
        if (currentRide.rideStatus === "IN_PROGRESS") {
            setTargetPosition([currentRide.dropLat, currentRide.dropLong]);
        }
    }, [currentRide]);

    useEffect(() => {
        if (!targetPosition) return;

        const interval = setInterval(() => {
            setDriverPosition(prev => {
                const [lat, lng] = prev;
                const [tLat, tLng] = targetPosition;

                const speed = 0.05; // adjust smoothness

                const newLat = lat + (tLat - lat) * speed;
                const newLng = lng + (tLng - lng) * speed;

                return [newLat, newLng];
            });
        }, 100);

        return () => clearInterval(interval);
    }, [targetPosition]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "/login";
        }
    }, []);

    useEffect(() => {
        const fetchActiveRideOnLoad = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) return;
                const response = await axios.get("http://localhost:8080/rides/driver/active", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-cache"
                    },
                    params: {
                        t: Date.now() // bust cache
                    }
                });
                console.log("ACTIVE RIDE RESPONSE:", response.status, response.data);
                if (response.status === 200 && response.data && response.data.id) {
                    setCurrentRide(response.data);
                    // Sync driver status with backend reality
                    setDriverStatus("ONLINE");
                    localStorage.setItem("driverStatus", "ONLINE");
                }
            } catch (err) {
                console.error("Error fetching active ride on load", err);
            }
        };

        fetchActiveRideOnLoad();
    }, []);

    const toggleDriverStatus = () => {
        const next = driverStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
        setDriverStatus(next);
        localStorage.setItem("driverStatus", next);

        // TODO: call backend
        // axios.put("/drivers/status", { status: next })
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
    };

    const acceptRide = async () => {
        if (!currentRide) return;

        try {
            const token = localStorage.getItem("token");

            await axios.post(`http://localhost:8080/rides/${currentRide.id}/accept`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setCurrentRide(null);

        } catch (err) {
            console.error("Error accepting ride", err);
        }
    };

    const rejectRide = async () => {
        if (!currentRide) return;

        try {
            const token = localStorage.getItem("token");

            await axios.post(`http://localhost:8080/rides/${currentRide.id}/reject`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setCurrentRide(null);

        } catch (err) {
            console.error("Error rejecting ride", err);
        }
    };

    const startRide = async () => {
        if (!currentRide) return;

        try {
            const token = localStorage.getItem("token");

            await axios.post(
                `http://localhost:8080/rides/${currentRide.id}/start?driverId=${currentRide.driverId}`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

        } catch (err) {
            console.error("Error starting ride", err);
        }
    };

    const completeRide = async () => {
        if (!currentRide) return;

        try {
            const token = localStorage.getItem("token");

            await axios.post(
                `http://localhost:8080/rides/${currentRide.id}/complete`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setCurrentRide(null);

        } catch (err) {
            console.error("Error completing ride", err);
        }
    };

    useEffect(() => {

        if (driverStatus !== "ONLINE" && !currentRide) return;

        const interval = setInterval(async () => {
            try {

                const token = localStorage.getItem("token");

                const res = await axios.get("http://localhost:8080/rides/driver/active", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-cache"
                    },
                    params: {
                        t: Date.now()
                    }
                });
                console.log("POLL ACTIVE RESPONSE:", res.status, res.data);

                if (res.status === 200 && res.data && res.data.id) {
                    console.log("SETTING CURRENT RIDE:", res.data);
                    setCurrentRide(res.data);
                } else {
                    console.log("NO ACTIVE RIDE FOUND");
                    setCurrentRide(null);
                }
            } catch (err) {
                console.error("Error fetching driver ride", err);
            }
        }, 2000);
        return () => clearInterval(interval);
    }, [driverStatus, currentRide]);

    return (
        <div className="relative flex flex-col h-screen overflow-hidden text-gray-100 bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 z-0"></canvas>
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80"></div>
            {/* HEADER */}
            <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b bg-white/5 backdrop-blur-xl border-white/10">
                <h1 className="text-xl font-semibold">
                    Driver Dashboard
                </h1>
                <div className="flex items-center gap-4">

                    {/* Driver status */}
                    <button
                        onClick={toggleDriverStatus}
                        className={`px-4 py-2 rounded text-white ${
                            driverStatus === "ONLINE"
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                        }`}
                    >
                        {driverStatus === "ONLINE" ? "Go OFFLINE" : "Go ONLINE"}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                    >
                        Logout
                    </button>

                </div>

            </header>


            {/* MAIN */}
            {driverStatus === "OFFLINE" ? (

                <main className="flex items-center justify-center flex-1">
                    <p className="text-lg text-gray-400">
                        Go online to start accepting rides.
                    </p>
                </main>

            ) : (

                <main className="flex flex-col flex-1 md:flex-row">

                    {/* MAP */}
                    <div className="relative z-10 w-full md:w-2/3 h-[50%] md:h-full p-4">
                        <div className="w-full h-full overflow-hidden border rounded-2xl border-white/10 bg-white/5 backdrop-blur-xl">

                            <MapContainer
                                center={[12.9, 77.6]}
                                zoom={13}
                                scrollWheelZoom={true}
                                className="w-full h-full"
                            >
                                <TileLayer
                                    attribution="&copy; OpenStreetMap contributors"
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                <Marker position={driverPosition}>
                                    <Popup>
                                        Driver Location
                                    </Popup>
                                </Marker>

                                {currentRide && currentRide.pickupLat && currentRide.dropLat && (
                                    <Polyline
                                        positions={[
                                            driverPosition,
                                            [currentRide.pickupLat, currentRide.pickupLong],
                                            [currentRide.dropLat, currentRide.dropLong]
                                        ]}
                                        pathOptions={{ color: "white", weight: 3, opacity: 0.8 }}
                                    />
                                )}

                            </MapContainer>

                        </div>
                    </div>

                    {/* RIDE CARD */}
                    <div className="flex items-center justify-center w-full p-6 overflow-hidden md:w-1/3">

                        {currentRide ? (

                            <div className="w-full max-w-md p-6 transition-all duration-300 ease-out transform translate-x-0 bg-white/5 border border-white/10 backdrop-blur-xl shadow-[0_0_30px_rgba(255,255,255,0.05)] rounded-xl">

                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl">👤</span>
                                    <h2 className="text-lg font-semibold">
                                        {currentRide.rideStatus === "REQUESTED" && "New Ride Request"}
                                        {currentRide.rideStatus === "ASSIGNED" && "Ride Assigned"}
                                        {currentRide.rideStatus === "IN_PROGRESS" && "Ride In Progress"}
                                    </h2>
                                </div>

                                <div className="space-y-3">

                                    <div>
                                        <p className="text-sm text-gray-400">
                                            Pickup
                                        </p>
                                        <p className="font-medium">
                                            {currentRide.pickup}
                                        </p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-400">
                                            Drop
                                        </p>
                                        <p className="font-medium">
                                            {currentRide.drop}
                                        </p>
                                    </div>

                                </div>

                                <div className="flex gap-3 mt-6">

                                    {currentRide.rideStatus === "REQUESTED" && (
                                        <>
                                            <button
                                                onClick={acceptRide}
                                                className="flex-1 py-2 bg-green-600 rounded hover:bg-green-700"
                                            >
                                                Accept
                                            </button>

                                            <button
                                                onClick={rejectRide}
                                                className="flex-1 py-2 bg-red-600 rounded hover:bg-red-700"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}

                                    {currentRide.rideStatus === "ASSIGNED" && (
                                        <button
                                            onClick={startRide}
                                            className="flex-1 py-2 bg-blue-600 rounded hover:bg-blue-700"
                                        >
                                            Start Ride
                                        </button>
                                    )}

                                    {currentRide.rideStatus === "IN_PROGRESS" && (
                                        <button
                                            onClick={completeRide}
                                            className="flex-1 py-2 bg-purple-600 rounded hover:bg-purple-700"
                                        >
                                            Complete Ride
                                        </button>
                                    )}

                                </div>

                            </div>

                        ) : (

                            <div className="text-center text-gray-400 transition-all duration-300 ease-out opacity-70">
                                Waiting for ride requests...
                            </div>

                        )}

                    </div>

                </main>

            )}

        </div>
    );
}