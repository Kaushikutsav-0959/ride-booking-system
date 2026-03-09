package com.utsav.ridebooking.DTO;

public class DriverLocationResponse {

    private Long driverId;
    private Double latitude;
    private Double longitude;

    public DriverLocationResponse(Long driverId, Double latitude, Double longitude) {
        this.driverId = driverId;
        this.latitude = latitude;
        this.longitude = longitude;
    }

    public Long getDriverId() {
        return driverId;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }
}
