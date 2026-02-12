# Product Requirements Document (PRD) - Profile Photo Framing

## Feature Overview
Allow users to precisely frame their profile photos by providing a square cropping interface with panning and scaling capabilities.

## Target User
Users who want to customize how their profile picture is displayed on their profile and in lists.

## Requirements

### 1. Square Framing Interface
- When editing the profile, the photo preview should be a square (currently it is a circle in the preview).
- The interface must clearly indicate the area that will be visible.

### 2. Panning (Movement)
- If the uploaded photo is larger than the square frame (either naturally or due to zoom), the user should be able to click/touch and drag the photo to reposition it within the frame.
- The movement should be constrained so that the frame is always filled by the image (no empty spaces showing).

### 3. Scaling (Zoom)
- Maintain the existing zoom functionality but ensure it integrates with the new panning feature.
- Increasing zoom should allow more panning range.

### 4. Persistence
- The position (X and Y offsets) and scale must be saved to the user's profile.
- The framing should be applied when displaying the profile photo throughout the app.

## User Experience (UX)
- **Interaction**: Dragging the image with the mouse or finger.
- **Feedback**: Real-time preview of the framing.
- **Constraints**: Prevent dragging the image outside its boundaries relative to the frame.

## Unclear Aspects & Decisions
- **Circular vs Square**: The user asked for a "cuadrado" (square) frame. However, the profile photo is often displayed as a circle in the UI. We will use a square frame for editing, which is standard for "circular" avatars as the circle is inscribed in the square.
- **Implementation**: We will implement this using inline styles (`transform: translate(x, y) scale(s)`) to avoid heavy external libraries, following the project's pattern of minimal dependencies and inline styles.
