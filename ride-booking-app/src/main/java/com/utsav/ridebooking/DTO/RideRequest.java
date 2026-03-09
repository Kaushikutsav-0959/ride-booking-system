package com.utsav.ridebooking.DTO;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotNull;

public class RideRequest {
    @NotNull
    private Double pickupLat;
    @NotNull
    private Double pickupLong;
    @NotNull
    private Double dropLat;
    @NotNull
    private Double dropLong;
    private LocalDateTime acceptedAt;
    private LocalDateTime updatedAt;

    public RideRequest() {
    }

    public Double getPickupLat() {
        return pickupLat;
    }

    public void setPickupLat(Double pickUpLat) {
        this.pickupLat = pickUpLat;
    }

    public Double getPickupLong() {
        return pickupLong;
    }

    public void setPickupLong(Double pickUpLong) {
        this.pickupLong = pickUpLong;
    }

    public Double getDropLat() {
        return dropLat;
    }

    public void setDropLat(Double dropLat) {
        this.dropLat = dropLat;
    }

    public Double getDropLong() {
        return dropLong;
    }

    public void setDropLong(Double dropLong) {
        this.dropLong = dropLong;
    }

    public LocalDateTime getAcceptedAt() {
        return acceptedAt;
    }

    public void setAcceptedAt(LocalDateTime acceptedAt) {
        this.acceptedAt = acceptedAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}