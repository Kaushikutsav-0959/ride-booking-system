import { useState, useEffect, useRef } from "react";
import api from "../api/api";
import { useNavigate } from "react-router-dom";

export default function Register() {
    const [name, setName] = useState("");
    const [role, setRole] = useState("PASSENGER");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const navigate = useNavigate();

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

        const PARTICLES = 70;
        const particles = [];

        class P {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 0.3;
                this.vy = (Math.random() - 0.5) * 0.3;
            }
            update() {
                this.x += this.vx;
                this.y += this.vy;
                if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
                if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
                ctx.shadowBlur = 6;
                ctx.shadowColor = "white";
                ctx.fillStyle = "white";
                ctx.fill();
            }
        }

        for (let i = 0; i < PARTICLES; i++) particles.push(new P());

        const connect = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255,255,255,${1 - d / 120})`;
                        ctx.lineWidth = 0.3;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => { p.update(); p.draw(); });
            connect();
            requestAnimationFrame(animate);
        };
        animate();

        return () => window.removeEventListener("resize", resize);
    }, []);

    const register = async () => {
        try {
            await api.post("/auth/register", {
                name,
                email,
                password,
                role
            });
            alert("Registration Successful. Please login.");
            navigate("/login");
        } catch (err) {
            console.error("Registration failed", err);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen px-6 overflow-hidden text-white bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 z-0"></canvas>
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80"></div>

            {/* Card */}
            <div className="relative z-10 w-full max-w-2xl p-10 border shadow-2xl md:p-12 rounded-3xl bg-white/5 backdrop-blur-2xl border-white/10">

                {/* Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-semibold tracking-wide md:text-4xl">
                        Create your account
                    </h1>
                    <p className="mt-2 text-gray-400">
                        Join the network. Ride, drive, or build.
                    </p>
                </div>

                {/* Form */}
                <div className="space-y-5">

                    <div>
                        <label className="block mb-2 text-sm text-gray-400">Full Name</label>
                        <input
                            className="w-full p-3 transition bg-transparent border rounded-lg border-white/20 focus:outline-none focus:border-white/50 focus:bg-white/5"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm text-gray-400">Email</label>
                        <input
                            className="w-full p-3 transition bg-transparent border rounded-lg border-white/20 focus:outline-none focus:border-white/50 focus:bg-white/5"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm text-gray-400">Password</label>
                        <input
                            className="w-full p-3 transition bg-transparent border rounded-lg border-white/20 focus:outline-none focus:border-white/50 focus:bg-white/5"
                            placeholder="••••••••"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {/* Role Selection (better UI than dropdown) */}
                    <div>
                        <label className="block mb-2 text-sm text-gray-400">Role</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setRole("PASSENGER")}
                                className={`p-3 rounded-lg border transition ${
                                    role === "PASSENGER"
                                        ? "bg-white text-black border-white"
                                        : "bg-white/5 border-white/20 hover:bg-white/10"
                                }`}
                            >
                                Passenger
                            </button>

                            <button
                                type="button"
                                onClick={() => setRole("DRIVER")}
                                className={`p-3 rounded-lg border transition ${
                                    role === "DRIVER"
                                        ? "bg-white text-black border-white"
                                        : "bg-white/5 border-white/20 hover:bg-white/10"
                                }`}
                            >
                                Driver
                            </button>
                        </div>
                    </div>

                </div>

                {/* CTA */}
                <button
                    onClick={register}
                    className="w-full mt-8 py-3 font-semibold text-black bg-white rounded-lg hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02]"
                >
                    Create Account
                </button>

                {/* Footer */}
                <p className="mt-6 text-sm text-center text-gray-400">
                    Already have an account?{" "}
                    <span
                        onClick={() => navigate("/login")}
                        className="text-white cursor-pointer hover:underline"
                    >
                        Login
                    </span>
                </p>
            </div>
        </div>
    );
}