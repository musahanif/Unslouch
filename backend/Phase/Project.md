Unslouch — AI-Assisted Posture Monitoring System

Agent Execution Plan

1. Project Objective

Develop Unslouch, a wearable posture-monitoring system that collects motion data from an MPU-6050 sensor connected to an ESP32, provides real-time posture feedback through a web application, stores sensor data reliably, and analyzes completed sessions using machine learning.

The implementation must extend the existing project instead of replacing it.

2. Existing Technology Stack

Frontend: Next.js, React, TypeScript

Backend: Node.js, Express, TypeScript

Database: PostgreSQL

ORM: Prisma 7

Hardware: ESP32 + MPU-6050

Real-time communication: WebSocket

AI service: Python + FastAPI

Machine learning: Start with scikit-learn when sufficient labeled data is available

The agent must inspect the actual repository and verify the installed packages, folder structure, Prisma configuration, authentication implementation, and existing database models before making changes. Do not assume this plan perfectly matches the current codebase.

3. Target Architecture

The system should separate live feedback, data persistence, and AI analysis.

The MPU-6050 measures acceleration and angular velocity.

The ESP32 processes sensor readings and performs initial posture detection.

The ESP32 sends live posture updates through WebSocket and uploads raw readings through HTTP batches.

Express authenticates requests, validates data, manages sessions, and coordinates processing.

PostgreSQL stores device records, sessions, raw sensor batches, sensor samples, and analysis results.

A background worker processes completed sessions and invokes the AI inference service.

The Next.js frontend displays live posture status, session history, and completed analysis results.

The ESP32 must be able to queue readings while offline and upload them after reconnection.

Training and inference must remain separate. Training develops or updates a model using labeled data; inference uses an already-trained model to analyze new sessions.

4. Phase 0 — Repository Inspection and Technical Audit

Tasks

Inspect the frontend and backend directory structures.

Identify existing authentication and authorization mechanisms.

Inspect the Prisma schema, generated client configuration, database adapter, and migrations.

Locate existing device, user, calibration, and session models.

Identify existing API routes and WebSocket infrastructure, if any.

Review environment-variable names without exposing secret values.

Check available tests, scripts, linting, formatting, and build commands.

Identify missing requirements and conflicts between this plan and the current implementation.

Deliverables

A concise summary of the existing architecture.

A list of files that need to be created or modified.

A proposed implementation sequence.

A list of blockers and decisions requiring developer input.

Acceptance criteria

Existing functionality and project conventions are understood.

No unnecessary dependencies or duplicate models have been introduced.

The implementation plan is adapted to the actual repository.

Do not rewrite the existing application or replace working authentication without a demonstrated need.

5. Phase 1 — Database and Telemetry API

Tasks

Implement or adapt the database models for:

Device

Unique device identifier.

Device ownership or registration relationship.

Device authentication information, stored securely.

Device status and relevant metadata.

Session

Session identifier.

Associated user and authorized device.

Start and completion timestamps.

Session status, such as ACTIVE, PROCESSING, COMPLETED, or FAILED.

Data completeness and processing status where appropriate.

RawSensorBatch

Unique batch identifier.

Associated device and session.

Sampling rate and sample count.

Batch start timestamp and server receipt timestamp.

Optional content hash for duplicate verification.

RawSensorSample

Batch relationship and sample index.

Sensor timestamp.

Accelerometer values: ax, ay, az.

Gyroscope values: gx, gy, gz.

SessionAnalysis

Associated session.

Model version.

Analysis status.

Generated predictions and summary metrics.

Processing timestamps and error information where appropriate.

Adapt these fields to the existing schema instead of creating duplicate models. Use appropriate foreign keys, indexes, uniqueness constraints, and database migrations.

API endpoints

Implement or adapt:

POST /api/telemetry/batches — receive sensor batches.

POST /api/sessions — create a session.

POST /api/sessions/:sessionId/complete — request session completion and analysis.

GET /api/sessions — retrieve the authenticated user's sessions.

GET /api/sessions/:sessionId — retrieve an authorized session and its status.

GET /api/sessions/:sessionId/analysis — retrieve analysis results.

These are proposed endpoint contracts. Reuse existing routes if equivalent functionality already exists.

Requirements

Validate request bodies using the project's validation conventions or Zod.

Authenticate devices and users appropriately.

Never trust a client-supplied user or device identifier without verifying authorization.

Verify that each device is authorized to submit data to its session.

Enforce idempotency using a unique device-and-batch identifier.

Handle repeated requests and concurrent retries safely.

Use database transactions where needed to avoid partially saved batches.

Avoid returning raw internal errors, credentials, or sensitive data.

Acceptance criteria

Valid batches are persisted correctly.

