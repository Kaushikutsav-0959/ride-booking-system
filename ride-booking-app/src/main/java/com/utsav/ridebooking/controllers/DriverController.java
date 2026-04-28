package com.utsav.ridebooking.controllers;

import com.utsav.ridebooking.DTO.DriverLocationUpdateRequest;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.DriverStatus;
import com.utsav.ridebooking.services.DriverService;
import com.utsav.ridebooking.repository.DriverRepository;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/drivers")
public class DriverController {
    private final DriverRepository driverRepository;
    private final DriverService driverService;

    public DriverController(DriverService driverService, DriverRepository driverRepository) {
        this.driverService = driverService;
        this.driverRepository = driverRepository;
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
    public ResponseEntity<Driver> updateDriverLocation(@RequestBody DriverLocationUpdateRequest request) {
        driverService.updateDriverLocation(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/nearby")
    public ResponseEntity<?> findNearbyDrivers(
            @RequestParam double lat, @RequestParam double lng) {
        return ResponseEntity.ok(driverService.findNearbyDrivers(lat, lng));
    }

    @GetMapping("/admin/stats")
    public Map<String, Object> getDriverStats() {
        Map<String, Object> stats = new HashMap<>();

        stats.put("total", driverRepository.count());
        stats.put("online", driverRepository.countByStatus(DriverStatus.ONLINE));
        stats.put("offline", driverRepository.countByStatus(DriverStatus.OFFLINE));
        stats.put("on_ride", driverRepository.countByStatus(DriverStatus.ON_RIDE));

        return stats;
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<?> refreshHeartbeat() {
        driverService.refreshHeartbeat();
        return ResponseEntity.ok().build();
    }

    @GetMapping("/admin/locations")
    public ResponseEntity<?> getAllDriverLocations() {
        return ResponseEntity.ok(driverService.getAllDriverLocations());
    }

    @GetMapping("/admin/heartbeats")
    public ResponseEntity<?> getAllDriverHeartbeats() {
        return ResponseEntity.ok(driverService.getAllDriverHeartbeats());
    }
}