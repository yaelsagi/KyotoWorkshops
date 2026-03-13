# Kyoto Workshops App – Project Report (Submission Draft)

**Student:** [Your Name]  
**Module:** Mobile Development  
**Project:** Kyoto Workshops (React Native + Expo + Firebase)  
**Date:** March 2026

---

## 1. Introduction

This report documents the end-to-end development process of the Kyoto Workshops mobile application, from concept ideation to testing and evaluation. The app is designed as a culturally focused marketplace where learners discover and book traditional craft workshops in Kyoto, while hosts submit workshop listings and access host tools through a moderated approval flow.

The goal of this project was not only to build a visually appealing app, but to demonstrate practical competence across the module topics: user interface design, navigation, responsive and accessible UI, advanced interaction, state architecture, API/data integration, persistence, sensors, and testing. A key outcome was moving from a prototype-style architecture to a realistic platform architecture, where content submission and capability access are controlled by status-based moderation (for example, pending and approved workshop states).

This report follows the development timeline and justifies major design and technical decisions using evidence from implementation and testing.

---

## 2. Concept Development

The core concept emerged from two observations: (1) many travel apps present activities in generic ways, and (2) users increasingly value authentic, local, skill-based experiences. Kyoto Workshops addresses both by combining cultural discovery with practical booking and creator-side listing tools.

### 2.1 Problem Statement

Users need a reliable way to find high-quality, authentic workshops in Kyoto, compare options quickly, and book confidently. At the same time, workshop hosts need a straightforward mechanism to submit and maintain listings without compromising quality.

### 2.2 Product Vision

The product was designed as a unified platform (not separate apps):
- Learners browse, favourite, and book workshops.
- Hosts apply for host capability, then create and manage workshops.
- Admin review ensures public quality and trust.

A significant concept decision was replacing a “mode-switching” mental model with an additive capability model. This aligns better with real user identity: a person can be a learner and optionally become a host or translator.

### 2.3 Success Criteria

The app was considered successful if it achieved:
- Stable multi-screen navigation and coherent workflows.
- Real Firestore-backed persistence.
- Validation and robust loading/error states.
- Clear moderation architecture for workshop visibility.
- Test evidence for core services.

**Figure 1.** Product vision map (Learner + Host + Translator capabilities in one platform).  
*Caption:* High-level concept showing unified platform architecture and role capabilities.

---

## 3. Wireframing and UX Planning

Wireframing was used early to avoid ad-hoc screen growth and to maintain clear navigation hierarchy. Initial low-fidelity wireframes mapped the main tabs and deep-link paths (Workshop details, gallery, reviews, profile tools).

### 3.1 Information Architecture

The final main structure keeps bottom navigation stable:
- Explore
- Favourites
- Bookings
- Profile

This decision improves predictability and reduces cognitive load compared with role-dependent tab switching.

### 3.2 Profile Hierarchy Refinement

Profile was reorganized to strengthen UX hierarchy:
1. Profile Header
2. Quick Action Cards (host/translator)
3. Settings
4. Account
5. Support

This separates platform growth actions from routine settings, making hosting and translation more visible without disrupting navigation.

### 3.3 Moderation-Aware Flow Design

Host and workshop creation flows were planned as status-based workflows:
- Host application submitted -> pending -> approved/rejected
- Workshop submitted -> pending -> approved/rejected
- Public Explore/Map/Search only display approved workshops

This gives marker-visible realism while remaining coursework-sized.

**Figure 2.** Navigation and workflow diagram.  
*Caption:* User flows from profile actions into application, creation, and review states.

---

## 4. Accessibility and Responsive Design

Accessibility and responsiveness were considered as baseline quality requirements, not post-development add-ons.

### 4.1 Accessibility Practices Implemented

- Logical text hierarchy (titles, labels, helper text, metadata).
- Sufficient contrast between text and background surfaces.
- Large, touch-friendly interactive targets.
- Plain-language helper text in forms (especially Create Workshop).
- Loading feedback (ActivityIndicator) to reduce uncertainty.

### 4.2 Responsive Layout Techniques

- Flexbox layout across cards, menus, and form sections.
- ScrollView for long form screens.
- FlatList for growing datasets (for performance and scalability).
- Platform-aware spacing (iOS/Android top padding differences).

### 4.3 UX Ethics

Dark patterns were intentionally avoided:
- No hidden confirmations.
- No misleading button hierarchy.
- Clear pending/approval messaging to set expectations.

