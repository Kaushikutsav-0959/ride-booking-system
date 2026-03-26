Distributed Ride Booking System

A simplified Uber-like ride dispatch system built using an event-driven architecture.

The system simulates passengers requesting rides and drivers accepting them using Redis geospatial queries and Kafka-based ride dispatch.

⸻

Architecture Overview
	1.	Passenger creates a ride request via Ride API
	2.	Ride details are stored in Postgres
	3.	Outbox pattern writes event to Kafka
	4.	Kafka publishes ride request event
	5.	Driver service consumes the event
	6.	Redis GEO is used to find nearby drivers
	7.	Driver assignment and acceptance flow is executed

⸻

Tech Stack

Backend
	•	Java
	•	Spring Boot
	•	PostgreSQL
	•	Redis (GEO queries)
	•	Apache Kafka

Frontend
	•	React
	•	Leaflet.js (Map Rendering)

Simulation
	•	Python Driver Simulator

⸻

Infrastructure
	•	Kafka and Zookeeper are containerised using Docker Compose for local development
	•	Backend service is currently run locally
	•	Full system containerisation is planned

⸻

Key Design Decisions
	•	Kafka is used to decouple ride creation from driver assignment, enabling asynchronous processing and better scalability under high load
	•	Outbox Pattern ensures reliable event publishing and prevents inconsistency between database and Kafka
	•	Redis GEO enables efficient nearest-driver lookup with low latency compared to database-based queries
	•	Driver simulator is used to stress test the dispatch system and observe system behavior under high traffic

⸻

Features
	•	Ride creation flow
	•	Driver proximity discovery using Redis GEO
	•	Event-driven ride dispatch using Kafka
	•	Driver acceptance workflow
	•	React dashboard for ride monitoring
	•	Driver simulator generating high load traffic

⸻

Simulator

The driver simulator generates:
	•	Passengers
	•	Drivers
	•	Ride requests
	•	Driver acceptance events

This enables testing the system under concurrent load and observing dispatch behavior.

⸻

Trade-offs
	•	Kafka introduces eventual consistency in ride assignment
	•	Redis requires continuous updates to maintain accurate driver locations

⸻

Why This Project

This project demonstrates practical implementation of distributed systems concepts:
	•	Event-driven architecture using Kafka
	•	Reliable event publishing using Outbox Pattern
	•	Low-latency geospatial queries using Redis GEO
	•	Handling high concurrency using simulation-based load testing

⸻

Future Work
	•	Containerise backend service
	•	Integrate full system into Docker Compose
	•	Add environment-based configuration
	•	Improve fault tolerance and retry mechanisms

⸻

License

MIT License
