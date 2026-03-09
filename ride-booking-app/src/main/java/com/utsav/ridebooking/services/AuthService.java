package com.utsav.ridebooking.services;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;

import com.utsav.ridebooking.DTO.LoginRequest;
import com.utsav.ridebooking.DTO.LoginResponse;
import com.utsav.ridebooking.DTO.RegisterRequest;
import com.utsav.ridebooking.DTO.RegisterResponse;
import com.utsav.ridebooking.Security.JwtSecurity;
import com.utsav.ridebooking.models.Driver;
import com.utsav.ridebooking.models.DriverStatus;
import com.utsav.ridebooking.repository.DriverRepository;
import com.utsav.ridebooking.models.User;
import com.utsav.ridebooking.models.UserRole;
import com.utsav.ridebooking.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class AuthService {

    private final DriverRepository driverRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final JwtSecurity jwtSecurity;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtSecurity jwtSecurity,
            DriverRepository driverRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtSecurity = jwtSecurity;
        this.driverRepository = driverRepository;
    }

    @Transactional
    public RegisterResponse registerUser(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already registered.");
        }

        if (request.getRole() == null) {
            throw new RuntimeException("Role is required.");
        }

        String hashedPassword = passwordEncoder.encode(request.getPassword());

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(hashedPassword);
        user.setRole(request.getRole());

        User savedUser = userRepository.save(user);
        RegisterResponse response = new RegisterResponse();
        response.setName(savedUser.getName());
        response.setUserId(savedUser.getUserId());
        response.setEmail(savedUser.getEmail());
        response.setRole(savedUser.getRole());

        if (savedUser.getRole() == UserRole.DRIVER) {
            Driver driver = new Driver();
            driver.setDriverId(savedUser.getUserId());
            driver.setName(savedUser.getName());
            driver.setDriverStatus(DriverStatus.OFFLINE);
            driver.setEmail(savedUser.getEmail());
            driver.setPasswordHash(hashedPassword);
            driverRepository.save(driver);
        }

        return response;
    }

    @Transactional
    public LoginResponse loginUser(LoginRequest request) {
        Optional<User> optionalUser = userRepository.findByEmail(request.getEmail());
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("User does not exist. Please register.");
        }

        User user = optionalUser.get();
        Boolean verified = passwordEncoder.matches(request.getPassword(), user.getPasswordHash());

        if (!verified) {
            throw new RuntimeException("Invalid credentials.");
        }

        LoginResponse response = new LoginResponse();
        String token = jwtSecurity.generateToken(user);

        response.setUserId(user.getUserId());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setAccessToken(token);

        if (user.getRole() == UserRole.DRIVER) {
            Driver driver = driverRepository.findByEmail(user.getEmail())
                    .orElseThrow(() -> new RuntimeException("No driver found."));
            if (driver != null) {
                response.setDriverId(driver.getDriverId());
            }
        }
        return response;
    }
}