package com.utsav.ridebooking.services;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.utsav.ridebooking.DTO.DriverLocationResponse;

import com.utsav.ridebooking.DTO.DriverLocationUpdateRequest;
import com.utsav.ridebooking.cache.RedisLocationService;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.DriverStatus;
import com.utsav.ridebooking.repository.DriverRepository;

import jakarta.transaction.Transactional;

@Service
public class DriverService {

    private final DriverRepository driverRepository;

    private final RedisLocationService redisLocationService;

    public DriverService(DriverRepository driverRepository, RedisLocationService redisLocationService) {
        this.driverRepository = driverRepository;
        this.redisLocationService = redisLocationService;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly = false)
    public Driver setDriverStatus(Long driverId, DriverStatus status) {
        Driver driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found."));

        driver.setDriverStatus(status);
        return driverRepository.save(driver);
    }

    public List<Driver> getAvailableDrivers() {
        return driverRepository.findByStatus(DriverStatus.ONLINE);
    }

    public Driver getDriverById(Long driverId) {
        return driverRepository.findById(driverId).orElseThrow(() -> new RuntimeException("Driver not found."));
    }

    @Transactional
    public void updateDriverLocation(DriverLocationUpdateRequest request) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = (String) authentication.getPrincipal();
        Driver driver = driverRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Driver not found."));

        System.out.println("REQ LAT: " + request.getLatitude());
        System.out.println("REQ LNG: " + request.getLongitude());

        driver.setCurrentLat(request.getLatitude());
        driver.setCurrentLong(request.getLongitude());
        driver.setUpdatedAt(LocalDateTime.now());

        driverRepository.save(driver);

        redisLocationService.saveDriverLocation(
                driver.getDriverId(),
                driver.getCurrentLat(),
                driver.getCurrentLong());
    }

    public List<DriverLocationResponse> findNearbyDrivers(double lat, double lng) {
        double radiusKm = 5.0;
        int limit = 20;

        List<Long> driverIds = redisLocationService.fetchNearestDrivers(lat, lng, radiusKm, limit);
        List<Driver> drivers = driverRepository.findAllById(driverIds);

        return drivers.stream()
                .map(driver -> new DriverLocationResponse(
                        driver.getDriverId(),
                        driver.getCurrentLat(),
                        driver.getCurrentLong()))
                .toList();
    }
}