**Figure 3.** Accessibility-focused form section with helper text.  
*Caption:* Example of explicit guidance under About/Included/Photos to improve completion quality.

---

## 5. Code Architecture

The architecture is modular and separates concerns between interface, state, and data layers.

### 5.1 Layered Structure

- `screens/` -> UI workflows and interaction handling.
- `components/` -> reusable visual elements.
- `services/` -> Firestore/Storage data operations and business rules.
- `context/` -> app-wide user/capability state.
- `utils/` and `constants/` -> shared logic and static definitions.

### 5.2 State Management Strategy

React Context was used for global user state and capabilities. This avoids prop drilling while keeping state understandable for coursework scope.

- `UserContext` stores current user profile and application statuses.
- `UserCapabilitiesContext` exposes enabled capabilities used by UI gating.

### 5.3 Moderation Architecture

A major architecture improvement was implementing moderation fields directly in persisted entities.

Workshop document includes:
- `status`: `pending | approved | rejected`
- `customCategorySuggestion`
- `customCategorySuggestionStatus`: `none | pending | approved | rejected`

User document includes:
- `hostApplicationStatus`: `none | pending | approved | rejected`

Public queries only return approved workshops, while owner dashboards can still view pending/rejected items.

### 5.4 Why This Architecture Was Chosen

This design balances realism and complexity:
- Real workflow fidelity for assessment.
- Minimal moderation surface (simple review screen).
- Avoids over-engineering (no full admin dashboard or complex role policy engine).

**Figure 4.** Data model summary (User, Workshop moderation fields).  
*Caption:* Persistent schema used to implement approval-based visibility and capability gating.

---

## 6. Prototyping and Development Iterations

Development followed iterative prototyping rather than one-time implementation.

### 6.1 Iteration 1 – Core Discovery Experience

Implemented Explore map/list, workshop details, favourites, and bookings. This established the learner baseline and navigation reliability.

### 6.2 Iteration 2 – Capability Model Refactor

The app was refactored from role-mode switching to capability-based access. This reduced conceptual friction and kept navigation stable for all users.

### 6.3 Iteration 3 – Profile UX Rework

Statistics cards were replaced with action cards to improve platform action visibility. Professional actions were moved to the top-level profile hierarchy.

### 6.4 Iteration 4 – Real Workshop Creation

Create Workshop moved from placeholder success alerts to real Firestore persistence and image uploads. Validation and helper text were added for data quality.

### 6.5 Iteration 5 – Moderation and Admin Review

Implemented:
- Pending workshop submissions.
- Public approved-only filtering.
- Host application pending/approval.
- Lightweight Admin Review screen accessible from Profile for marker testing.

**Figure 5.** Iteration timeline.  
*Caption:* Key architectural and UX milestones from baseline prototype to moderated platform.

---

## 7. Feature Implementation Details

### 7.1 Create Workshop Form Quality Controls

The host form captures:
- Workshop details (title, categories, custom suggestion)
- Photos (cover + minimum gallery count)
- Schedule and capacity
- Location
- Description and inclusions
- Price

Validation rules ensure incomplete submissions are blocked, with actionable feedback.

### 7.2 Category Governance

Selected categories come from the shared approved list. A host may suggest a new category through `customCategorySuggestion`, but it is saved separately and does not automatically alter the shared category constants.

### 7.3 Host Dashboard Workflow

Hosts can:
- See their own workshops and moderation statuses.
- Edit and re-submit changes (which return to pending for review).

This simulates realistic content governance while staying scoped.

### 7.4 Public Visibility Rules

Explore/map/search pipelines are moderated by status filter. This prevents unreviewed content exposure and demonstrates practical workflow control.

---

## 8. User Feedback and Design Adjustments

Throughout development, feedback focused on usability clarity and realism.

### 8.1 Key Feedback Themes

- “Hosting actions should be easier to find.”
- “Role switching feels confusing; capabilities are clearer.”
- “The app should feel production-like, not demo-only.”

### 8.2 Resulting Changes

- Profile hierarchy restructured.
- Action cards introduced for host/translator entry points.
- Real data persistence + moderation states implemented.
- Admin review path exposed directly from Profile to improve testability.

These changes improved perceived professionalism and alignment with assessment criteria.

---

## 9. Unit Testing and Quality Assurance

Testing used Jest with existing service-focused test suites. The objective was to prevent regressions during architecture changes.

### 9.1 Testing Approach

- Unit tests for workshop, booking, review, and storage services.
- Error-path and validation-path checks.
- Re-run test suites after each substantial refactor.

