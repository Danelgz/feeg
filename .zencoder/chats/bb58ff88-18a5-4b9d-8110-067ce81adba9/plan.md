# Full SDD workflow

## Workflow Steps

### [x] Step: Requirements

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `c:\Users\danel\Desktop\FEEG\mi-web\.zencoder\chats\bb58ff88-18a5-4b9d-8110-067ce81adba9/requirements.md`.

### [x] Step: Technical Specification

Create a technical specification based on the PRD in `c:\Users\danel\Desktop\FEEG\mi-web\.zencoder\chats\bb58ff88-18a5-4b9d-8110-067ce81adba9/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `c:\Users\danel\Desktop\FEEG\mi-web\.zencoder\chats\bb58ff88-18a5-4b9d-8110-067ce81adba9/spec.md` with:

- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning

Create a detailed implementation plan based on `c:\Users\danel\Desktop\FEEG\mi-web\.zencoder\chats\bb58ff88-18a5-4b9d-8110-067ce81adba9/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function) or too broad (entire feature).

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `c:\Users\danel\Desktop\FEEG\mi-web\.zencoder\chats\bb58ff88-18a5-4b9d-8110-067ce81adba9/plan.md`.

### [ ] Step: Implementation

1. **[ ] Update State and Data Model**: Add `photoPosX` and `photoPosY` to `editData` in `pages/profile.js` and ensure they are saved in `handleEditSave`.
2. **[ ] Implement Drag Logic in Profile Editor**:
    - Add mouse/touch event handlers to the profile photo preview.
    - Implement the framing logic (X/Y movement restricted by scale and image boundaries).
    - Update `editData` state in real-time.
3. **[ ] Update Profile Display**: Apply the `photoPosX`, `photoPosY`, and `photoScale` transforms to the profile photo display on the `Profile` page.
4. **[ ] Global Consistency**: Check other places where profile photo is displayed (e.g., `Sidebar`, `FollowersList`) and ensure the same transforms are applied.
5. **[ ] Final Verification**: Run linting and manually verify the feature.
