"use client";

import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PRIORITY_OPTIONS } from "@/lib/domain/priority";
import { STATUS_OPTIONS } from "@/lib/domain/status";
import type { LinkStatus, Priority, Project } from "@/lib/domain/types";

/**
 * The form body shared by Add Link and Edit Link.
 *
 * Pulled out on its own because the two dialogs differ only in framing (title,
 * submit label, and where the initial values come from) — the fields
 * themselves, and their order, should never drift apart.
 */
export interface LinkFormValues {
  url: string;
  title: string;
  description: string;
  note: string;
  tagsInput: string;
  status: LinkStatus;
  priority: Priority;
  projectId: string;
}

export interface LinkFormFieldsProps {
  values: LinkFormValues;
  onChange: (patch: Partial<LinkFormValues>) => void;
  projects: Project[];
  /** Whether the URL field is editable; disabled while editing an existing link. */
  urlEditable?: boolean;
  urlError?: string;
}

export function LinkFormFields({
  values,
  onChange,
  projects,
  urlEditable = true,
  urlError,
}: LinkFormFieldsProps) {
  return (
    <div className="space-y-4">
      <Field label="URL" hint={urlError}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            type="url"
            inputMode="url"
            placeholder="https://example.com/article"
            value={values.url}
            disabled={!urlEditable}
            onChange={(event) => onChange({ url: event.target.value })}
            aria-invalid={Boolean(urlError)}
          />
        )}
      </Field>

      <Field label="Title">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            placeholder="Leave blank to generate from the URL"
            value={values.title}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        )}
      </Field>

      <Field label="Description">
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            placeholder="What is this link about?"
            value={values.description}
            onChange={(event) => onChange({ description: event.target.value })}
          />
        )}
      </Field>

      <Field label="Personal note" hint="Only visible to you.">
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            rows={2}
            placeholder="Why you saved it, or what to remember"
            value={values.note}
            onChange={(event) => onChange({ note: event.target.value })}
          />
        )}
      </Field>

      <Field label="Tags" hint="Comma-separated, e.g. AWS, DynamoDB">
        {(fieldProps) => (
          <Input
            {...fieldProps}
            placeholder="AWS, DynamoDB"
            value={values.tagsInput}
            onChange={(event) => onChange({ tagsInput: event.target.value })}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={values.status}
              onChange={(event) =>
                onChange({ status: event.target.value as LinkStatus })
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label="Priority">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              value={values.priority}
              onChange={(event) =>
                onChange({ priority: event.target.value as Priority })
              }
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <Field label="Project">
        {(fieldProps) => (
          <Select
            {...fieldProps}
            value={values.projectId}
            onChange={(event) => onChange({ projectId: event.target.value })}
          >
            <option value="">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </div>
  );
}

export const EMPTY_LINK_FORM_VALUES: LinkFormValues = {
  url: "",
  title: "",
  description: "",
  note: "",
  tagsInput: "",
  status: "saved",
  priority: "useful",
  projectId: "",
};
