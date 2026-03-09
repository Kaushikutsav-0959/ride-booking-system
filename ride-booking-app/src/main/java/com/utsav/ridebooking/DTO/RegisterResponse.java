package com.utsav.ridebooking.DTO;

import com.utsav.ridebooking.models.UserRole;

public class RegisterResponse {
    private String name;
    private Long userId;
    private String email;
    private UserRole role;

    public RegisterResponse() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }
}