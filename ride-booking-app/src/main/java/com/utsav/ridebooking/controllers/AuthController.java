package com.utsav.ridebooking.controllers;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.utsav.ridebooking.DTO.LoginRequest;
import com.utsav.ridebooking.DTO.LoginResponse;
import com.utsav.ridebooking.DTO.RegisterRequest;
import com.utsav.ridebooking.DTO.RegisterResponse;
import com.utsav.ridebooking.services.AuthService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<RegisterResponse> registerUser(@RequestBody RegisterRequest registerRequest) {
        RegisterResponse response = authService.registerUser(registerRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> loginUser(@RequestBody LoginRequest loginRequest) {
        LoginResponse response = authService.loginUser(loginRequest);
        return ResponseEntity.ok(response);
    }
}