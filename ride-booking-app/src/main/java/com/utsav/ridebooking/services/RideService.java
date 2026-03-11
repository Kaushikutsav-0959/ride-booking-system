package com.utsav.ridebooking.services;

import java.util.List;
import java.util.Optional;
import java.util.EnumSet;
import java.time.LocalDateTime;
import java.util.ArrayList;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.utsav.ridebooking.models.Ride;
import com.utsav.ridebooking.models.User;
import com.utsav.ridebooking.DTO.RideRequest;
import com.utsav.ridebooking.cache.RedisLocationService;
import com.utsav.ridebooking.events.RideEvent;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.RideStatus;
import com.utsav.ridebooking.models.DriverStatus;
import com.utsav.ridebooking.models.OutboxEvent;
import com.utsav.ridebooking.repository.DriverRepository;
import com.utsav.ridebooking.repository.RideRepository;
import com.utsav.ridebooking.repository.UserRepository;
import com.utsav.ridebooking.repository.OutboxRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class RideService {

    private static final Logger log = LoggerFactory.getLogger(RideService.class);

    private final RideRepository rideRepository;
    private final DriverRepository driverRepository;
    private final UserRepository userRepository;
    private final OutboxRepository outboxRepository;
    private final RedisLocationService redisLocationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RideService(
            RideRepository rideRepository,
            DriverRepository driverRepository,
            UserRepository userRepository,
            RedisLocationService redisLocationService,
            OutboxRepository outboxRepository) {

        this.rideRepository = rideRepository;
        this.driverRepository = driverRepository;
        this.userRepository = userRepository;
        this.redisLocationService = redisLocationService;
        this.outboxRepository = outboxRepository;
    }

    @Transactional
    public Ride createRide(RideRequest rideRequest, String email) {

        if (rideRequest.getPickupLat() == null || rideRequest.getPickupLong() == null
                || rideRequest.getDropLat() == null || rideRequest.getDropLong() == null) {
            throw new RuntimeException("Missing location coordinates. Cannot create a ride.");
        }
        Ride ride = new Ride();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User with this email doesn't exist."));
        ride.setCustomerId(user.getUserId());
        ride.setRideStatus(RideStatus.REQUESTED);
        ride.setUpdatedAt(LocalDateTime.now());
        ride.setPickupLat(rideRequest.getPickupLat());
        ride.setPickupLong(rideRequest.getPickupLong());
        ride.setDropLat(rideRequest.getDropLat());
        ride.setDropLong(rideRequest.getDropLong());
        log.info("Creating ride with pickupLat={}", rideRequest.getPickupLat());
        Ride savedRide = rideRepository.save(ride);
        log.info("METRIC ride.created rideId={} customerId={}", savedRide.getId(), user.getUserId());
        publishRide(savedRide.getId());
        return savedRide;
    }

    @Transactional
    public Ride publishRide(Long rideId) {

        Ride unassignedRide = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride couldn't be found."));

        if (unassignedRide.getRideStatus() != RideStatus.REQUESTED) {
            throw new RuntimeException("Illegal state attachment.");
        }

        long dispatchStart = System.currentTimeMillis();
        double radius = 2.0;

        List<Long> nearbyDriverIds = redisLocationService.fetchNearestDrivers(unassignedRide.getPickupLat(),
                unassignedRide.getPickupLong(),
                radius);

        while (nearbyDriverIds.isEmpty() && radius < 9) {
            radius += 2;
            nearbyDriverIds = redisLocationService.fetchNearestDrivers(unassignedRide.getPickupLat(),
                    unassignedRide.getPickupLong(),
                    radius);
        }

        List<Long> eligibleDriverIds = new ArrayList<>();

        for (Long driverId : nearbyDriverIds) {
            Optional<Driver> optionalDriver = driverRepository.findById(driverId);
            if (optionalDriver.isEmpty()) {
                continue;
            }
            Driver driver = optionalDriver.get();
            if (driver.getDriverStatus() != DriverStatus.ONLINE) {
                continue;
            }
            eligibleDriverIds.add(driver.getDriverId());
        }
        long dispatchLatency = System.currentTimeMillis() - dispatchStart;
        log.info("METRIC dispatch.search.latencyMs={} rideId={} driversFound={}",
                dispatchLatency, rideId, nearbyDriverIds.size());
        redisLocationService.storeEligibleDrivers(rideId, eligibleDriverIds);
        log.info("Eligible drivers for ride {} = {}", rideId, eligibleDriverIds);
        if (eligibleDriverIds.isEmpty()) {
            throw new RuntimeException("No eligible drivers available.");
        }

        RideEvent event = new RideEvent();
        event.setRideId(unassignedRide.getId());
        event.setCustomerId(unassignedRide.getCustomerId());
        event.setEligibleDrivers(eligibleDriverIds);
        event.setTimestamp(System.currentTimeMillis());
        event.setEventType("RIDE_REQUESTED");

        OutboxEvent outbox = new OutboxEvent();
        outbox.setAggregateType("RIDE");
        outbox.setAggregateId(unassignedRide.getId());
        outbox.setEventType("RIDE_REQUESTED");

        try {
            outbox.setPayload(objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize RideEvent for outbox", e);
        }

        outbox.setCreatedAt(LocalDateTime.now());
        outboxRepository.save(outbox);

        unassignedRide.setUpdatedAt(LocalDateTime.now());

        log.info("Ride {} published to {} drivers", rideId, eligibleDriverIds.size());
        for (Long driver : eligibleDriverIds) {
            log.debug("Eligible driverId={}", driver);
        }
        return unassignedRide;
    }

    public Optional<Ride> getActiveRideForDriver(Long driverId) {
        return rideRepository.findByDriverIdAndStatusIn(driverId,
                EnumSet.of(RideStatus.ASSIGNED, RideStatus.IN_PROGRESS));
    }

    public List<Ride> getRidesForCustomers(Long customerId) {
        return rideRepository.findByCustomerId(customerId);
    }

    @Transactional
    public Ride updateRideStatus(Long rideId, RideStatus status) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride not found."));

        ride.setRideStatus(status);
        return rideRepository.save(ride);
    }

    @Transactional
    public Ride acceptRide(Long rideId, Long driverId) {

        log.info("Accept attempt rideId={} driverId={}", rideId, driverId);
        log.info("METRIC ride.accept.attempt rideId={} driverId={}", rideId, driverId);

        Ride ride = rideRepository.findWithLockById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found."));

        log.debug("Current ride status for rideId={} status={}", rideId, ride.getRideStatus());

        List<Long> eligibleDrivers = redisLocationService.getEligibleDrivers(rideId);

        log.debug("Eligible drivers for rideId={} drivers={}", rideId, eligibleDrivers);

        if (!eligibleDrivers.contains(driverId)) {
            throw new RuntimeException("Driver not eligible for this ride.");
        }

        // Redis race-condition guard: ensure only one driver can claim the ride
        boolean claimed = redisLocationService.tryClaimRide(rideId, driverId);
        if (!claimed) {
            throw new RuntimeException("Ride already claimed by another driver.");
        }

        Driver driver = driverRepository.findWithLockByDriverId(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found."));

        if (ride.getRideStatus() != RideStatus.REQUESTED) {
            throw new RuntimeException("Invalid state transition.");
        }

        if (driver.getDriverStatus() != DriverStatus.ONLINE) {
            throw new RuntimeException("Invalid state transition : Can't assign ride to a non available driver.");
        }

        ride.setDriverId(driverId);
        ride.setRideStatus(RideStatus.ASSIGNED);
        ride.setUpdatedAt(LocalDateTime.now());
        ride.setAcceptedAt(LocalDateTime.now());
        driver.setDriverStatus(DriverStatus.ON_RIDE);
        driverRepository.save(driver);

        log.info("Ride accepted rideId={} driverId={}", rideId, driverId);
        log.info("METRIC ride.accept.success rideId={} driverId={}", rideId, driverId);

        redisLocationService.clearEligibleDrivers(rideId);

        rideRepository.save(ride);

        RideEvent event = new RideEvent();
        event.setRideId(ride.getId());
        event.setCustomerId(ride.getCustomerId());
        event.setDriverId(ride.getDriverId());
        event.setTimestamp(System.currentTimeMillis());
        event.setEventType("RIDE_ACCEPTED");

        OutboxEvent outbox = new OutboxEvent();
        outbox.setAggregateType("RIDE");
        outbox.setAggregateId(ride.getId());
        outbox.setEventType("RIDE_ACCEPTED");

        try {
            outbox.setPayload(objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize RideEvent for outbox", e);
        }

        outbox.setCreatedAt(LocalDateTime.now());

        outboxRepository.save(outbox);
        return ride;
    }

    @Transactional
    public Ride rejectRide(Long rideId, Long driverId) {
        Ride ride = rideRepository.findWithLockById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found."));
        log.info("METRIC ride.reject.attempt rideId={} driverId={}", rideId, driverId);

        if (ride.getRideStatus() == RideStatus.IN_PROGRESS) {
            throw new RuntimeException("Invalid state transition.");
        }

        List<Long> eligibleDriverIds = redisLocationService.getEligibleDrivers(rideId);
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found."));

        if (!eligibleDriverIds.contains(driver.getDriverId())) {
            throw new RuntimeException("Ineligible driver.");
        }

        if (ride.getRideStatus() == RideStatus.ASSIGNED) {

            if (!driverId.equals(ride.getDriverId())) {
                redisLocationService.clearEligibleDriver(rideId, driverId);
            }
            driver.setDriverStatus(DriverStatus.ONLINE);
            ride.setRideStatus(RideStatus.REQUESTED);
            redisLocationService.clearRideClaim(rideId);
            publishRide(rideId);
        }

        redisLocationService.clearEligibleDriver(rideId, driverId);
        ride.setUpdatedAt(LocalDateTime.now());
        rideRepository.save(ride);
        driverRepository.save(driver);

        RideEvent event = new RideEvent();
        event.setRideId(ride.getId());
        event.setCustomerId(ride.getCustomerId());
        event.setDriverId(driverId);
        event.setTimestamp(System.currentTimeMillis());
        event.setEventType("RIDE_REJECTED");

        OutboxEvent outbox = new OutboxEvent();
        outbox.setAggregateType("RIDE");
        outbox.setAggregateId(ride.getId());
        outbox.setEventType("RIDE_REJECTED");

        try {
            outbox.setPayload(objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize RideEvent for outbox", e);
        }

        outbox.setCreatedAt(LocalDateTime.now());
        outboxRepository.save(outbox);

        return ride;
    }

    @Transactional
    public Ride completeRide(Long rideId) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride not found."));
        ride.setRideStatus(RideStatus.COMPLETED);
        log.info("METRIC ride.completed rideId={} driverId={}", rideId, ride.getDriverId());
        Driver driver = driverRepository.findById(ride.getDriverId())
                .orElseThrow(() -> new RuntimeException("Driver wasn't found."));
        driver.setDriverStatus(DriverStatus.ONLINE);
        driverRepository.save(driver);
        redisLocationService.clearRideClaim(rideId);
        ride.setUpdatedAt(LocalDateTime.now());
        rideRepository.save(ride);

        RideEvent event = new RideEvent();
        event.setRideId(ride.getId());
        event.setCustomerId(ride.getCustomerId());
        event.setDriverId(ride.getDriverId());
        event.setTimestamp(System.currentTimeMillis());
        event.setEventType("RIDE_COMPLETED");

        OutboxEvent outbox = new OutboxEvent();
        outbox.setAggregateType("RIDE");
        outbox.setAggregateId(ride.getId());
        outbox.setEventType("RIDE_COMPLETED");

        try {
            outbox.setPayload(objectMapper.writeValueAsString(event));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize RideEvent for outbox", e);
        }

        outbox.setCreatedAt(LocalDateTime.now());
        outboxRepository.save(outbox);

        return ride;
    }

    @Transactional
    public Ride startRide(Long rideId, Long driverId) {
        log.info("METRIC ride.start.attempt rideId={} driverId={}", rideId, driverId);
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride couldn't be found."));
        if (ride.getRideStatus() != RideStatus.ASSIGNED) {
            throw new RuntimeException("Illegal state transition.");
        }
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver wasn't found."));
        if (driver.getDriverStatus() != DriverStatus.ON_RIDE) {
            throw new RuntimeException("Illegal state transition and illegal driver entity.");
        }
        ride.setRideStatus(RideStatus.IN_PROGRESS);
        log.info("METRIC ride.start.success rideId={} driverId={}", rideId, driverId);
        driverRepository.save(driver);
        ride.setUpdatedAt(LocalDateTime.now());
        return rideRepository.save(ride);
    }

    @Transactional
    public Ride arrivedAtPickup(Long rideId, Long driverId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride couldn't be found."));
        if (!ride.getDriverId().equals(driverId)) {
            throw new RuntimeException("Driver mismatch");
        }

        if (ride.getRideStatus() != RideStatus.ASSIGNED) {
            throw new RuntimeException("Illegal state: Ride not assigned yet.");
        }

        ride.setRideStatus(RideStatus.ARRIVED_AT_PICKUP);
        log.info("METRIC ride.arrived_pickup rideId={} driverId={}", rideId, driverId);
        ride.setUpdatedAt(LocalDateTime.now());

        return rideRepository.save(ride);
    }

    @Transactional
    public Ride cancelRide(Long rideId) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride was not found."));
        log.info("METRIC ride.cancel.attempt rideId={}", rideId);

        if (ride.getRideStatus() == RideStatus.IN_PROGRESS || ride.getRideStatus() == RideStatus.COMPLETED) {
            throw new RuntimeException("Ride cannot be cancelled at this stage.");
        }

        if (ride.getDriverId() != null) {
            Driver driver = driverRepository.findById(ride.getDriverId())
                    .orElseThrow(() -> new RuntimeException("Driver with the requested ID wasn't found."));

            if (driver.getDriverStatus() == DriverStatus.ON_RIDE) {
                driver.setDriverStatus(DriverStatus.ONLINE);
                driverRepository.save(driver);
            }
        }

        ride.setRideStatus(RideStatus.CANCELLED);
        log.info("METRIC ride.cancel.success rideId={}", rideId);
        redisLocationService.clearEligibleDrivers(rideId);
        redisLocationService.clearRideClaim(rideId);
        ride.setUpdatedAt(LocalDateTime.now());
        return rideRepository.save(ride);
    }
}