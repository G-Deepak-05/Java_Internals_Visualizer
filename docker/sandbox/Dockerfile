FROM eclipse-temurin:21-jre-alpine

# Create non-root user for security
RUN addgroup -S jiv && adduser -S jiv -G jiv

# Execution directory
WORKDIR /sandbox

# Copy user code (mounted at runtime)
# /code — user's compiled classes (read-only volume)
# /agent — JIV agent JAR (read-only volume)

USER jiv

# Default command: run user program with JIV agent
# Overridden by docker run command with actual class name
CMD ["java", "-javaagent:/agent/jiv-agent.jar", "-cp", "/code", "Main"]
