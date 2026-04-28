import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function Dashboard() {
    const [rides, setRides] = useState([]);
    const [limit, setLimit] = useState(10);
    const [refreshInterval, setRefreshInterval] = useState(() => {
        return Number(localStorage.getItem("refreshInterval")) || 3000;
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        total: 0,
        assigned: 0,
        completed: 0,
        requested: 0,
        failed: 0,
        cancelled: 0,
        rejected: 0,
        inProgress: 0,
        driversOnline: 0,
        driversTotal: 0,
        users: 0
    });

    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
    const canvasRef = useRef(null);
    const [drivers, setDrivers] = useState([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");

        let particles = [];
        const PARTICLE_COUNT = 60;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener("resize", resize);

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.4;
                this.vy = (Math.random() - 0.5) * 0.4;
                this.size = Math.random() * 1.5 + 0.5;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(255,255,255,0.9)";
                ctx.fill();
            }
        }

        particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());

        const connect = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a + 1; b < particles.length; b++) {
                    const dx = particles[a].x - particles[b].x;
                    const dy = particles[a].y - particles[b].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 140) {
                        ctx.strokeStyle = "rgba(255,255,255,0.08)";
                        ctx.lineWidth = 0.6;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
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
        return () => {
            window.removeEventListener("resize", resize);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem("refreshInterval", refreshInterval);
    }, [refreshInterval]);

    const sortData = (data) => {
        if (!sortConfig.key || !sortConfig.direction) return data;

        return [...data].sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // handle rideId fallback
            if (sortConfig.key === "rideId") {
                aVal = a.rideId || a.id;
                bVal = b.rideId || b.id;
            }

            // handle createdAt date sorting
            if (sortConfig.key === "createdAt") {
                return sortConfig.direction === "asc"
                    ? new Date(aVal) - new Date(bVal)
                    : new Date(bVal) - new Date(aVal);
            }

            if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });
    };

    const fetchRides = async () => {
        const token = localStorage.getItem("token");
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get("http://localhost:8080/rides", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache"
                }
            });
            const data = res.data || [];

            const [driverRes, userRes] = await Promise.all([
                axios.get("http://localhost:8080/drivers/admin/stats", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("http://localhost:8080/admin/users/count", {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            const sorted = sortData(data);
            setRides(sorted.slice(0, limit));

            const summary = {
                total: data.length,
                assigned: data.filter(r => (r.rideStatus || r.status) === "ASSIGNED").length,
                completed: data.filter(r => (r.rideStatus || r.status) === "COMPLETED").length,
                requested: data.filter(r => (r.rideStatus || r.status) === "REQUESTED").length,
                failed: data.filter(r => (r.rideStatus || r.status) === "FAILED").length,
                cancelled: data.filter(r => {
                    const status = r.rideStatus || r.status;
                    return status === "CANCELLED" || status === "CANCELED";
                }).length,
                rejected: data.filter(r => (r.rideStatus || r.status) === "REJECTED").length,
                inProgress: data.filter(r => (r.rideStatus || r.status) === "IN_PROGRESS").length
            };

            setStats({
                ...summary,
                driversOnline: driverRes.data.online || 0,
                driversTotal: driverRes.data.total || 0,
                users: userRes.data || 0
            });

            console.log("RIDES DATA:", data);
            if (data.length > 0) {
                console.log("First ride object:", data[0]);
            }

        } catch (err) {
            console.error("Error fetching rides.", err);
            setError("Failed to fetch rides");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRides();
        const interval = setInterval(fetchRides, refreshInterval);
        return () => clearInterval(interval);
    }, [limit, refreshInterval, sortConfig]);

    useEffect(() => {
        const fetchDriverData = async () => {
            const token = localStorage.getItem("token");
            try {
                const [locRes, hbRes] = await Promise.all([
                    axios.get("http://localhost:8080/drivers/admin/locations", {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get("http://localhost:8080/drivers/admin/heartbeats", {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                const heartbeatMap = new Map();
                hbRes.data.forEach(h => {
                    heartbeatMap.set(h.driverId, h.alive);
                });

                const merged = locRes.data.map(loc => ({
                    ...loc,
                    alive: heartbeatMap.get(loc.driverId) || false
                }));

                setDrivers(merged);

            } catch (err) {
                console.error("Driver observability fetch failed", err);
            }
        };

        fetchDriverData();
        const interval = setInterval(fetchDriverData, 5000);
        return () => clearInterval(interval);
    }, []);

    const toggleSort = (key) => {
        setSortConfig(prev => {
            if (prev.key !== key) return { key, direction: "asc" };
            if (prev.direction === "asc") return { key, direction: "desc" };
            if (prev.direction === "desc") return { key: null, direction: null };
            return { key, direction: "asc" };
        });
    };

    const triggerSimulator = async () => {
        const token = localStorage.getItem("token");
        try {
            await axios.post("http://localhost:8080/admin/simulator/start", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Simulator started successfully");
        } catch (err) {
            console.error("Failed to start simulator", err);
            alert("Failed to start simulator");
        }
    };

    const resetSystem = async () => {
        const token = localStorage.getItem("token");
        try {
            await axios.post("http://localhost:8080/admin/system/reset", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("System reset complete");
            window.location.reload();
        } catch (err) {
            console.error("Reset failed", err);
            alert("Reset failed");
        }
    };

    const totalDriversLive = drivers.length;
    const aliveDrivers = drivers.filter(d => d.alive).length;
    const deadDrivers = totalDriversLive - aliveDrivers;

    const heartbeatHealth = totalDriversLive
        ? ((aliveDrivers / totalDriversLive) * 100).toFixed(1)
        : 0;

    return (
        <div className="relative flex flex-col items-center min-h-screen p-6 overflow-hidden text-gray-100 bg-black md:p-10">
            <canvas ref={canvasRef} className="fixed inset-0 z-0" />
            <div className="relative z-10 flex flex-col items-center w-full">

                <h1 className="w-full max-w-5xl mb-6 text-2xl font-bold text-center md:text-3xl md:text-left">
                    Ride Dispatch Dashboard
                </h1>

                <div className="flex flex-wrap items-center justify-between w-full max-w-5xl gap-4 mb-6">

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Show</span>
                        <select
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            className="px-2 py-1 border rounded bg-white/10 border-white/20"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={150}>150</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">Refresh</span>
                        <select
                            value={refreshInterval}
                            onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            className="px-2 py-1 border rounded bg-white/10 border-white/20"
                        >
                            <option value={1000}>1s</option>
                            <option value={5000}>5s</option>
                            <option value={10000}>10s</option>
                            <option value={60000}>60s</option>
                            <option value={300000}>5 min</option>
                            <option value={600000}>10 min</option>
                            <option value={900000}>15 min</option>
                        </select>
                        <button
                            onClick={fetchRides}
                            className="px-3 py-1 text-sm border rounded bg-white/10 border-white/20 hover:bg-white/20"
                        >
                            Refresh
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to reset the entire system? This will delete all rides, drivers, users (except admin), and flush Redis.")) {
                                resetSystem();
                            }
                        }}
                        className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-700"
                    >
                        Reset System
                    </button>
                    <button
                        onClick={triggerSimulator}
                        className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded hover:bg-green-700"
                    >
                        Start Simulator
                    </button>
                    <button
                        onClick={() => {
                            window.location.href = "/portal";
                        }}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700"
                    >
                        Back to Portal
                    </button>

                </div>

                <div className="w-full max-w-5xl h-[400px] mb-6 rounded-xl overflow-hidden border border-white/10">
                    <MapContainer center={[12.9, 77.6]} zoom={12} className="w-full h-full">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {drivers.map(driver => (
                            <Marker key={driver.driverId} position={[driver.lat, driver.lng]}>
                                <Popup>
                                    Driver {driver.driverId} <br />
                                    {driver.alive ? "🟢 Alive" : "🔴 Dead"}
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>

                <div className="grid w-full max-w-5xl grid-cols-2 gap-4 mb-6 md:grid-cols-3 lg:grid-cols-6">

                    <div className="p-4 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400">Users</p>
                        <p className="text-xl font-bold">{stats.users}</p>
                    </div>

                    <div className="p-4 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400">Total Drivers</p>
                        <p className="text-xl font-bold">{stats.driversTotal}</p>
                    </div>

                    <div className="p-4 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400">Drivers Online</p>
                        <p className="text-xl font-bold">{stats.driversOnline}</p>
                    </div>
                    
                    <div className="p-4 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400">Total Rides</p>
                        <p className="text-xl font-bold">{stats.total}</p>
                    </div>

                    <div className="p-4 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400">Requested</p>
                        <p className="text-xl font-bold">{stats.requested}</p>
                    </div>

                    <div className="p-4 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400">Assigned</p>
                        <p className="text-xl font-bold">{stats.assigned}</p>
                    </div>

                    <div className="p-4 border bg-green-500/10 border-green-500/20 rounded-xl">
                        <p className="text-sm text-green-300">Heartbeat Health</p>
                        <p className="text-xl font-bold text-green-400">{heartbeatHealth}%</p>
                    </div>

                    <div className="p-4 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400">Alive Drivers</p>
                        <p className="text-xl font-bold">{aliveDrivers}</p>
                    </div>

                    <div className="p-4 border bg-red-500/10 border-red-500/20 rounded-xl">
                        <p className="text-sm text-red-300">Dead Drivers</p>
                        <p className="text-xl font-bold text-red-400">{deadDrivers}</p>
                    </div>

                    <div className="p-4 border bg-blue-500/10 border-blue-500/20 rounded-xl">
                        <p className="text-sm text-blue-300">In Progress</p>
                        <p className="text-xl font-bold text-blue-400">{stats.inProgress}</p>
                    </div>

                    <div className="p-4 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-sm text-gray-400">Completed</p>
                        <p className="text-xl font-bold">{stats.completed}</p>
                    </div>

                    <div className="p-4 border bg-red-500/10 border-red-500/20 rounded-xl">
                        <p className="text-sm text-red-300">Failed</p>
                        <p className="text-xl font-bold text-red-400">{stats.failed}</p>
                    </div>

                    <div className="p-4 border bg-yellow-500/10 border-yellow-500/20 rounded-xl">
                        <p className="text-sm text-yellow-300">Cancelled</p>
                        <p className="text-xl font-bold text-yellow-400">{stats.cancelled}</p>
                    </div>

                    <div className="p-4 border bg-orange-500/10 border-orange-500/20 rounded-xl">
                        <p className="text-sm text-orange-300">Rejected</p>
                        <p className="text-xl font-bold text-orange-400">{stats.rejected}</p>
                    </div>

                </div>

                {loading ? (
                    <div className="text-gray-400">Loading rides...</div>
                ) : error ? (
                    <div className="text-red-400">{error}</div>
                ) : rides.length === 0 ? (
                    <div className="text-gray-400">No rides yet. Trigger a ride from passenger dashboard.</div>
                ) : (
                    <div className="w-full max-w-5xl overflow-x-auto">
                        <table className="w-full text-gray-100 border shadow bg-white/5 rounded-xl border-white/10">
                            <thead className="bg-white/10">
                                <tr>
                                    <th className="p-3 text-sm text-left md:text-base">
                                        Ride ID
                                        <button onClick={() => toggleSort("rideId")} className="ml-2 text-xs">↕</button>
                                    </th>
                                    <th className="p-3 text-sm text-left md:text-base">
                                        Status
                                        <button onClick={() => toggleSort("rideStatus")} className="ml-2 text-xs">↕</button>
                                    </th>
                                    <th className="p-3 text-sm text-left md:text-base">
                                        Driver
                                        <button onClick={() => toggleSort("driverId")} className="ml-2 text-xs">↕</button>
                                    </th>
                                    <th className="p-3 text-sm text-left md:text-base">
                                        Created
                                        <button onClick={() => toggleSort("createdAt")} className="ml-2 text-xs">↕</button>
                                    </th>
                                    <th className="p-3 text-sm text-left md:text-base">
                                        Action
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {rides.map((ride) => (
                                    <tr key={ride.rideId || ride.id} className="border-t border-white/10">
                                        <td className="p-3 text-sm md:text-base">
                                            {ride.rideId || ride.id || "-"}
                                        </td>
                                        <td className="p-3 text-sm md:text-base">
                                            {ride.rideStatus || ride.status}
                                        </td>
                                        <td className="p-3 text-sm md:text-base">{ride.driverId ? ride.driverId : "-"}</td>
                                        <td className="p-3 text-sm md:text-base"> {ride.createdAt ? new Date(ride.createdAt).toLocaleString() : "-"} </td>
                                        <td className="p-3 text-sm md:text-base">
                                            {(ride.rideStatus || ride.status) === "FAILED" && (
                                                <button
                                                    onClick={async () => {
                                                        const token = localStorage.getItem("token");
                                                        try {
                                                            await axios.post(
                                                                `http://localhost:8080/rides/${ride.rideId || ride.id}/retry`,
                                                                {},
                                                                {
                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                }
                                                            );
                                                            alert(`Retry triggered for ride ${ride.rideId || ride.id}`);
                                                            fetchRides();
                                                        } catch (err) {
                                                            console.error("Retry failed", err);
                                                            alert("Retry failed");
                                                        }
                                                    }}
                                                    className="px-3 py-1 text-xs font-semibold text-white bg-yellow-600 rounded hover:bg-yellow-700"
                                                >
                                                    Retry
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}