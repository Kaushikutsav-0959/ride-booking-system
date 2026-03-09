import { useState } from "react";
import api from "../api/api"
import { Navigate, useNavigate } from "react-router-dom";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

    const login = async () => {
        try {
            const res = await api.post("/auth/login", {
                email, password
            });

            const data = res.data;

            const token = data.accessToken || data.token;
            const role = data.role;

            localStorage.setItem("token", token);
            localStorage.setItem("role", role);

            alert("Login Successful.");
            setEmail("");
            setPassword("");
            navigate("/portal");
        } catch (err) {
            console.error("Login failed", err);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-gray-100 px-6">
            <div className="bg-gray-800 p-6 md:p-8 rounded shadow w-full max-w-sm">
                <h1 className="text-xl md:text-2xl font-bold mb-6 text-center">Ride App Login</h1>
            <input
                className="border border-gray-600 bg-gray-900 text-gray-100 p-2 w-full mb-3 rounded"
                placeholder="Email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
            />

            <input
                className="border border-gray-600 bg-gray-900 text-gray-100 p-2 w-full mb-4 rounded"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <button
                onClick={login}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 w-full rounded"
            >
                Login
                </button>
            </div>
        </div>
    )
}