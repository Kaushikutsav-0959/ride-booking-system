package com.utsav.ridebooking.services;

import java.time.LocalDateTime;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.utsav.ridebooking.models.OutboxEvent;
import com.utsav.ridebooking.repository.OutboxRepository;
import java.util.HashMap;
import java.util.Map;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.utsav.ridebooking.DTO.DriverLocationResponse;

import com.utsav.ridebooking.DTO.DriverLocationUpdateRequest;
import com.utsav.ridebooking.cache.RedisLocationService;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.DriverStatus;
import com.utsav.ridebooking.repository.DriverRepository;

import jakarta.transaction.Transactional;

@Service
public class DriverService {

    private static final Logger log = LoggerFactory.getLogger(DriverService.class);

    private final DriverRepository driverRepository;
    private final RedisLocationService redisLocationService;
    private final OutboxRepository outboxRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public DriverService(
            DriverRepository driverRepository,
            RedisLocationService redisLocationService,
            OutboxRepository outboxRepository) {
        this.driverRepository = driverRepository;
        this.redisLocationService = redisLocationService;
        this.outboxRepository = outboxRepository;
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

        log.debug("Driver location update request lat={} lng={}", request.getLatitude(), request.getLongitude());

        driver.setCurrentLat(request.getLatitude());
        driver.setCurrentLong(request.getLongitude());
        driver.setUpdatedAt(LocalDateTime.now());

        driverRepository.save(driver);

        redisLocationService.saveDriverLocation(
                driver.getDriverId(),
                driver.getCurrentLat(),
                driver.getCurrentLong());

        Map<String, Object> payload = new HashMap<>();
        payload.put("driverId", driver.getDriverId());
        payload.put("lat", driver.getCurrentLat());
        payload.put("lng", driver.getCurrentLong());

        OutboxEvent outbox = new OutboxEvent();
        outbox.setAggregateType("DRIVER");
        outbox.setAggregateId(driver.getDriverId());
        outbox.setEventType("DRIVER_LOCATION_UPDATED");

        try {
            outbox.setPayload(objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize driver location event", e);
        }

        outbox.setCreatedAt(LocalDateTime.now());
        outboxRepository.save(outbox);
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