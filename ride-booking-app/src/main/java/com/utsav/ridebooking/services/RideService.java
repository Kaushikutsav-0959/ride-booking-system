package com.utsav.ridebooking.services;

import java.util.List;
import java.util.Optional;
import java.util.EnumSet;
import java.time.LocalDateTime;
import java.util.ArrayList;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.utsav.ridebooking.models.Ride;
import com.utsav.ridebooking.models.User;
import com.utsav.ridebooking.DTO.RideRequest;
import com.utsav.ridebooking.cache.RedisLocationService;
import com.utsav.ridebooking.config.KafkaTopics;
import com.utsav.ridebooking.events.RideEvent;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.RideStatus;
import com.utsav.ridebooking.models.DriverStatus;
import com.utsav.ridebooking.repository.DriverRepository;
import com.utsav.ridebooking.repository.RideRepository;
import com.utsav.ridebooking.repository.UserRepository;

@Service
public class RideService {

    private final RideRepository rideRepository;
    private final DriverRepository driverRepository;
    private final UserRepository userRepository;
    private final RedisLocationService redisLocationService;
    private final RideEventPublisher rideEventPublisher;

    public RideService(RideRepository rideRepository, DriverRepository driverRepository,
            UserRepository userRepository, RedisLocationService redisLocationService,
            RideEventPublisher rideEventPublisher) {
        this.rideRepository = rideRepository;
        this.driverRepository = driverRepository;
        this.userRepository = userRepository;
        this.redisLocationService = redisLocationService;
        this.rideEventPublisher = rideEventPublisher;
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
        ride.setPickupLat(rideRequest.getPickupLat());
        ride.setPickupLong(rideRequest.getPickupLong());
        ride.setDropLat(rideRequest.getDropLat());
        ride.setDropLong(rideRequest.getDropLong());
        System.out.println("PickupLat = " + rideRequest.getPickupLat());
        Ride savedRide = rideRepository.save(ride);
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

        double radius = 2.0;

        List<Long> nearbyDriverIds = redisLocationService.fetchNearestDrivers(unassignedRide.getPickupLat(),
                unassignedRide.getPickupLong(),
                radius, 10);

        while (nearbyDriverIds.isEmpty() && radius < 9) {
            radius += 2;
            nearbyDriverIds = redisLocationService.fetchNearestDrivers(unassignedRide.getPickupLat(),
                    unassignedRide.getPickupLong(),
                    radius, 10);
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

        redisLocationService.storeEligibleDrivers(rideId, eligibleDriverIds);
        System.out.println("Eligible drivers = " + eligibleDriverIds);
        if (eligibleDriverIds.isEmpty()) {
            throw new RuntimeException("No eligible drivers available.");
        }

        RideEvent event = new RideEvent();
        event.setRideId(unassignedRide.getId());
        event.setCustomerId(unassignedRide.getCustomerId());
        event.setEligibleDrivers(eligibleDriverIds);
        event.setTimestamp(System.currentTimeMillis());
        event.setEventType("RIDE_REQUESTED");

        rideEventPublisher.publish(KafkaTopics.RIDE_EVENTS, event);

        System.out.println("Ride " + rideId + " published to " + eligibleDriverIds.size() + " drivers");
        for (Long driver : eligibleDriverIds) {
            System.out.println(driver);
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

        System.out.println("ACCEPT ATTEMPT: ride=" + rideId + " driver=" + driverId);

        Ride ride = rideRepository.findWithLockById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found."));

        System.out.println("CURRENT RIDE STATUS: " + ride.getRideStatus());

        List<Long> eligibleDrivers = redisLocationService.getEligibleDrivers(rideId);

        System.out.println("ELIGIBLE DRIVERS: " + eligibleDrivers);

        if (!eligibleDrivers.contains(driverId)) {
            throw new RuntimeException("Driver not eligible for this ride.");
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
        ride.setAcceptedAt(LocalDateTime.now());
        driver.setDriverStatus(DriverStatus.ON_RIDE);
        driverRepository.save(driver);

        System.out.println("RIDE ACCEPTED: ride=" + rideId + " driver=" + driverId);

        redisLocationService.clearEligibleDrivers(rideId);

        rideRepository.save(ride);

        RideEvent event = new RideEvent();
        event.setRideId(ride.getId());
        event.setCustomerId(ride.getCustomerId());
        event.setDriverId(ride.getDriverId());
        event.setTimestamp(System.currentTimeMillis());
        event.setEventType("RIDE_ACCEPTED");

        rideEventPublisher.publish(KafkaTopics.RIDE_EVENTS, event);

        return ride;
    }

    @Transactional
    public Ride rejectRide(Long rideId, Long driverId) {
        Ride ride = rideRepository.findWithLockById(rideId)
                .orElseThrow(() -> new RuntimeException("Ride not found."));

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
            publishRide(rideId);
        }

        redisLocationService.clearEligibleDriver(rideId, driverId);
        rideRepository.save(ride);
        driverRepository.save(driver);

        RideEvent event = new RideEvent();
        event.setRideId(ride.getId());
        event.setCustomerId(ride.getCustomerId());
        event.setDriverId(ride.getDriverId());
        event.setTimestamp(System.currentTimeMillis());
        event.setEventType("RIDE_REJECTED");

        rideEventPublisher.publish(KafkaTopics.RIDE_EVENTS, event);

        return ride;
    }

    @Transactional
    public Ride completeRide(Long rideId) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride not found."));
        ride.setRideStatus(RideStatus.COMPLETED);
        Driver driver = driverRepository.findById(ride.getDriverId())
                .orElseThrow(() -> new RuntimeException("Driver wasn't found."));
        driver.setDriverStatus(DriverStatus.ONLINE);
        driverRepository.save(driver);
        rideRepository.save(ride);

        RideEvent event = new RideEvent();
        event.setRideId(ride.getId());
        event.setCustomerId(ride.getCustomerId());
        event.setDriverId(ride.getDriverId());
        event.setTimestamp(System.currentTimeMillis());
        event.setEventType("RIDE_COMPLETED");

        rideEventPublisher.publish(KafkaTopics.RIDE_EVENTS, event);

        return ride;
    }

    @Transactional
    public Ride startRide(Long rideId, Long driverId) {
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
        driverRepository.save(driver);
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

        return rideRepository.save(ride);
    }

    @Transactional
    public Ride cancelRide(Long rideId) {
        Ride ride = rideRepository.findById(rideId).orElseThrow(() -> new RuntimeException("Ride was not found."));

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
        redisLocationService.clearEligibleDrivers(rideId);
        return rideRepository.save(ride);
    }
}