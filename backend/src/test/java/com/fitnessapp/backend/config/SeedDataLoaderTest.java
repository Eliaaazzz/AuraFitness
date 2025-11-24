package com.fitnessapp.backend.config;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitnessapp.backend.repository.IngredientRepository;
import com.fitnessapp.backend.repository.RecipeRepository;
import com.fitnessapp.backend.repository.WorkoutVideoRepository;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "app.seed.enabled=true"
})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class SeedDataLoaderTest {

    @Autowired
    private WorkoutVideoRepository workoutVideoRepository;

    @Autowired
    private RecipeRepository recipeRepository;

    @Autowired
    private IngredientRepository ingredientRepository;

    private static PostgreSQLContainer<?> postgres;

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        ensurePostgres();
        Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Postgres container not available; skipping seed data test");
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", postgres::getDriverClassName);
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @BeforeAll
    static void requireDocker() {
        ensurePostgres();
        Assumptions.assumeTrue(postgres != null && postgres.isRunning(), "Postgres container not available; skipping seed data test");
    }

    private static void ensurePostgres() {
        if (postgres != null && postgres.isRunning()) {
            return;
        }
        boolean dockerAvailable;
        try {
            Class<?> factory = Class.forName("org.testcontainers.DockerClientFactory");
            Object instance = factory.getMethod("instance").invoke(null);
            dockerAvailable = (boolean) factory.getMethod("isDockerAvailable").invoke(instance);
        } catch (Throwable ignored) {
            dockerAvailable = false;
        }
        if (!dockerAvailable) {
            postgres = null;
            return;
        }
        PostgreSQLContainer<?> container = new PostgreSQLContainer<>("postgres:16-alpine");
        try {
            container.start();
            postgres = container;
        } catch (Throwable ex) {
            container.close();
            postgres = null;
        }
    }

    @Test
    void seedsWorkoutsAndRecipes() {
        assertThat(workoutVideoRepository.count()).isGreaterThanOrEqualTo(120);
        assertThat(recipeRepository.countActual()).isGreaterThanOrEqualTo(60);
        assertThat(ingredientRepository.count()).isGreaterThanOrEqualTo(6);
    }
}
