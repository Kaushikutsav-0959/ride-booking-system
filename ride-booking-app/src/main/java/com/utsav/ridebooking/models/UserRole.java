package com.utsav.ridebooking.models;

public enum UserRole {
    PASSENGER, DRIVER, ADMIN;

    public String getAuthority() {
        return "ROLE_" + this.name();
    }
}