Invalid data is rejected with appropriate status codes.

Repeated uploads do not duplicate samples.

Unauthorized devices cannot submit data to another user's session.

Existing authentication and API behavior continue to work.

Database migrations and relevant tests pass.

6. Phase 2 — Real-Time Posture Feedback

Tasks

Integrate WebSocket with the existing Express HTTP server.

Add authenticated WebSocket connections.

Associate each connection with an authorized user and device.

Define a documented message format for posture updates.

Implement server-side routing so updates are delivered only to authorized subscribers.

Connect the Next.js frontend to the WebSocket endpoint.

Display connection status, current posture status, and the latest update timestamp.

Handle disconnections, reconnect attempts, and stale messages.

Initial posture detection

Implement a configurable, calibrated threshold-based posture detector on the ESP32 when firmware is available.

The detector should produce a simple initial status, such as:

NEUTRAL

UNFAVORABLE

UNKNOWN

Use UNKNOWN when measurements are unavailable or calibration is invalid. Avoid claiming clinical accuracy.

The backend should validate incoming messages and may relay the device's status to the frontend. Do not transmit every raw sensor sample through WebSocket unless required.

Acceptance criteria

Live posture updates appear in the dashboard with minimal practical delay.

The interface indicates when the device is disconnected or updates are stale.

A user cannot subscribe to another user's device stream.

Reconnection does not create uncontrolled duplicate subscriptions.

Live updates do not interfere with HTTP batch persistence.

7. Phase 3 — Reliable Offline Data Upload

Tasks

Implement a store-and-forward mechanism in the ESP32 firmware when that codebase is available.

Collect sensor samples at a configurable sampling rate.

Group samples into batches.

Assign each batch a stable, unique identifier.

Persist unsent batches locally.

Upload batches through the telemetry API.

Wait for server acknowledgment before marking a batch as delivered.

Retry failed uploads using exponential backoff.

Resume pending uploads after Wi-Fi reconnects or device restarts.

Remove or reclaim local storage only after successful acknowledgment.

Use persistent flash storage or an SD card if supported and appropriate for the board. RAM-only buffering is insufficient if the device must recover pending data after power loss.

Backend requirements

Recognize previously accepted batches.

Confirm whether a batch was stored or was already accepted.

Reject conflicting reuse of a batch ID.

Prevent duplicate sensor samples.

Record or report incomplete sessions when data cannot be recovered.

Define maximum batch size, queue capacity, and storage-exhaustion behavior.

Acceptance criteria

Temporary Wi-Fi failure does not immediately discard queued readings.

Pending batches upload after connectivity returns.

Retrying the same batch does not duplicate data.

Device restart recovery works if persistent storage is implemented.

Queue overflow and permanently failed uploads are handled explicitly.

If firmware is not included in the repository, implement and test the backend contract first. Document the firmware requirements rather than pretending hardware functionality has been implemented.

8. Phase 4 — Session Lifecycle and Background Processing

Tasks

Implement explicit session creation and completion.

Ensure only authorized users or devices can change session state.

Prevent new readings from being silently appended to a finalized session.

Verify received batches and identify missing data where possible.

Add a background processing mechanism for completed sessions.

Make jobs retry-safe and prevent duplicate analysis jobs.

Store processing status and useful error information.

Provide an API for the frontend to check progress.

Suggested lifecycle:

ACTIVE → PROCESSING → COMPLETED

A processing failure should be represented explicitly and should support controlled retries. An incomplete session must not be treated as complete merely because the user pressed the finish button.

Use an existing queue system if the project already has one. Otherwise, select the simplest reliable mechanism appropriate to the deployment environment. Avoid adding a large infrastructure dependency without justification.

Acceptance criteria

Session completion triggers analysis only when appropriate.

Duplicate completion requests do not create duplicate results.

Failed jobs can be retried safely.

The frontend can distinguish active, processing, completed, failed, and incomplete sessions.

9. Phase 5 — AI Model and Inference Service

Important constraint

Do not train a model on arbitrary or unlabeled sensor readings. Begin with a clearly defined prediction task and a documented dataset and labeling method.

Tasks

A. Define the prediction task

Agree on the categories the model should recognize, the intended use, and the evaluation criteria. Distinguish general posture or movement classification from medical diagnosis.

B. Prepare the dataset

Load sensor samples from completed sessions or an approved dataset.

Check timestamps, missing values, sampling rates, and sensor orientation.

Segment the data into documented time windows.

Extract appropriate statistical or temporal features.

Associate each training window with a reliable label.

Split training and evaluation data by participant where feasible to reduce data leakage.

C. Establish a baseline

Evaluate the existing threshold-based approach.

Train a simple scikit-learn classifier only after suitable labeled data exists.

