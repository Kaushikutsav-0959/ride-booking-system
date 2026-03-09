import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

export default function DriverDashboard() {

    const [driverStatus, setDriverStatus] = useState("OFFLINE");
    const [currentRide, setCurrentRide] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem("token");

        // If no token is present, redirect to login
        if (!token) {
            window.location.href = "/login";
        }
    }, []);

    const toggleDriverStatus = () => {
        const next = driverStatus === "ONLINE" ? "OFFLINE" : "ONLINE";
        setDriverStatus(next);

        // TODO: call backend
        // axios.put("/drivers/status", { status: next })
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
    };

    const acceptRide = () => {
        if (!currentRide) return;

        console.log("Accept ride", currentRide.id);

        // TODO: backend call
        // axios.post(`/rides/${currentRide.id}/accept`)
    };

    const rejectRide = () => {
        if (!currentRide) return;

        console.log("Reject ride", currentRide.id);

        setCurrentRide(null);

        // TODO: backend call
        // axios.post(`/rides/${currentRide.id}/reject`)
    };

    return (
        <div className="h-screen flex flex-col bg-gray-900 text-gray-100">

            {/* HEADER */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gray-800">

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
                        className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
                    >
                        Logout
                    </button>

                </div>

            </header>


            {/* MAIN */}
            {driverStatus === "OFFLINE" ? (

                <main className="flex flex-1 items-center justify-center">
                    <p className="text-lg text-gray-400">
                        Go online to accept rides.
                    </p>
                </main>

            ) : (

                <main className="flex flex-col md:flex-row flex-1">

                    {/* MAP */}
                    <div className="w-full md:w-2/3 h-[50%] md:h-full">

                        <MapContainer
                            center={[12.9, 77.6]}
                            zoom={13}
                            scrollWheelZoom={true}
                            className="h-full w-full"
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
                    <div className="w-full md:w-1/3 flex items-center justify-center p-6">

                        {currentRide ? (

                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow">

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
                                        className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded"
                                    >
                                        Accept
                                    </button>

                                    <button
                                        onClick={rejectRide}
                                        className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded"
                                    >
                                        Reject
                                    </button>

                                </div>

                            </div>

                        ) : (

                            <div className="text-center text-gray-400">
                                Waiting for ride requests...
                            </div>

                        )}

                    </div>

                </main>

            )}

        </div>
    );
}