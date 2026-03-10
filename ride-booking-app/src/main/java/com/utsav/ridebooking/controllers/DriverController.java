package com.utsav.ridebooking.controllers;

import com.utsav.ridebooking.DTO.DriverLocationUpdateRequest;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.DriverStatus;
import com.utsav.ridebooking.services.RideService;
import com.utsav.ridebooking.services.DriverService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/drivers")
public class DriverController {
    private final DriverService driverService;

    public DriverController(DriverService driverService, RideService rideService) {
        this.driverService = driverService;
    }

    @PostMapping("/{driverId}/status")
    public ResponseEntity<Driver> updateStatus(
            @PathVariable Long driverId,
            @RequestParam DriverStatus status) {
        return ResponseEntity.ok(driverService.setDriverStatus(driverId, status));
    }

    @GetMapping("/available")
    public ResponseEntity<List<Driver>> getAvailableDrivers() {
        return ResponseEntity.ok(driverService.getAvailableDrivers());
    }

    @PatchMapping("/location")
    public ResponseEntity<Void> updateDriverLocation(@RequestBody DriverLocationUpdateRequest request) {
        driverService.updateDriverLocation(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/nearby")
    public ResponseEntity<?> getNearbyDrivers(
            @RequestParam double lat, @RequestParam("long") double lng) {
        return ResponseEntity.ok(driverService.findNearbyDrivers(lat, lng));
    }
}