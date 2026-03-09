import { useState } from "react";
import api from "../api/api";
import { Navigate, useNavigate } from "react-router-dom";

export default function Register() {
    const [name, setName] = useState("");
    const [role, setRole] = useState("PASSENGER");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = new useNavigate();

    const register = async () => {
        try {
            await api.post("/auth/register", {
                name, email, password, role
            });
            alert("Registration Successful. Please login.");
            setEmail("");
            setPassword("");
            setName("");
            navigate("/login");
        } catch (err) {
            console.error("Registration failed", err);
        }
    };
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded shadow w-80">
                <h1 className=" text-2xl font-bold mb-6">Ride App Registration</h1>
            <input
                className="border p-2 w-full mb-3"
                placeholder="Name"
                value={name}
                onChange={(e)=>setName(e.target.value)}
            />

            <input
                className="border p-2 w-full mb-3"
                placeholder="Email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
            />

            <input
                className="border p-2 w-full mb-4"
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <select
                className="border p-2 w-full mb-4"
                value={role}
                onChange={(e)=>setRole(e.target.value)}
            >
                <option value="PASSENGER">Passenger</option>
                <option value="DRIVER">Driver</option>
            </select>

            <button
                onClick={register}
                className="bg-blue-600 text-white p-2 w-full rounded"
            >
                Register here.
            </button>
            </div>
        </div>
    )
}