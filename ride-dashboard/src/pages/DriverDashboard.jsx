import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import axios from "axios";

export default function DriverDashboard() {

    const [driverStatus, setDriverStatus] = useState(() => {
        const savedStatus = localStorage.getItem("driverStatus");
        return savedStatus ? savedStatus : "OFFLINE";
    });
    const [currentRide, setCurrentRide] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            window.location.href = "/login";
        }
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

            await axios.post(`/rides/${currentRide.id}/accept`, {}, {
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

            await axios.post(`/rides/${currentRide.id}/reject`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setCurrentRide(null);

        } catch (err) {
            console.error("Error rejecting ride", err);
        }
    };

    useEffect(() => {

        if (driverStatus !== "ONLINE") return;

        const interval = setInterval(async () => {
            try {

                const token = localStorage.getItem("token");

                const res = await axios.get("/rides/driver/active", {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (res.data && res.data.id && res.data.rideStatus === "REQUESTED") {
                    setCurrentRide(res.data);
                } else {
                    setCurrentRide(null);
                }

            } catch (err) {
                console.error("Error fetching driver ride", err);
            }
        }, 2000);

        return () => clearInterval(interval);

    }, [driverStatus]);

    return (
        <div className="flex flex-col h-screen text-gray-100 bg-gray-900">

            {/* HEADER */}
            <header className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">

                <h1 className="text-xl font-semibold">
                    Driver Dashboard
                </h1>

                <div className="flex items-center gap-4">

                    {/* Driver status */}
                    <button
                        onClick={toggleDriverStatus}
                        className={`px-4 py-2 rounded text-white ${
                            driverStatus === "ONLINE"
                                ? "bg-green-600"
                                : "bg-gray-600"
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
                        Go online to accept rides.
                    </p>
                </main>

            ) : (

                <main className="flex flex-col flex-1 md:flex-row">

                    {/* MAP */}
                    <div className="w-full md:w-2/3 h-[50%] md:h-full">

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

                            <Marker position={[12.9, 77.6]}>
                                <Popup>
                                    Driver Location
                                </Popup>
                            </Marker>

                        </MapContainer>

                    </div>


                    {/* RIDE CARD */}
                    <div className="flex items-center justify-center w-full p-6 overflow-hidden md:w-1/3">

                        {currentRide ? (

                            <div className="w-full max-w-md p-6 transition-all duration-300 ease-out transform translate-x-0 bg-gray-800 border border-gray-700 shadow opacity-100 rounded-xl">

                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-xl">👤</span>
                                    <h2 className="text-lg font-semibold">
                                        New Ride Request
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

                                </div>

                            </div>

                        ) : (

                            <div className="text-center text-gray-400 transition-all duration-300 ease-out transform translate-x-4 opacity-70">
                                Waiting for ride requests...
                            </div>

                        )}

                    </div>

                </main>

            )}

        </div>
    );
}