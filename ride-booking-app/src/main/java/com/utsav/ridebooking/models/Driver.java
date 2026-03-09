package com.utsav.ridebooking.models;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "drivers")
public class Driver {

    @Id
    private Long driverId;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DriverStatus status;

    @Column
    private Double currentLat;

    @Column
    private Double currentLong;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();

    public Driver() {
    }

    public Driver(String name, String email, String passwordHash) {
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.status = DriverStatus.OFFLINE;
    }

    public Long getDriverId() {
        return driverId;
    }

    public String getName() {
        return name;
    }

    public void setDriverId(Long driverId) {
        this.driverId = driverId;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public DriverStatus getDriverStatus() {
        return status;
    }

    public void setDriverStatus(DriverStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public Double getCurrentLat() {
        return currentLat;
    }

    public void setCurrentLat(Double currentLat) {
        this.currentLat = currentLat;
    }

    public Double getCurrentLong() {
        return currentLong;
    }

    public void setCurrentLong(Double currentLong) {
        this.currentLong = currentLong;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
