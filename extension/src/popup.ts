import { APP_URL } from "./config.js";
import { getStoredAuth } from "./auth-storage.js";
import { fetchProjects, fetchSession, saveLink } from "./api-client.js";
import type { LinkStatus, Priority, StoredProject } from "./types.js";

/**
 * The popup's entire logic — no framework, matching the brief's "small,
 * maintainable extension" and this codebase's own "no over-engineering"
 * bias. Plain DOM: one `<section class="view">` per state, `showView` swaps
 * which one is visible.
 */

const VIEW_IDS = [
  "view-loading",
  "view-signed-out",
  "view-expired",
  "view-error",
  "view-save",
  "view-success",
  "view-duplicate",
] as const;
type ViewId = (typeof VIEW_IDS)[number];

function showView(id: ViewId) {
  for (const viewId of VIEW_IDS) {
    document.getElementById(viewId)!.hidden = viewId !== id;
  }
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

function openInNewTab(url: string) {
  chrome.tabs.create({ url });
}

function showError(message: string) {
  el<HTMLParagraphElement>("error-title").textContent = message;
  showView("view-error");
}

interface ActiveTabInfo {
  url: string;
  title: string;
  domain: string;
}

async function getActiveTabInfo(): Promise<ActiveTabInfo | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;

  let domain = tab.url;
  try {
    domain = new URL(tab.url).hostname.replace(/^www\./, "");
  } catch {
    // Leave `domain` as the raw url string — the page-preview UI will just
    // show it as-is rather than a parsed hostname.
  }

  return { url: tab.url, title: tab.title ?? tab.url, domain };
}

function populateProjects(select: HTMLSelectElement, projects: StoredProject[]) {
  for (const project of projects) {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    select.append(option);
  }
}

async function main() {
  showView("view-loading");

  const stored = await getStoredAuth();
  if (!stored) {
    showView("view-signed-out");
    el<HTMLButtonElement>("open-linkbrain").addEventListener("click", () => {
      openInNewTab(`${APP_URL}/extension`);
    });
    return;
  }

  const session = await fetchSession();
  if (!session.ok) {
    if (session.sessionExpired) {
      showView("view-expired");
      el<HTMLButtonElement>("sign-in-again").addEventListener("click", () => {
        openInNewTab(`${APP_URL}/extension`);
      });
    } else {
      showError(session.error);
    }
    return;
  }

  el<HTMLSpanElement>("user-email").textContent = session.data.email;
  el<HTMLSpanElement>("user-email").hidden = false;

  const tabInfo = await getActiveTabInfo();
  if (!tabInfo) {
    showError("Couldn't read the current tab.");
    return;
  }
  el<HTMLParagraphElement>("page-title").textContent = tabInfo.title;
  el<HTMLParagraphElement>("page-domain").textContent = tabInfo.domain;

  const projectSelect = el<HTMLSelectElement>("project-select");
  const projects = await fetchProjects();
  if (projects.ok) populateProjects(projectSelect, projects.data);

  const toggleAdvanced = el<HTMLButtonElement>("toggle-advanced");
  const advancedFields = el<HTMLDivElement>("advanced-fields");
  toggleAdvanced.addEventListener("click", () => {
    advancedFields.hidden = !advancedFields.hidden;
  });

  const saveErrorEl = el<HTMLParagraphElement>("save-error");
  const saveButton = el<HTMLButtonElement>("save-button");

  async function attemptSave(force: boolean) {
    saveButton.disabled = true;
    saveErrorEl.hidden = true;

    const result = await saveLink({
      url: tabInfo!.url,
      title: tabInfo!.title,
      personalNote: el<HTMLTextAreaElement>("note-input").value.trim() || undefined,
      projectId: projectSelect.value || null,
      status: el<HTMLSelectElement>("status-select").value as LinkStatus,
      priority: el<HTMLSelectElement>("priority-select").value as Priority,
      force,
    });

    saveButton.disabled = false;

    if (!result.ok) {
      if (result.sessionExpired) {
        showView("view-expired");
        el<HTMLButtonElement>("sign-in-again").addEventListener("click", () => {
          openInNewTab(`${APP_URL}/extension`);
        });
        return;
      }
      saveErrorEl.textContent = result.error;
      saveErrorEl.hidden = false;
      return;
    }

    const response = result.data;
    if (response.ok) {
      // AI enrichment (Phase 7) always happens backend-side, asynchronously
      // — the extension never calls OpenAI itself and never waits for it.
      el<HTMLParagraphElement>("success-title").textContent = response.aiEnabled
        ? "Saved — AI analysis in progress"
        : "Saved to LinkBrain";
      showView("view-success");
      el<HTMLButtonElement>("open-saved-link").onclick = () => openInNewTab(response.link.detailUrl);
      el<HTMLButtonElement>("save-another").onclick = () => showView("view-save");
      return;
    }

    if (response.duplicate && response.existingLink) {
      showView("view-duplicate");
      const existingLink = response.existingLink;
      el<HTMLButtonElement>("open-existing-link").onclick = () => openInNewTab(existingLink.detailUrl);
      el<HTMLButtonElement>("save-anyway").onclick = () => void attemptSave(true);
      return;
    }

    saveErrorEl.textContent = response.error;
    saveErrorEl.hidden = false;
  }

  saveButton.addEventListener("click", () => void attemptSave(false));
  showView("view-save");
}

document.addEventListener("DOMContentLoaded", () => {
  void main();
});
