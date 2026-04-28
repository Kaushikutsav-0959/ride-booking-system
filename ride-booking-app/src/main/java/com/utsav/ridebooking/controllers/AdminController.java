package com.utsav.ridebooking.controllers;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.utsav.ridebooking.services.AdminService;

@RestController
@RequestMapping("/admin/system")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @PostMapping("/reset")
    public ResponseEntity<?> resetSystem() {
        adminService.resetSystem();
        return ResponseEntity.ok("System reset complete");
    }

    @PostMapping("/simulator/start")
    public ResponseEntity<?> startSimulator() {
        adminService.startSimulator();
        return ResponseEntity.ok("Simulator started");
    }
}