package com.utsav.ridebooking.DTO;

import com.utsav.ridebooking.models.UserRole;

public class RegisterRequest {

    private String name;
    private String email;
    private String password;
    private UserRole role;

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public UserRole getRole() {
        return role;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public RegisterRequest() {
    }
}