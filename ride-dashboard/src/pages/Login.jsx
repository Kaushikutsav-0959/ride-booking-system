import { useState, useEffect, useRef } from "react";
import api from "../api/api"
import { Navigate, useNavigate } from "react-router-dom";

// Particle class for background animation
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx.shadowBlur = 6;
        ctx.shadowColor = "white";
        ctx.fillStyle = "white";
        ctx.fill();
    }
}

export default function Login() {
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

        const PARTICLES = 60;
        const particles = [];

        for (let i = 0; i < PARTICLES; i++) particles.push(new Particle(canvas));

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
            particles.forEach(p => { p.update(); p.draw(ctx); });
            connect();
            requestAnimationFrame(animate);
        };
        animate();

        return () => window.removeEventListener("resize", resize);
    }, []);

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

            if (err.response && err.response.status === 403) {
                alert("User not found or session invalid. Please register again.");
                localStorage.clear();
                navigate("/register");
            } else {
                alert("Login failed. Please check your credentials.");
            }
        }
    };

    return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden text-white bg-black">

        <canvas ref={canvasRef} className="absolute inset-0 z-0"></canvas>
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80"></div>

        <div className="relative z-10 w-full max-w-xl p-10 border shadow-2xl md:p-12 rounded-3xl bg-white/5 backdrop-blur-2xl border-white/10">

            <div className="mb-8 text-center">
                <h1 className="text-3xl font-semibold tracking-wide md:text-4xl">
                    Welcome back
                </h1>
                <p className="mt-2 text-gray-400">
                    Continue your journey through the system.
                </p>
            </div>

            <div className="space-y-5">

                <div>
                    <label className="block mb-2 text-sm text-gray-400">Email</label>
                    <input
                        className="w-full p-3 transition bg-transparent border rounded-lg border-white/20 focus:outline-none focus:border-white/50 focus:bg-white/5"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e)=>setEmail(e.target.value)}
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

            </div>

            <button
                onClick={login}
                className="w-full mt-8 py-3 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 hover:scale-[1.02] transition-all duration-200"
            >
                Login
            </button>

            <p className="mt-6 text-sm text-center text-gray-400">
                Don't have an account?{" "}
                <span
                    onClick={() => navigate("/register")}
                    className="text-white cursor-pointer hover:underline"
                >
                    Sign up
                </span>
            </p>
        </div>
    </div>
);
}