### 9.2 Quality Practices Demonstrated

- Separation of concerns (UI vs logic/services).
- Explicit loading and error state handling.
- Consistent naming and modular files.
- Focused patches with post-change validation.

### 9.3 Current Evidence

All existing test suites pass after moderation workflow integration.

### 9.4 Defensive Programming

This project includes concrete defensive programming measures beyond baseline validation:

- **Persistent auth state on native:** Firebase Auth is initialized with React Native AsyncStorage persistence to avoid memory-only sessions.
- **Defense-in-depth admin guards:** Admin Review is protected at both the entry point (Profile button) and the destination screen.
- **Role-based access checks:** Admin workflows require `roles.admin === true`, not just signed-in status.
- **Guest-safe redirect prompts:** Unauthorized users receive clear prompts with Sign In/Create Account actions and redirect-back behavior.
- **Duplicate write prevention:** Admin approve/reject actions disable while in-flight to prevent double tap submissions.
- **Index-safe queue loading:** Pending translator queries were adjusted to avoid composite index failures during runtime.
- **Permission-safe category fallback:** Platform category reads fail gracefully to defaults when Firestore permissions deny access.
- **Deterministic role defaults:** User schema/context defaults include `admin: false` to prevent undefined-role edge cases.

**Figure 6.** Test run evidence snapshot.  
*Caption:* Passing Jest suites confirming stability after workflow refactor.

---

## 10. Evaluation

### 10.1 What Went Well

- Stable, scalable navigation design.
- Effective shift to capability-based architecture.
- Real moderation flow increased system credibility.
- Form validation + helper text improved submission quality.
- Admin review screen made workflow easy to demonstrate.

### 10.2 Limitations

- Translator application review is scaffolded but not fully implemented.
- Firestore rules should mirror UI admin checks for full backend enforcement.
- Location coordinates are simplified defaults in current workshop submission path.

### 10.3 Improvements for Future Work

- Add true geocoding for address-to-coordinate mapping.
- Add dedicated moderation audit trail (review notes, reviewer ID).
- Add integration tests for cross-screen workflow assertions.
- Expand admin controls with minimal but authenticated guardrails.

---

## 11. Mapping to Module Techniques (Topics 1–10+)

This project demonstrates broad technique coverage:

1. UI design from goals: profile hierarchy, card prioritization, moderated flows.  
2. UX critique/application: reduced mode confusion through capabilities.  
3. Wireframing: planned screen hierarchy and workflow transitions.  
4. Cross-device style replication: platform-aware spacing and scalable layout.  
5. Accessibility: labels, contrast, helper text, touch sizes, loading feedback.  
6. Responsive design: Flexbox, ScrollView/FlatList use, adaptable cards/forms.  
7. UI to action linking: navigation and form submission logic throughout.  
8. Navigation systems: tab + stack architecture with predictable pathways.  
9. Advanced UI elements: map markers, lists, conditional sections, status chips.  
10. Unit testing: maintained passing suites across refactors.  
11. API/data integration: Firestore + Storage for real persistence and retrieval.  
12. Sensor usage: camera/media library integration for workshop images.  
13. App-store readiness mindset: moderation, validation, and robust workflow state handling.

---

## 12. Conclusion

Kyoto Workshops evolved from a functional prototype into a moderated, persistence-backed multi-role platform with realistic content governance. The final system demonstrates strong alignment with module learning outcomes through practical implementation, architectural reasoning, and test-driven stability checks.

Most importantly, the project shows intentional design and engineering decisions: stable navigation, accessible and responsive interfaces, clear separation of concerns, meaningful validation, and real moderation workflow rather than superficial demo behavior. These choices collectively support the objective of producing an application in a state representative of app-store submission quality for coursework scope.

---

## References

- React Native Documentation.  
- Expo Documentation (ImagePicker, Image, Navigation).  
- Firebase Documentation (Firestore, Storage, Auth).  
- Jest Documentation.

---

## Appendix A – Figure Checklist (To Replace with Your Actual Images)

- Figure 1: Product vision map.  
- Figure 2: Navigation/workflow diagram.  
- Figure 3: Accessibility-focused form section.  
- Figure 4: Data model and moderation fields.  
- Figure 5: Development iteration timeline.  
- Figure 6: Jest test pass evidence.

> Tip for final submission: export this Markdown to PDF/Word at 12pt font and replace each figure placeholder with your screenshot plus caption.
