// Frame Atelier — Plausible custom events.
// Load AFTER the Plausible script tag. Call these at the matching moments in the app.
// (No cookies, no PII — event names only.)

function faTrack(name){ if (window.plausible) window.plausible(name); }

// Wire at these points:
//   App Opened        -> when the editor view mounts / "Open the app" resolves
//   Photo Chosen      -> after a file is selected and decoded
//   Chroma Run        -> when "Analyze My Colors" completes  <-- key conversion
//   Photo Saved       -> on successful Save Photo
//   Added To Home     -> on the PWA install / add-to-home-screen event
//
// Example:
//   analyzeButton.addEventListener('click', async () => {
//     await runChroma();
//     faTrack('Chroma Run');
//   });
