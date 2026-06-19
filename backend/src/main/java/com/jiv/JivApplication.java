package com.jiv;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class JivApplication {
    public static void main(String[] args) {
        SpringApplication.run(JivApplication.class, args);
    }
}
