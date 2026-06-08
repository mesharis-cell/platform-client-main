"use client";

/**
 * editable-primitives — headless context + featherweight presentational pieces
 * for in-place inline editing (design doc §1.2 / §1.3).
 *
 * These carry ZERO card styling. They are "sprinkled" onto MAIN's existing cards
 * with no structural change so a NON-editing card stays pixel-identical to main:
 *   - <EditableEntityProvider> wraps the page region once; cards read the
 *     controller via useEditableSection(key, canEdit) instead of prop-drilling.
 *   - <EditAffordance> — header pencil → [X, Save] icon cluster. Renders null when
 *     the section isn't editable, so an un-editable card == main.
 *   - <SectionEditBar> — Cancel/Save footer, rendered ONLY while editing.
 *   - <CardEditSwap> — render-prop body swap: children (the card's existing read
 *     JSX) in view mode, the editor when the section is open.
 *   - <EditableField> — single-scalar inline (the job-number generalization).
 *
 * LIGHT MODE ONLY — no dark-mode-specific styling here.
 */

import React from "react";
import { Pencil, X, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
    EditableEntity,
    SectionBinding,
    ItemsBinding,
    SectionKey,
} from "@/hooks/use-editable-entity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Ctx = React.createContext<EditableEntity<any, any> | null>(null);

/** Wrap the page region once. Cards read the controller via useEditableSection. */
export function EditableEntityProvider<TDraft, TKey extends string>({
    controller,
    children,
}: {
    controller: EditableEntity<TDraft, TKey>;
    children: React.ReactNode;
}): React.JSX.Element {
    return <Ctx.Provider value={controller}>{children}</Ctx.Provider>;
}

/** Per-card accessor — returns the memo-stable binding for a section.
 *  Throws (dev) if no provider, so a card rendered outside the region fails loud. */
export function useEditableSection<TDraft>(
    key: SectionKey,
    canEdit: boolean
): SectionBinding<TDraft> {
    const c = React.useContext(Ctx);
    if (!c) throw new Error("useEditableSection must be used inside <EditableEntityProvider>");
    return c.bind(key, canEdit);
}

export function useEditableItems<TDraft>(): ItemsBinding<TDraft> {
    const c = React.useContext(Ctx);
    if (!c) throw new Error("useEditableItems must be used inside <EditableEntityProvider>");
    return c.items;
}

/** Header pencil → [X, Save] icon cluster. Drop into the card's EXISTING header
 *  row, right side.
 *
 *  `variant`:
 *  - "admin" (default) — icon-only ghost pencil (admin job-number affordance).
 *  - "client" — text ghost "Edit" button (the staging client read-card trigger).
 *  The EDITING state ([X, Save] icon cluster) is identical across variants — only
 *  the read-mode trigger differs. Renders null when not editable → card == main. */
export function EditAffordance<TDraft>({
    binding,
    variant = "admin",
}: {
    binding: SectionBinding<TDraft>;
    variant?: "client" | "admin";
}): React.JSX.Element | null {
    if (!binding.canEdit) return null; // not editable → null → card == main
    if (!binding.isEditing)
        return variant === "client" ? (
            <Button
                size="sm"
                variant="ghost"
                className="font-mono gap-2 text-xs"
                onClick={binding.open}
                data-testid={`edit-${binding.key}`}
            >
                <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
        ) : (
            <Button
                size="icon"
                variant="ghost"
                onClick={binding.open}
                data-testid={`edit-${binding.key}`}
            >
                <Pencil className="h-4 w-4" />
            </Button>
        );
    return (
        <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={binding.cancel} disabled={binding.saving}>
                <X className="h-4 w-4" />
            </Button>
            <Button
                size="icon"
                onClick={binding.save}
                disabled={binding.saving || !binding.canSave}
                data-testid={`save-${binding.key}`}
            >
                {binding.saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Save className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
}

/** Cancel/Save footer for multi-field editors. Rendered only while editing,
 *  inside the SAME card body, after the editor. Also surfaces blockedReason. */
export function SectionEditBar<TDraft>({
    binding,
    variant = "client",
}: {
    binding: SectionBinding<TDraft>;
    variant?: "client" | "admin";
}): React.JSX.Element | null {
    if (!binding.isEditing) return null;
    const footerCls =
        variant === "admin"
            ? "mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-4"
            : "mt-6 flex items-center justify-end gap-3";
    return (
        <>
            {binding.blockedReason && (
                <p className="mt-3 text-xs text-destructive font-mono">{binding.blockedReason}</p>
            )}
            <div className={footerCls}>
                <Button
                    variant="outline"
                    size="sm"
                    className="font-mono"
                    onClick={binding.cancel}
                    disabled={binding.saving}
                >
                    <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button
                    size="sm"
                    className="font-mono gap-2"
                    onClick={binding.save}
                    disabled={binding.saving || !binding.canSave}
                    data-testid={`save-${binding.key}`}
                >
                    <Save className="w-4 h-4" /> {binding.saving ? "Saving..." : "Save"}
                </Button>
            </div>
        </>
    );
}

/** Render-prop body swap. children = the card's CURRENT read JSX, untouched.
 *  editor = the existing controlled editor bound to the draft. */
export function CardEditSwap<TDraft>({
    binding,
    editor,
    footerVariant,
    children,
}: {
    binding: SectionBinding<TDraft>;
    editor: (b: SectionBinding<TDraft>) => React.ReactNode;
    footerVariant?: "client" | "admin";
    children: React.ReactNode;
}): React.JSX.Element {
    if (!binding.isEditing) return <>{children}</>;
    return (
        <>
            {editor(binding)}
            <SectionEditBar binding={binding} variant={footerVariant} />
        </>
    );
}

/** Single-value convenience (the job-number generalization, §1.3). For cards that
 *  edit exactly one scalar and don't warrant a multi-field editor. */
export function EditableField<TDraft>({
    binding,
    view,
    input,
    variant = "admin",
}: {
    binding: SectionBinding<TDraft>;
    view: React.ReactNode; // the static value display
    input: (b: SectionBinding<TDraft>) => React.ReactNode; // an <Input/> bound to draft
    variant?: "client" | "admin";
}): React.JSX.Element {
    return (
        <div className="flex items-center justify-between gap-4">
            <div className="flex-1">{binding.isEditing ? input(binding) : view}</div>
            <EditAffordance binding={binding} variant={variant} />
        </div>
    );
}
