# Distributed Ride Booking System

A simplified **Uber-like ride dispatch system** built using event-driven architecture.

The system simulates passengers requesting rides and drivers accepting them using Redis geospatial queries and Kafka-based ride dispatch.

---

## Architecture

Passenger requests a ride → Ride Service publishes event → Kafka → Driver dispatch → Driver accepts ride.

```
Passenger → Ride Service → Kafka → Driver Dispatch → Driver Dashboard
                 │
                 ▼
              Redis GEO
```

Redis is used for fast driver proximity search.

Kafka is used for ride event streaming and dispatch.

---

## Tech Stack

Backend
- Java
- Spring Boot
- Redis GEO
- Apache Kafka

Frontend
- React
- Leaflet.js (Map Rendering)

Simulation
- Python Driver Simulator

Infrastructure
- Docker
- Docker Compose

---

## Project Structure

```
ride-booking-system
│
├ ride-booking-app      # Spring Boot backend
├ ride-dashboard        # React dashboard
├ driver-simulator      # Python load simulator
├ docker-compose.yml    # Infrastructure orchestration
```

---

## Features

- Ride creation
- Driver proximity discovery using Redis GEO
- Event-driven ride dispatch using Kafka
- Driver acceptance flow
- React dashboard for ride monitoring
- Driver simulator generating high load traffic

The simulator can generate **hundreds of passengers and drivers** to test the dispatch system.

---

## Running the System

Start the full stack:

```
docker-compose up --build
```

Services started:

- Backend API
- Redis
- Kafka
- React Dashboard
- Driver Simulator

---

## Simulator

The driver simulator creates:

- Passengers
- Drivers
- Ride requests
- Driver acceptance

This allows stress testing the dispatch pipeline.

---

## Why This Project

This project demonstrates:

- Event-driven system design
- Distributed ride dispatch architecture
- Geospatial queries with Redis
- Kafka event streaming
- Containerized microservices using Docker

---

## License

MIT License
