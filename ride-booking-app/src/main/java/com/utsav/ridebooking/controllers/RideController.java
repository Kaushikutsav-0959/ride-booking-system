package com.utsav.ridebooking.controllers;

import com.utsav.ridebooking.DTO.RideRequest;
import com.utsav.ridebooking.models.Ride;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.RideStatus;
import com.utsav.ridebooking.services.RideService;

import com.utsav.ridebooking.repository.DriverRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.List;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/rides")
public class RideController {
    private final RideService rideService;
    private final DriverRepository driverRepository;

    public RideController(RideService rideService, DriverRepository driverRepository) {
        this.rideService = rideService;
        this.driverRepository = driverRepository;
    }

    @PostMapping("/request")
    public ResponseEntity<Ride> rideRequested(@RequestBody RideRequest request, @AuthenticationPrincipal String email) {
        Ride createdRide = rideService.createRide(request, email);
        return ResponseEntity.ok(createdRide);
    }

    @GetMapping("/driver/{driverId}/active")
    public ResponseEntity<Ride> getActiveRideForDriver(@PathVariable Long driverId) {
        Optional<Ride> ride = rideService.getActiveRideForDriver(driverId);
        return ride.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Ride>> getRidesForCustomer(@PathVariable Long customerId) {
        List<Ride> rides = rideService.getRidesForCustomers(customerId);
        return ResponseEntity.ok(rides);
    }

    @PutMapping("/{rideId}/status")
    public ResponseEntity<Ride> updateRideStatus(@PathVariable Long rideId, @RequestParam RideStatus status) {
        Ride updatedRide = rideService.updateRideStatus(rideId, status);
        return ResponseEntity.ok(updatedRide);
    }

    @PostMapping("/{rideId}/accept")
    public ResponseEntity<Ride> acceptRide(
            @PathVariable Long rideId,
            @AuthenticationPrincipal String email) {
        Driver driver = driverRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Driver not found."));
        Ride ride = rideService.acceptRide(rideId, driver.getDriverId());
        return ResponseEntity.ok(ride);
    }

    @PostMapping("/{rideId}/publish")
    public ResponseEntity<String> publishRide(@PathVariable Long rideId) {
        rideService.publishRide(rideId);
        return ResponseEntity.ok("Ride published successfully.");
    }

    @PostMapping("/{rideId}/cancel")
    public ResponseEntity<Ride> rideCancel(@PathVariable Long rideId) {
        Ride ride = rideService.cancelRide(rideId);
        return ResponseEntity.ok(ride);
    }

    @GetMapping("/secure-test")
    public String secureTest() {
        return "JWT working.";
    }
}