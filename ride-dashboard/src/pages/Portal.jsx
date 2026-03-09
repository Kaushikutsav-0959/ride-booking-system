import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DriverDashboard from "./DriverDashboard.jsx";
import PassengerDashboard from "./PassengerDashboard.jsx";

export default function Portal() {
    const navigate = useNavigate();

    const role = localStorage.getItem("role");

    useEffect(() => {
        if (role === "PASSENGER") {
            navigate("/passenger");
        }
    }, [role, navigate]);

    const goPassenger = () => {
        navigate("/passenger");
    };

    const goDriver = () => {
        navigate("/driver");
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow w-96 text-center">
                <h1 className="text-2xl font-bold mb-6">Choose mode :</h1>
                <button
                    onClick={goPassenger}
                    className="bg-blue-600 text-white p-3 w-full rounded mb-4"
                >Ride as Passenger</button>

                <button
                    onClick={goDriver}
                    className="bg-blue-600 text-white p-3 w-full rounded mb-4"
                >Go online and accept rides</button>
            </div>
        </div>
    )
}