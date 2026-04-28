import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DriverDashboard from "./DriverDashboard.jsx";
import PassengerDashboard from "./PassengerDashboard.jsx";

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

export default function Portal() {
    const navigate = useNavigate();

    const role = localStorage.getItem("role");
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

    useEffect(() => {
        if (role === "PASSENGER") {
            navigate("/passenger");
        } else if (role === "DRIVER") {
            navigate("/driver");
        } else if (role === "ADMIN") {
            navigate("/portal");
        }
    }, [role, navigate]);

    const goPassenger = () => {
        localStorage.setItem("role", "PASSENGER");
        navigate("/passenger");
    };

    const goDriver = () => {
        localStorage.setItem("role", "DRIVER");
        navigate("/driver");
    };

    const goAdmin = () => {
        localStorage.setItem("role", "ADMIN");
        navigate("/dashboard");
    }

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden text-white bg-black">
            <canvas ref={canvasRef} className="absolute inset-0 z-0"></canvas>
            <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80"></div>
            <div className="relative z-10 w-full max-w-xl p-10 text-center border shadow-2xl md:p-12 rounded-3xl bg-white/5 backdrop-blur-2xl border-white/10">
                <h1 className="mb-6 text-3xl font-semibold md:text-4xl">
                    Choose your mode
                </h1>
                <p className="mb-8 text-gray-400">
                    Enter the system as a passenger or go online as a driver.
                </p>
                {role === "ADMIN" && (
                    <button
                        onClick={goAdmin}
                        className="w-full mb-4 p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all duration-200"
                    >
                        Go to the admin dashboard
                    </button>
                )}

                <button
                    onClick={goPassenger}
                    className="w-full mb-4 p-4 rounded-xl bg-white text-black font-semibold hover:bg-gray-200 hover:scale-[1.02] transition-all duration-200"
                >
                    Ride as Passenger
                </button>
                <button
                    onClick={goDriver}
                    className="w-full p-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all duration-200"
                >
                    Go online and accept rides
                </button>
            </div>
        </div>
    )
}