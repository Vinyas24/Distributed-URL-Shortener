# ── Stage 1: dependency cache ───────────────────────────────────────────────
# Download all Maven dependencies before copying the source so that Docker can
# cache this layer independently of the application code.
FROM maven:3.9-eclipse-temurin-21 AS deps

WORKDIR /build

# Copy only the POM first; source is not needed to resolve dependencies.
COPY pom.xml .
RUN mvn -q dependency:go-offline -B

# ── Stage 2: build ───────────────────────────────────────────────────────────
FROM deps AS build

# Copy the full source tree and build the fat JAR, skipping tests (they run in
# CI against real containers, not inside the image build).
COPY src ./src
RUN mvn -q -DskipTests package -B

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre AS runtime

# Create a dedicated non-root user; never run as root in production.
RUN groupadd --system appgroup && \
    useradd  --system --gid appgroup --no-create-home --shell /sbin/nologin appuser

WORKDIR /app

# Copy the fat JAR built in the previous stage.
COPY --from=build /build/target/url-shortener-*.jar app.jar

# Adjust ownership so the non-root user can read the JAR.
RUN chown appuser:appgroup app.jar

USER appuser

EXPOSE 8080

# Liveness probe: hit the Actuator health endpoint.  The shell-form HEALTHCHECK
# is used so that curl is not required; wget is present in temurin images.
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD wget -qO- http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:+UseG1GC", \
    "-XX:+ExitOnOutOfMemoryError", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-jar", "app.jar"]
