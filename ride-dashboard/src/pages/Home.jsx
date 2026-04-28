import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

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
        ctx.shadowBlur = 8;
        ctx.shadowColor = "white";
        ctx.fillStyle = "white";
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowColor = "transparent";
    }
}

export default function Home() {
    const canvasRef = useRef(null);
    const authRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        let particles = [];
        const PARTICLE_COUNT = 80;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resize();
        window.addEventListener("resize", resize);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle(canvas));
        }

        const connect = () => {
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(255,255,255,${1 - distance / 120})`;
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

            particles.forEach((p) => {
                p.update();
                p.draw(ctx);
            });

            connect();
            requestAnimationFrame(animate);
        };

        animate();

        // Parallax scroll effect
        const handleScroll = () => {
            const offset = window.scrollY * 0.2;
            if (canvas) {
                canvas.style.transform = `translateY(${offset}px)`;
            }
        };

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("resize", resize);
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    const scrollToAuth = () => {
        authRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
        <div className="relative min-h-screen overflow-y-auto text-white bg-black">

            {/* Canvas Background */}
            <canvas ref={canvasRef} className="fixed inset-0 z-0"></canvas>

            {/* Overlay gradient */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80"></div>

            {/* Main Content */}
            <div className="relative z-10 flex flex-col items-center px-6 text-center">

                {/* HERO */}
                <section className="flex flex-col items-center justify-center min-h-screen animate-[fadeIn_1s_ease_forwards]">
                    <div className="relative flex flex-col items-center justify-center -mt-10 md:-mt-20">
                        
                        <h1 className="mb-6 text-6xl font-bold md:text-6xl">
                            Ride Booking System
                        </h1>
                        <p className="max-w-md mx-auto mb-8 text-gray-400 md:text-2xl">
                            Distributed Ride Dispatch System
                        </p>
                        <div
                            onClick={scrollToAuth}
                            className="flex flex-col items-center mt-10 cursor-pointer group"
                        >
                            <button
                                className="text-gray-400 transition-all duration-300 hover:text-white animate-bounce group-hover:text-white"
                            >
                                ↓
                            </button>
                            <p className="mt-4 text-sm text-gray-500 transition-all duration-300 group-hover:text-gray-300">
                                Let’s ride - we’ll take you where you want to go.
                            </p>
                        </div>
                    </div>
                </section>

                {/* AUTH SECTION */}
                <section ref={authRef} className="w-full max-w-4xl py-20 text-center">

                    <div className="p-10 border rounded-2xl bg-white/5 border-white/10 backdrop-blur-lg">

                        <h3 className="mb-4 text-2xl font-semibold">
                            Ready to explore the system?
                        </h3>

                        <div className="mb-8 space-y-1 text-gray-400">
                            <p>Already a part?</p>
                            <p className="font-medium text-white">Login</p>
                            <p className="pt-2">New here?</p>
                            <p className="font-medium text-white">We’re happy to have you. Register</p>
                        </div>

                        <div className="flex flex-col justify-center gap-4 md:flex-row">
                            <Link
                                to="/login"
                                className="px-6 py-3 font-semibold text-black bg-white rounded-lg hover:bg-gray-200 transition-all duration-200 hover:scale-[1.03]"
                            >
                                Login
                            </Link>

                            <Link
                                to="/register"
                                className="px-6 py-3 font-semibold border border-white/20 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 hover:scale-[1.03]"
                            >
                                Register
                            </Link>
                        </div>

                    </div>

                </section>

                {/* FEATURES SECTION */}
                <section className="w-full max-w-5xl py-20 animate-[fadeIn_1s_ease_forwards]">
                    <h2 className="mb-10 text-2xl font-semibold">System Highlights</h2>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {["Real-time Matching", "Event Driven (Kafka)", "Low Latency (Redis)"].map((item, i) => (
                            <div
                                key={i}
                                className="p-6 border rounded-xl bg-white/5 border-white/10 backdrop-blur-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* CARS SCROLL */}
                <section className="w-full max-w-6xl py-20 animate-[fadeIn_1s_ease_forwards]">
                    <h2 className="relative z-20 mb-8 text-2xl font-semibold">Available Rides</h2>

                    <div 
                        className="flex justify-center gap-6 mt-6 pb-4 overflow-x-auto overflow-y-visible scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                        {[1,2,3,4,5].map((i) => (
                            <div
                                key={i}
                                className="min-w-[160px] snap-start p-4 rounded-xl flex items-center justify-center gap-3 bg-white/5 border border-white/10 backdrop-blur-lg origin-bottom hover:-translate-y-1 hover:z-10 transform-gpu will-change-transform cursor-pointer transition-all duration-300"
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-xl">
                                        {["🚗", "🚙", "🚘", "🚖", "🛺"][i % 5]}
                                    </span>
                                    <span className="text-base font-semibold tracking-wide">
                                        {["Mini", "Sedan", "SUV", "Premium", "Auto"][i % 5]}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* LIVE DISPATCH */}
                <section className="w-full max-w-6xl py-20 animate-[fadeIn_1s_ease_forwards]">
                    <h2 className="mb-8 text-2xl font-semibold">Live Dispatch View</h2>

                    <div className="relative w-full p-6 border rounded-3xl bg-white/5 border-white/10 backdrop-blur-lg">

                        {/* Car silhouette vibe (subtle) */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="w-full h-full border border-white/20 rounded-[80px]"></div>
                        </div>

                        {/* Map container */}
                        <div className="relative w-full h-64 overflow-hidden border rounded-2xl bg-black/40 border-white/10">

                            {/* Grid */}
                            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] bg-[size:40px_40px]"></div>

                            {/* Path */}
                            <div className="absolute h-[2px] bg-white/40 top-[50%] left-[20%] w-[60%]"></div>

                            {/* Driver */}
                            <div className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] animate-[moveDriver_6s_linear_infinite]"></div>

                            {/* Animate driver keyframes */}
                            <style>
                            {`
                            @keyframes moveDriver {
                                0% { top: 30%; left: 20%; }
                                50% { top: 50%; left: 45%; }
                                100% { top: 70%; left: 75%; }
                            }
                            `}
                            </style>

                            {/* Pickup */}
                            <div className="absolute w-3 h-3 bg-green-400 rounded-full top-[30%] left-[20%] shadow-[0_0_10px_green]"></div>

                            {/* Drop */}
                            <div className="absolute w-3 h-3 bg-blue-400 rounded-full top-[70%] left-[75%] shadow-[0_0_10px_blue]"></div>

                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}