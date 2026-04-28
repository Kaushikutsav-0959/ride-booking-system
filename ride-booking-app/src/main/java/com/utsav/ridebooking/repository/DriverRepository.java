package com.utsav.ridebooking.repository;

import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.DriverStatus;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.List;
import java.util.Optional;

public interface DriverRepository extends JpaRepository<Driver, Long> {

    Optional<Driver> findByEmail(String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Driver> findWithLockByDriverId(Long driverId);

    List<Driver> findByStatus(DriverStatus status);

    long countByStatus(DriverStatus status);
}