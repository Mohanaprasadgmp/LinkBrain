/**
 * The one place this extension's build-specific configuration lives.
 *
 * There's no build-time env injection here (no bundler, on purpose — see
 * `extension/README.md`), so switching to a deployed LinkBrain instance is a
 * one-line edit before packaging, not a runtime setting: keeping the popup's
 * settings surface minimal (per the Phase 6 brief) means this isn't exposed
 * as an in-popup preference.
 */
export const APP_URL = "http://localhost:3000";
