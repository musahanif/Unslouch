# Unslouch — General Project Overview

## 1. Project Introduction

Unslouch is a wearable, AI-assisted posture-monitoring system designed to help people monitor their posture and maintain consistent rehabilitation habits. The project primarily targets scoliosis patients undergoing rehabilitation, with secondary use cases for students and desk workers who experience posture-related discomfort.

The system combines an IMU-based wearable device, real-time posture feedback, cloud data storage, and AI-assisted analysis through a web application. By collecting movement and orientation data during daily activities, Unslouch aims to provide more useful feedback than posture monitors that rely solely on fixed-angle thresholds.

The project is developed by Group JOMA for the Senior Project in Computer Networks, Cloud Computing, and AI.

## 2. Problem Statement

Scoliosis rehabilitation often requires consistent posture awareness and adherence to prescribed exercises. However, clinicians generally have limited visibility into patients' everyday postural behavior between appointments.

Conventional posture-monitoring devices may also produce false alerts because they rely on fixed thresholds and do not adequately account for normal movements or individual baseline differences. Repeated unnecessary alerts can reduce user trust and discourage continued use.

Unslouch aims to address these limitations by monitoring body movement, identifying potentially unfavorable posture patterns in context, providing timely feedback, and tracking posture and exercise habits over time.

## 3. Project Objectives

The main objectives are to:

1. Develop an affordable wearable device that measures body orientation and movement.
2. Provide real-time posture feedback through a web application.
3. Collect and securely store sensor readings and session histories.
4. Develop an AI-assisted approach to recognize activities and analyze posture patterns.
5. Reduce unnecessary alerts by considering activity context and individual calibration.
6. Provide personalized, evidence-informed movement-break and exercise recommendations.
7. Help users track exercise adherence and posture trends over time.

These objectives describe the intended product. Clinical effectiveness and AI accuracy must be evaluated rather than assumed.

## 4. Core Features

### 4.1 Wearable Posture Monitoring

An ESP32 connected to an MPU-6050 accelerometer and gyroscope collects body movement and orientation data. The device is intended to operate during activities such as sitting, standing, walking, and bending.

### 4.2 Real-Time Posture Feedback

The device performs initial posture detection and sends status updates to the web application. The interface displays the current status and provides feedback when an unfavorable posture persists beyond a configurable duration.

### 4.3 Activity Recognition and Posture Analysis

The system stores sensor readings for subsequent analysis. An AI model is intended to recognize activities and distinguish potentially unfavorable posture patterns from normal transient movements.

The initial implementation may use calibrated, rule-based detection while the team collects and labels sufficient sensor data to train and evaluate an appropriate machine-learning model.

### 4.4 Session and Historical Data Tracking

Users can start and finish monitoring sessions, review historical records, and inspect available posture metrics. Sensor data must be associated with the correct user, device, and session.

### 4.5 Personalized Exercise Recommendations

The application aims to recommend suitable movement breaks and exercises based on posture patterns and activity history. Recommendations should come from an evidence-informed exercise library and should not be presented as medical diagnoses or replacements for professional advice.

### 4.6 Cloud Synchronization

The backend stores session records, sensor batches, analysis results, and relevant user data in PostgreSQL. Data is made available to the authenticated web application through backend APIs.

### 4.7 Smart Notifications

The system is intended to provide reminders for movement breaks and scheduled exercises based on user routines and adherence patterns.

## 5. Technology Stack

- **Wearable hardware:** ESP32 and MPU-6050 IMU sensor.
- **Frontend:** Next.js, React, and TypeScript.
- **Backend:** Node.js, Express, and TypeScript.
- **Database:** PostgreSQL.
- **Database access:** Prisma ORM.
- **Real-time communication:** WebSocket.
- **AI service:** Python and FastAPI.
- **Machine learning:** scikit-learn as a potential starting point for a lightweight model.

The existing repository is the source of truth for installed technologies and implementation details. The coding agent must inspect the project before introducing packages, changing configurations, or creating new modules.

## 6. System Architecture and Data Flow

The system consists of five main parts.

**1. Wearable Device**

The MPU-6050 measures acceleration and angular velocity. The ESP32 processes the readings, performs initial posture detection, and prepares sensor batches.

**2. Communication Layer**

WebSocket is used for low-latency posture-status updates. HTTP is used to upload batches of raw sensor readings. When the network is unavailable, the ESP32 should retain pending batches locally and upload them after reconnecting.

**3. Backend Application**

The Express backend authenticates users and devices, validates incoming requests, manages monitoring sessions, stores sensor data, and coordinates background analysis.

**4. Database and AI Service**

PostgreSQL stores sensor data and session records. After a session is completed, a background worker prepares the data and calls the Python inference service. The service loads an already-trained model and returns predictions. Model training and evaluation take place separately from routine user sessions.

**5. Web Application**

The Next.js frontend displays live posture status, device connectivity, session history, analysis progress, and available results.

### Overall data flow

ESP32 + MPU-6050 → Express Backend → PostgreSQL

ESP32 → WebSocket → Express Backend → Next.js Dashboard

Completed Session → Background Worker → Python AI Service → PostgreSQL → Next.js Analysis View

## 7. Important Engineering Principles

- **Reliability:** Offline sensor data must be buffered and retried safely.
- **Data integrity:** Repeated uploads must not create duplicate batches or samples.
- **Security:** Every user and device must be authorized to access the relevant sessions and data.
- **Modularity:** Hardware communication, APIs, database access, real-time updates, and AI processing should have clear responsibilities.
- **Maintainability:** Follow the existing project structure, naming conventions, and coding standards.
- **Scalability:** Avoid processing every sensor sample through an expensive AI request when session-level analysis is sufficient.
- **Privacy:** Collect only necessary data and protect sensor histories and account information.
- **Scientific validity:** Define posture labels, evaluate model performance, and distinguish general posture monitoring from clinical assessment.

## 8. Development Priorities

The implementation should proceed incrementally:

1. Inspect the repository and document the current architecture.
2. Implement or adapt session management and sensor-batch storage.
3. Establish authenticated WebSocket communication for real-time status.
4. Implement offline buffering, acknowledgment, and retry behavior in the firmware.
5. Complete the session lifecycle and background-processing workflow.
6. Prepare a labeled sensor dataset and evaluate an initial AI model.
7. Integrate the inference service with the backend.
8. Complete the dashboard, session history, and analysis views.
9. Test the end-to-end workflow and document deployment.

The team should establish a working sensor-to-dashboard and sensor-to-database pipeline before relying on AI-generated predictions.

## 9. Scope and Limitations

Unslouch is intended to support posture awareness and rehabilitation adherence. It is not intended to independently diagnose scoliosis, measure spinal curvature clinically, or replace a physiotherapist or orthopedic specialist.

The accuracy of posture analysis depends on sensor placement, calibration, activity context, data quality, and the availability of reliable labels. Personalized recommendations must be appropriately validated before being presented as clinically tailored guidance.

Features that require physical hardware, trained models, or clinical validation must be identified separately from software features that have been implemented and tested.

## 10. Expected Outcome

The intended outcome is an integrated wearable and web-based system that can collect motion data, deliver real-time posture feedback, retain session data despite temporary network interruptions, and analyze completed sessions using an evaluated machine-learning model.

The system should provide a foundation for tracking posture patterns and rehabilitation habits over time while remaining affordable, modular, secure, and suitable for future improvements.
