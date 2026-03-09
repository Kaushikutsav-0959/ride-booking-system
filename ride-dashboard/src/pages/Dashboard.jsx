import { useEffect, useState } from "react";
import axios from "axios";

export default function Dashboard() {
    const [rides, setRides] = useState([]);

    const fetchRides = async () => {
        try {
            const res = await axios.get("http://localhost:8080/rides");
            setRides(res.data);
        } catch (err) {
            console.error("Error fetching rides.", err);
        }
    };

    useEffect(() => {
        fetchRides();
        const interval = setInterval(fetchRides, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-6 md:p-10 bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center md:text-left w-full max-w-5xl">
                Ride Dispatch Dashboard
            </h1>

            <div className="w-full max-w-5xl overflow-x-auto">
            <table className="w-full bg-gray-800 text-gray-100 shadow rounded">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="p-3 text-left text-sm md:text-base">Ride ID</th>
                        <th className="p-3 text-left text-sm md:text-base">Status</th>
                        <th className="p-3 text-left text-sm md:text-base">Driver</th>
                        <th className="p-3 text-left text-sm md:text-base">Created</th>
                    </tr>
                </thead>

                <tbody>
                    {rides.map((ride) => (
                        <tr key={ride.rideId} className="border-t border-gray-700">
                            <td className="p-3 text-sm md:text-base">{ride.rideId}</td>
                            <td className="p-3 text-sm md:text-base">{ride.status}</td>
                            <td className="p-3 text-sm md:text-base">{ride.driverId ? ride.driverId : "-"}</td>
                            <td className="p-3 text-sm md:text-base">{ride.createdAt}</td>
                            
                        </tr>
                    ))}
                </tbody>

            </table>
            </div>
        </div>
    );
}