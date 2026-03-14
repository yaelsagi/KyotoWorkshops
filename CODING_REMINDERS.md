
Use these rules for all code changes.

## 1. Keep it simple
- Prefer simple, clean, maintainable code
- Do not over-engineer
- Avoid unnecessary abstractions
- Do not add wrappers, helpers, or hooks unless they solve a real repeated problem

## 2. Match the project
- Follow the existing project structure and patterns
- Keep changes consistent with nearby code
- Do not rewrite unrelated code
- Keep edits focused on the requested task
- This project is JavaScript — write `.js` / `.jsx` files. Do not introduce TypeScript unless the project is configured for it

## 3. Write readable code
- Use clear, practical names
- Avoid vague names like `data`, `temp`, `helper`, or `stuff`
- Use verbs for functions and nouns for values/components
- Break up code that becomes hard to scan

## 4. Reuse before duplicating
- Reuse existing components, services, and types when appropriate
- Do not duplicate logic or UI patterns without a good reason
- Extract shared code only when reuse is real and improves clarity
- Name reusable components based on their purpose — avoid vague names like `Helper`, `Wrapper`, or `Container`
- Keep reusable components small and focused on one job

## 5. Keep logic in the right place
- Keep business logic out of presentational UI when reasonably possible
- Keep components focused on one responsibility
- Keep state local unless multiple parts truly need it
- Avoid duplicated derived state

## 6. Type safely
- Prefer explicit, reliable types
- Avoid `any` unless absolutely necessary
- Update types properly instead of bypassing errors
- In JavaScript React components, define expected props with PropTypes
- Mark required props as `.isRequired`

## 7. Platform-specific code
- Guard platform-specific APIs with an explicit platform check
- Only use platform-specific code when genuinely needed
- Provide sensible behaviour for the other platform — do not leave it broken or silently ignored
- Do not imply iOS and Android behave identically when they do not

## 8. Avoid fragile fixes
- Do not use hardcoded hacks, unnecessary timeouts, or workaround-heavy patches
- Do not silence warnings without understanding them
- Prefer solutions that will still make sense later

## 9. Handle real states
- Handle loading, empty, and error states for async UI
- Validate user input where needed
- Do not assume API data is always complete or valid
- Fail gracefully

## 10. Comments
- Follow `COMMENT_STYLE_GUIDE.md`
- use colors from colors.js file, try not to add new ones. if you have to, add it to the colors.js
- Keep comments short, natural, and useful
- Put comments above the code they describe
- Do not comment obvious code

## 11. Writing style
- Write like a human
- Keep wording clear, simple, and natural
- Avoid AI-sounding phrasing in code comments, UI text, and explanations

## 12. Before finishing
Quickly check:
- Is this simple?
- Is this readable?
- Is it consistent with the project?
- Is there unnecessary duplication?
- Will this work well on mobile?
- does it look AI? it should look human

# UI and Design Consistency Rules

Use these rules for all UI work.

## 1. Match the existing app
- Keep UI consistent with the current app style
- Follow existing spacing, sizing, radius, typography, and layout patterns
- Do not introduce a new visual style unless requested

## 2. Icon usage
- Use Heroicons across the app
- Exception: keep the current icons on the Profile screen for **Become a Host** and **Become a Translator**  -use the original colourful icons (🌐, 🎨).
- Keep icon size and visual weight consistent across similar UI

## 3. No random values
- Do not leave raw magic numbers in styles or layout logic
- Use descriptively named constants
- Reuse shared spacing, radius, and sizing values where possible

## 4. Keep layouts clean
- Prefer simple, balanced layouts
- Avoid cramped spacing
- Keep screens easy to scan
- Do not make the UI visually noisy

## 5. Forms must feel good on mobile
- Inputs should stay visible when the keyboard opens
- Scrollable forms should handle keyboard interaction properly
- Users should be able to dismiss the keyboard easily
- Primary actions should remain usable during text entry
- Numeric inputs should still provide a clear way to finish editing

## 6. States should look intentional
- Loading states should feel part of the screen
- Empty states should not look broken
- Error states should be clear and calm
- Do not leave blank areas without explanation

## 7. Text and labels
- Keep labels short and clear
- Use natural, human-sounding wording
- Prefer concise button text
- Avoid robotic or overly formal phrasing

## 8. Accessibility
- Keep tap targets comfortably large
- Maintain readable contrast
- Do not rely on colour alone for meaning
- Make interactive elements obviously interactive
- Add `accessibilityRole` to interactive elements
- Use natural labels that match the user action — prefer wording like "Done editing" over technical descriptions

## 9. Inline styling
- Avoid large inline style blocks unless the file already uses that pattern
- Prefer consistent styling structure
- Keep style code readable and organised

## 10. Final UI check
Before finishing, quickly check:
- Does this look like it belongs in the app?
- Is the spacing consistent?
- Is the screen easy to scan?
- Does the keyboard behaviour feel good?
- Are states and actions clear?