Compare model performance with the baseline.

Report precision, recall, F1-score, confusion matrix, and other appropriate metrics.

Document limitations and potential variation between users.

D. Build the inference service

Create a separate Python service with a documented contract, for example:

GET /health — service health.

POST /predict — classify a validated sensor window or feature set.

POST /analyze-session — optional endpoint for analyzing prepared session data.

The exact contract must be finalized before integration. The service should load a versioned trained model, validate inputs, return structured predictions, and handle failures safely.

E. Integrate with Express

Invoke the inference service from a background worker.

Send only the necessary data or derived features.

Validate the response.

Save results and model version in PostgreSQL.

Retry transient failures without duplicating completed analysis.

Keep service credentials in environment variables or a suitable secret manager.

Do not retrain the model after every session. Model training should be a controlled development or model-release process, separate from ordinary user requests.

Acceptance criteria

The inference service starts and exposes its documented API.

Invalid inputs produce controlled errors.

Model version and evaluation metrics are documented.

Predictions are stored against the correct session.

The frontend can retrieve and display completed results.

The system clearly identifies unavailable or failed AI analysis instead of fabricating results.

If no appropriate labeled dataset exists, implement the pipeline and API contract with an explicitly marked development stub, then document what is required before genuine predictions can be enabled.

10. Phase 6 — Frontend Integration

Tasks

Build on the existing Next.js UI rather than replacing it.

Implement or adapt:

Device connection indicator.

Live posture status.

Active session controls.

Session duration and data availability.

Session history.

Session processing status.

Completed analysis summary.

Error, loading, empty, and disconnected states.

The UI should distinguish real-time threshold-based feedback from model-generated session analysis. Clearly label any provisional results.

Acceptance criteria

The user can start and complete a session.

Live feedback updates through WebSocket.

Session history loads through the authenticated API.

Completed analysis is displayed only when available.

Unauthorized users cannot access other users' session data.

The UI remains usable when the device, API, or AI service is unavailable.

11. Phase 7 — Testing and Validation

Implement tests appropriate to the project's existing testing framework.

Backend tests

Input validation.

Authentication and authorization.

Batch persistence and duplicate handling.

Session ownership and lifecycle.

Background job retries.

AI-service timeout and invalid response handling.

Integration tests

Create a session, upload batches, complete the session, and retrieve analysis.

Upload a batch twice and verify that no duplicate samples appear.

Attempt to upload to a session owned by another user and verify rejection.

Simulate a temporary AI-service failure and verify recoverable processing status.

Frontend tests

WebSocket connection and disconnection.

Live status rendering.

Session history and analysis states.

Error and loading states.

Hardware validation

When the ESP32 firmware is available, test:

Sensor initialization and calibration.

Sampling stability.

Wi-Fi loss and recovery.

Batch acknowledgment and retries.

Local queue persistence.

Timestamp handling and device restart recovery.

Acceptance criteria

All relevant automated tests pass.

Existing builds, linting, and type checking pass.

The end-to-end data flow is demonstrated.

Known limitations are documented honestly.

12. Implementation Rules for the Agent

Work phase by phase, not by attempting the whole system in one change.

Inspect existing code before creating files or changing architecture.

Reuse established project conventions and working modules.

Do not overwrite environment files, expose credentials, or commit secrets.

Never run destructive database commands or reset existing data without explicit approval.

Create migrations instead of modifying production data manually.

Add or update tests alongside implementation.

Run relevant tests, type checks, linting, and builds after each phase.

Explain assumptions and report blockers instead of silently inventing requirements.

Keep hardware-dependent features clearly separated from features that can be tested in software.

Do not claim that AI predictions are clinically validated without appropriate evidence.

After each phase, report changed files, implementation details, test results, remaining issues, and the next recommended step.

Stop for developer approval when a decision materially changes the architecture, requires credentials, introduces substantial infrastructure, or risks existing data.

13. Required Final Deliverables

At the end of implementation, provide:

Updated source code and database migrations.

Documented HTTP and WebSocket contracts.

Updated environment-variable example with placeholders only.

Device and telemetry protocol documentation.

Instructions for local development and deployment.

AI dataset preparation, training, evaluation, and inference instructions.

Automated test results.

A summary of implemented features, unimplemented hardware-dependent work, and known limitations.

Definition of Done

The software implementation is complete when an authorized user can start a session, receive live posture updates, upload sensor data reliably, complete the session, trigger analysis, and view the stored results. Offline buffering must be verified on the actual device before claiming that end-to-end hardware reliability is complete. AI functionality must be identified as a development stub or genuine evaluated model, as applicable.

The agent should begin with Phase 0: Repository Inspection and Technical Audit, then proceed sequentially after reporting its findings.