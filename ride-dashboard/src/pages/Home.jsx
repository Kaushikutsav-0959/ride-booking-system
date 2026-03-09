import { Link } from "react-router-dom";

export default function Home() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
                Ride Booking System
            </h1>

            <p className="mb-8 text-gray-400 max-w-md">
                Distributed Ride Dispatch Simulator
            </p>

            <div className="flex flex-col md:flex-row gap-4 w-full max-w-xs md:max-w-none items-center justify-center mx-auto">
                <Link
                    to="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded w-full md:w-auto"
                >
                    Login
                </Link>

                <Link
                    to="/register"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded w-full md:w-auto"
                >
                    Register
                </Link>
            </div>
        </div>
    );
}