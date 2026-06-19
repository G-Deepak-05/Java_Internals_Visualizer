FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build
COPY pom.xml .
COPY src ./src

RUN mvn -q package -DskipTests

# ── Runtime image ─────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S jiv && adduser -S jiv -G jiv
WORKDIR /app

COPY --from=builder /build/target/*.jar app.jar

USER jiv
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
