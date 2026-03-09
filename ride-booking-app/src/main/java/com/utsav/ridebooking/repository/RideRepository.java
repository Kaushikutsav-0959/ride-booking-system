package com.utsav.ridebooking.repository;

import com.utsav.ridebooking.models.Ride;
import com.utsav.ridebooking.models.RideStatus;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface RideRepository extends JpaRepository<Ride, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Ride> findWithLockById(Long Id);

    List<Ride> findByCustomerId(Long customerId);

    Optional<Ride> findByDriverIdAndStatusIn(Long driverId, Collection<RideStatus> statuses);

    List<Ride> findByStatus(RideStatus status);
}