package com.utsav.ridebooking.controllers;

import com.utsav.ridebooking.DTO.RideRequest;
import com.utsav.ridebooking.models.Ride;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.RideStatus;
import com.utsav.ridebooking.services.RideService;

import com.utsav.ridebooking.repository.DriverRepository;
import com.utsav.ridebooking.repository.RideRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/rides")
public class RideController {
    private final RideRepository rideRepository;
    private final RideService rideService;
    private final DriverRepository driverRepository;

    public RideController(RideService rideService, DriverRepository driverRepository, RideRepository rideRepository) {
        this.rideService = rideService;
        this.driverRepository = driverRepository;
        this.rideRepository = rideRepository;
    }

    @PostMapping("/request")
    public ResponseEntity<Ride> rideRequested(@RequestBody RideRequest request, @AuthenticationPrincipal String email) {
        Ride createdRide = rideService.createRide(request, email);
        return ResponseEntity.ok(createdRide);
    }

    @GetMapping("/driver/active")
    public ResponseEntity<Ride> getActiveRideForDriver(@AuthenticationPrincipal String email) {

        System.out.println("EMAIL FROM TOKEN: " + email);

        Driver driver = driverRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        List<Ride> rides = rideService.getActiveRideForDriver(driver.getDriverId());

        if (rides.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        return ResponseEntity.ok(rides.get(0));
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

    @GetMapping("/{rideId}")
    public ResponseEntity<Ride> GetRideStatus(@PathVariable Long rideId) {
        Ride ride = rideService.getRideById(rideId);
        return ResponseEntity.ok(ride);
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

    @GetMapping("/secure-test")
    public String secureTest() {
        return "JWT working.";
    }

    @GetMapping("/admin/stats")
    public Map<String, Object> getRideStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total", rideRepository.count());
        stats.put("requested", rideRepository.countByRideStatus(RideStatus.REQUESTED));
        stats.put("assigned", rideRepository.countByRideStatus(RideStatus.ASSIGNED));
        stats.put("completed", rideRepository.countByRideStatus(RideStatus.COMPLETED));
        stats.put("failed", rideRepository.countByRideStatus(RideStatus.FAILED));
        stats.put("inProgress", rideRepository.countByRideStatus(RideStatus.IN_PROGRESS));
        stats.put("cancelled", rideRepository.countByRideStatus(RideStatus.CANCELLED));
        stats.put("rejected", rideRepository.countByRideStatus(RideStatus.REJECTED));
        return stats;
    }

    @PostMapping("/{rideId}/start")
    public ResponseEntity<Ride> startRide(@PathVariable Long rideId, @RequestParam Long driverId) {
        return ResponseEntity.ok(rideService.startRide(rideId, driverId));
    }

    @PostMapping("/{rideId}/complete")
    public ResponseEntity<Ride> completeRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(rideService.completeRide(rideId));
    }

    @PostMapping("/{rideId}/fail")
    public ResponseEntity<Ride> failRide(@PathVariable Long rideId) {
        return ResponseEntity.ok(rideService.failRide(rideId));
    }

    @GetMapping
    public ResponseEntity<List<Ride>> getAllRides() {
        List<Ride> rides = rideRepository.findAll();
        return ResponseEntity.ok(rides);
    }

    @PostMapping("/{rideId}/reject")
    public ResponseEntity<Ride> rejectRide(@PathVariable Long rideId, @AuthenticationPrincipal String email) {
        Driver driver = driverRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Driver not found."));

        Ride ride = rideService.rejectRide(rideId, driver.getDriverId());
        return ResponseEntity.ok(ride);
    }

    @PostMapping("/{rideId}/retry")
    public ResponseEntity<Ride> retryRide(@PathVariable Long rideId) {
        Ride ride = rideService.retryRide(rideId);
        return ResponseEntity.ok(ride);
    }

    @PostMapping("/{rideId}/cancel")
    public ResponseEntity<Ride> cancelRide(@PathVariable Long rideId) {
        Ride ride = rideService.cancelRide(rideId);
        return ResponseEntity.ok(ride);
    }

    @GetMapping("/customer/active")
    public ResponseEntity<Ride> getActiveRideForCustomer(@AuthenticationPrincipal String email) {
        System.out.println("CUSTOMER EMAIL FROM TOKEN: " + email);
        List<Ride> rides = rideService.getActiveRideForCustomerByEmail(email);
        if (rides.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(rides.get(0));
    }

    @GetMapping("/driver/{driverId}/available")
    public ResponseEntity<List<Ride>> getAvailableRides(@PathVariable Long driverId) {
        return ResponseEntity.ok(rideService.getAvailableRidesForDriver(driverId));
    }
}