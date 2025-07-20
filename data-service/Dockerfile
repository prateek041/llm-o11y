# Stage 1: Build Environment - Install uv and project dependencies
# Using a slim Python image as the base for a smaller footprint.
FROM python:3.12-slim AS builder

# Set the working directory inside the container for all subsequent commands in this stage.
WORKDIR /app

# Install uv by copying its pre-built binary from the official uv Docker image.
# This is an efficient way to get uv without needing to install extra system packages
# like 'curl' or 'apt-get' in this stage, which keeps the image cleaner and smaller.
# For production, it's highly recommended to pin to a specific uv version (e.g., ghcr.io/astral-sh/uv:0.1.30)
# instead of ':latest' for reproducible builds.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Enable bytecode compilation during uv operations. This helps improve the startup time
# of your Python application in the final production image.
ENV UV_COMPILE_BYTECODE=1

# Copy only the project definition files (pyproject.toml and uv.lock) first.
# This is a crucial step for Docker's build cache. If these files don't change,
# Docker can reuse the cached layer for dependency installation, significantly
# speeding up subsequent builds when only your application code changes.
COPY pyproject.toml uv.lock ./

# Install project dependencies as defined in uv.lock.
# --mount=type=cache,target=/root/.cache/uv: This leverages Docker's build cache
# for uv's internal cache, further improving the speed of dependency resolution
# across different Docker builds.
# --locked: Ensures that uv installs the exact package versions specified in your uv.lock file,
# guaranteeing reproducible builds.
# --no-install-project: This flag tells uv to install only the dependencies listed
# in your project, but not the project itself (if it's a package).
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project

# IMPORTANT FIX: Explicitly install FastAPI and Uvicorn.
# Even if they are in your pyproject.toml, sometimes uv sync --no-install-project
# might not include them in a way that makes them discoverable by 'python -m'.
# This step ensures they are present in the virtual environment.
# "uvicorn[standard]" includes optional dependencies like httptools and websockets for better performance.
RUN uv pip install fastapi "uvicorn[standard]"

# Stage 2: Runtime Environment - Create the final, lean image for deployment
# Start from a fresh, minimal Python image again. This ensures that the final
# production image only contains what's absolutely necessary to run your application,
# without any build tools or unnecessary files from the 'builder' stage.
FROM python:3.12-slim

# Set the working directory for the application in the final image.
WORKDIR /app

# Copy the installed virtual environment from the 'builder' stage into the final image.
# This environment contains all your project's dependencies, pre-compiled and ready to run.
# For enhanced security in production, you might consider creating a dedicated non-root user
# (e.g., `RUN adduser --system --no-create-home app && chown -R app:app /app`)
# and then switching to that user (`USER app`). For simplicity here, we'll use root.
COPY --from=builder /app/.venv /app/.venv

# Copy all your application source code into the final image.
# Make sure to use a .dockerignore file (see below) to exclude local development
# artifacts and unnecessary files, keeping your image size small.
COPY . .

# Add the virtual environment's 'bin' directory to the system's PATH.
# This makes Python executables and any scripts installed by uv (like 'uvicorn')
# directly accessible from the command line within the container.
ENV PATH="/app/.venv/bin:$PATH"

# Expose the port on which your FastAPI application will listen.
# FastAPI typically runs on port 8000 by default. This informs Docker that the
# container listens on this port at runtime.
EXPOSE 8000

# Set the default command to run your FastAPI application using Uvicorn.
# Using `python -m uvicorn` is more robust as it invokes uvicorn as a Python module.
# `main:app` refers to the 'app' FastAPI instance defined in your 'main.py' file.
# `--host 0.0.0.0` is essential to make the application accessible from outside the container.
# `--port 8000` specifies the listening port.
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

