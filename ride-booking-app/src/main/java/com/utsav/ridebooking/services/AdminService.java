package com.utsav.ridebooking.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import com.utsav.ridebooking.repository.DriverRepository;
import com.utsav.ridebooking.repository.OutboxRepository;
import com.utsav.ridebooking.repository.RideRepository;
import com.utsav.ridebooking.repository.UserRepository;

import jakarta.transaction.Transactional;

@Service
public class AdminService {

    @Autowired
    private RideRepository rideRepository;
    @Autowired
    private DriverRepository driverRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private OutboxRepository outboxRepository;
    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Transactional
    public void resetSystem() {

        rideRepository.deleteAll();
        outboxRepository.deleteAll();
        driverRepository.deleteAll();
        userRepository.deleteAllExcept("kaushikutsav8851@gmail.com");
        redisTemplate.execute((org.springframework.data.redis.core.RedisCallback<Object>) connection -> {
            connection.serverCommands().flushAll();
            return null;
        });

        System.out.println("SYSTEM RESET COMPLETE");
    }

    public void startSimulator() {
        try {
            ProcessBuilder pb = new ProcessBuilder("python3", "system_simulator.py");

            // Ensure correct working directory (project root)
            pb.directory(new java.io.File(System.getProperty("user.dir")));

            pb.redirectErrorStream(true);

            Process process = pb.start();

            // Log output from simulator
            new Thread(() -> {
                try (java.io.BufferedReader reader = new java.io.BufferedReader(
                        new java.io.InputStreamReader(process.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        System.out.println("[SIM] " + line);
                    }
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }).start();

            System.out.println("SIMULATOR PROCESS STARTED");

        } catch (Exception e) {
            System.err.println("FAILED TO START SIMULATOR");
            e.printStackTrace();
        }
    }
}