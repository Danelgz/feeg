# Technical Specification - Profile Photo Framing

## Technical Context
- **Framework**: Next.js (Pages Router), React 19.
- **Styling**: Inline styles.
- **State Management**: React `useState` and `UserContext`.
- **Storage**: Firebase (photo URL and metadata).

## Implementation Approach

### 1. Data Model Changes
Add `photoPosX` and `photoPosY` (percentages or pixels) to the User object in `UserContext.js` and `pages/profile.js`.

### 2. Profile Page Updates (`pages/profile.js`)
- **State**: Update `editData` to include `photoPosX` and `photoPosY`.
- **Preview Component**:
    - Change the preview container to be a square during editing (or a square with a circular mask).
    - Add event handlers for `onMouseDown`, `onMouseMove`, and `onMouseUp` (and touch equivalents) to the preview image.
    - Calculate new offsets based on mouse movement, accounting for current scale.
    - Constrain offsets to ensure the image always covers the frame.
- **Saving**: Update `handleEditSave` to include the new position coordinates.

### 3. Display Updates
- Everywhere the profile photo is displayed (Profile page, Sidebar, Followers list), update the `<img>` styles to use `transform: translate(x, y) scale(s)` instead of just `scale(s)`.
- Use `objectFit: "cover"` as a fallback, but the custom framing should take precedence.

## Detailed UI/Logic Logic
- **Frame Size**: Fixed size (e.g., 150px x 150px) for the editor.
- **Calculation**: 
    - When dragging, update `photoPosX` and `photoPosY`.
    - Bounds calculation: 
        - Max movement in X = `(imageWidth * scale - frameWidth) / 2`
        - This requires knowing the image's aspect ratio or natural dimensions.
- **Alternative (Simpler)**: Use a `div` with `backgroundImage` and `backgroundPosition`. However, `transform` is generally more performant and easier to reason about with `scale`.

## Verification Approach
- Manual testing of the drag-and-drop functionality in the profile edit modal.
- Verification that coordinates are saved to Firebase and persist after reload.
- Check display consistency across different components.
- Run `npm run lint` to ensure no regressions.
