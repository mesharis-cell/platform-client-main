"use client";

/**
 * useEditableEntity — entity-agnostic in-place inline-edit CONTROLLER.
 *
 * The body is the OrderDetailEdit controller (draft / baseline / single-open /
 * diffPayload / save-gate / saveSection / open / cancel) lifted VERBATIM and
 * generalized over a config object (design doc §1.1 / §5). It OWNS the live draft
 * and exposes it so the feasibility / availability companion hooks can read it
 * AFTER construction and feed their verdicts back via `setWiring` — the inverted
 * data-flow from §1.1 that closes the circular dependency (the wiring depends on
 * the controller's own draft, so it cannot be a construction input).
 *
 * Preserved behavior (byte-identical to the monolith):
 *   - One shared working `Draft`, reseeded from baseline on open/cancel — the
 *     SINGLE-OPEN invariant. Because the rest of the draft equals baseline, the
 *     per-section `diffPayload` naturally carries only that section's keys.
 *   - `payload = diffPayload(baseline, draft, diffCtx)` (diffCtx =
 *     order.venue_location for orders).
 *   - Permit save-gate: only blocks when the payload actually carries
 *     permit_requirements (the save-gate fix), folded through `permitGuard`.
 *   - Feasibility block from `setWiring({ feasibility })` (absent → not blocking).
 *   - `EDIT_ERROR_CODES` / 409 / 400 → inline band error.
 *   - QUOTE_REVISED (`status_reverted`) toast.
 *   - Items live in the SAME shared draft and are NOT a SECTION_KEYS member:
 *       1. openSection() reseeds the whole draft from baseline → opening (or
 *          canceling) ANY single-open section DISCARDS in-progress staged item
 *          edits. Items + an open section cannot both hold unsaved changes.
 *       2. saveSection('items') emits the WHOLE payload and is gated by the same
 *          permit / feasibility conditions (shared gate coupling is real; the
 *          single-open reseed keeps the non-items diff clean in practice).
 *       3. Items save does NOT close (`if (key !== "items") setOpen(null)`) —
 *          items stay inline-editable after saving.
 *     This is ACCEPTED, DOCUMENTED current behavior, lifted verbatim. Giving
 *     items their own independent sub-draft is a behavior change, out of scope.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

/** A section key is a string; the per-entity SECTION_KEYS map defines which exist. */
export type SectionKey = string;

export interface EditSaveResult {
    changed_fields?: { field: string; old: unknown; new: unknown }[] | string[];
    status?: string;
    financial_status?: string;
    status_reverted?: boolean; // server reverted QUOTED → PRICING_REVIEW
}

/** Cross-cutting verdicts the controller RECEIVES BACK via `setWiring` after the
 *  companion hooks read `controller.draft` (see the data-flow note above). The hook
 *  never computes them; it only stores+reads them. Order pushes both; SP pushes only
 *  availability; inbound/SR push neither — absent wiring defaults the gate to "not
 *  blocking" and qty to "unbounded". These are OUTPUTS fed back, NOT config inputs. */
export interface FeasibilityWiring {
    userDateFeasible: boolean | null; // interpretFeasibilityPreview verdict
    blocks: boolean; // userDateFeasible === false
    helperProps?: unknown; // for <FeasibilityHelper>/<RedFeasibilityAlert>
    minDate?: string; // checkout calculateMinDate lead-time floor
}

export interface AvailabilityWiring {
    maxByItemId: Record<string, number>; // existing rows: available + own booked
    maxByAssetId: Record<string, number>; // staged adds: available
}

export interface EditableEntityConfig<TEntity, TDraft, TPayload, TKey extends string, TDiffCtx> {
    entity: TEntity; // order / self_pickup snapshot
    entityUuid: string; // route id for the mutation hook
    buildDraft: (e: TEntity) => TDraft; // EXISTING fn, verbatim
    /** EXISTING fn, lifted VERBATIM. The 3rd arg is the entity-supplied extra the
     *  existing fn already takes — for orders that is `order.venue_location`
     *  (NOT the whole entity). The controller forwards `diffCtx` here so the lift
     *  stays byte-identical. */
    diffPayload: (baseline: TDraft, next: TDraft, ctx: TDiffCtx) => TPayload; // EXISTING fn
    diffCtx: TDiffCtx; // order → entity.venue_location; SP → its equiv
    sectionKeys: Record<TKey, (keyof TPayload)[]>; // EXISTING SECTION_KEYS, verbatim
    /** Mutation hook result: useUpdateOrderDetails / useUpdateSelfPickupDetails / admin twins. */
    update: { mutateAsync: (p: TPayload) => Promise<EditSaveResult>; isPending: boolean };
    /** Permit save-gate predicate (verbatim from staging). Returns reason or null.
     *  MUST stay gated on the key being in the payload, never on raw draft state. */
    permitGuard?: (payload: TPayload, draft: TDraft) => string | null;
    // NOTE: feasibility/availability are NOT config fields — they flow back in via
    // controller.setWiring() AFTER construction (see the data-flow note above).
    editErrorCodes: Set<string>; // EDIT_ERROR_CODES
    onReverted?: (changedCount: number) => void; // QUOTE_REVISED toast copy
    onSaved?: (r: EditSaveResult) => void; // extra side-effects (rare)
}

/** Per-card binding the primitives consume. One per section key. Memo-stable. */
export interface SectionBinding<TDraft> {
    key: SectionKey;
    canEdit: boolean; // parent-computed: band && permission && flag
    isEditing: boolean; // this section is the single open one
    saving: boolean;
    canSave: boolean; // sectionKeys[key].some(k => k in payload) && !blocked
    blockedReason: string | null; // permit/feasibility block; surfaced inline
    open: () => void; // reseeds draft from baseline, sets open = key
    cancel: () => void; // reseeds draft, open = null
    save: () => void; // guards → mutateAsync(diff) → toast → close
    draft: TDraft; // live draft (editor `value`)
    patch: (next: Partial<TDraft> | ((d: TDraft) => TDraft)) => void; // editor onChange
}

/** Items are ALWAYS inline (never part of the single-open set) — its own binding. */
export interface ItemsBinding<TDraft> {
    draft: TDraft;
    patch: SectionBinding<TDraft>["patch"];
    maxByItemId?: Record<string, number>;
    maxByAssetId?: Record<string, number>;
    canSave: boolean;
    saving: boolean;
    save: () => void;
}

export interface EditableEntity<TDraft, TKey extends string> {
    /** The LIVE draft the controller owns. Companion hooks (feasibility/availability)
     *  read THIS after construction — it is the input to their derivations. */
    draft: TDraft;
    /** Feed verdicts BACK in after companions read `draft`. Closes the circular dep:
     *  the controller can't take these at construction because they depend on its own
     *  draft. Stored in ref-backed state; read by blockedReason() + items.maxBy*. */
    setWiring: (w: {
        feasibility?: FeasibilityWiring | null;
        availability?: AvailabilityWiring | null;
    }) => void;
    bandError: string | null; // top-of-region inline alert (cross-section)
    anyOpen: boolean; // for "discard?" nav guards
    bind: (key: TKey, canEdit: boolean) => SectionBinding<TDraft>; // pass per card
    items: ItemsBinding<TDraft>;
}

export function useEditableEntity<TEntity, TDraft, TPayload, TKey extends string, TDiffCtx>(
    cfg: EditableEntityConfig<TEntity, TDraft, TPayload, TKey, TDiffCtx>
): EditableEntity<TDraft, TKey> {
    const { entity, buildDraft, diffPayload, diffCtx, sectionKeys, update, permitGuard } = cfg;

    // Shared working draft + baseline snapshot (memoised on entity identity so an
    // external refetch reseeds the baseline once a section collapses).
    const baseline = useMemo(() => buildDraft(entity), [entity, buildDraft]);
    const [draft, setDraft] = useState<TDraft>(baseline);

    // Only one section is open at a time. Items are ALWAYS inline (never in this
    // set). When `open` flips, we reseed the draft from the entity baseline so a
    // section opens clean and the diff only ever carries that section's changes.
    const [open, setOpen] = useState<TKey | null>(null);
    const [bandError, setBandError] = useState<string | null>(null);

    // Cross-cutting verdicts fed back AFTER construction (the inverted data-flow,
    // §1.1). Stored in state so a wiring change re-renders the bindings.
    const [wiring, setWiringState] = useState<{
        feasibility?: FeasibilityWiring | null;
        availability?: AvailabilityWiring | null;
    }>({});

    const setWiring = useCallback(
        (w: {
            feasibility?: FeasibilityWiring | null;
            availability?: AvailabilityWiring | null;
        }) => {
            setWiringState((prev) => {
                const nextFeas = "feasibility" in w ? w.feasibility : prev.feasibility;
                const nextAvail = "availability" in w ? w.availability : prev.availability;
                // Avoid an update loop: only commit when something actually changed.
                if (
                    sameFeasibility(prev.feasibility, nextFeas) &&
                    sameAvailability(prev.availability, nextAvail)
                ) {
                    return prev;
                }
                return { feasibility: nextFeas, availability: nextAvail };
            });
        },
        []
    );

    const payload = useMemo(
        () => diffPayload(baseline, draft, diffCtx),
        [baseline, draft, diffCtx, diffPayload]
    );

    // ---- open / cancel / save plumbing (verbatim from OrderDetailEdit) ----

    const openSection = useCallback(
        (key: TKey) => {
            setDraft(buildDraft(entity));
            setBandError(null);
            setOpen(key);
        },
        [buildDraft, entity]
    );

    const cancelSection = useCallback(() => {
        setOpen(null);
        setBandError(null);
        setDraft(buildDraft(entity));
    }, [buildDraft, entity]);

    // Mirror checkout's hard rule (via permitGuard): a required permit with
    // UNKNOWN owner is ambiguous and must be resolved before saving — but ONLY
    // when the payload actually carries permit_requirements (the save-gate fix).
    const permitReason = permitGuard ? permitGuard(payload, draft) : null;

    // Block save when the edited dates/items aren't feasible (checkout's Next
    // gate), per the feasibility wiring fed back after construction.
    const feasibilityBlocks = wiring.feasibility?.blocks === true;

    const hasChanges = Object.keys(payload as Record<string, unknown>).length > 0;

    // blockedReason(key): folds the permit guard + feasibility block. The permit
    // reason only surfaces while the payload carries permit_requirements (the
    // permitGuard already enforces that), so it's safe to fold for every section.
    const blockedReason = useCallback(
        (_key: TKey): string | null => {
            if (permitReason) return permitReason;
            if (feasibilityBlocks)
                return "This event date is too soon for the selected items. Pick a later date.";
            return null;
        },
        [permitReason, feasibilityBlocks]
    );

    const saveSection = useCallback(
        async (section: TKey | "items") => {
            if (!hasChanges) {
                toast.info("No changes to save.");
                return;
            }
            if (permitReason) {
                setBandError(permitReason);
                toast.error(permitReason);
                return;
            }
            if (feasibilityBlocks) {
                const msg =
                    "This event date is too soon for the selected items. Pick a later date.";
                setBandError(msg);
                toast.error(msg);
                return;
            }
            setBandError(null);
            try {
                const result = await update.mutateAsync(payload);
                const count =
                    result?.changed_fields?.length ?? Object.keys(payload as object).length;
                if (result?.status_reverted) {
                    if (cfg.onReverted) cfg.onReverted(count);
                    else
                        toast.success(
                            `Saved ${count} change${count === 1 ? "" : "s"}. The quote was withdrawn for re-review.`
                        );
                } else {
                    toast.success(`Saved ${count} change${count === 1 ? "" : "s"}.`);
                }
                cfg.onSaved?.(result);
                if (section !== "items") setOpen(null);
            } catch (error) {
                const e = error as Error & { code?: string; status?: number };
                const message = e?.message || "Failed to save changes";
                if (
                    cfg.editErrorCodes.has(e?.code ?? "") ||
                    e?.status === 409 ||
                    e?.status === 400
                ) {
                    setBandError(message);
                }
                toast.error(message);
            }
        },
        [hasChanges, permitReason, feasibilityBlocks, update, payload, cfg]
    );

    const saving = update.isPending;

    // The editor onChange contract: accept a partial OR an updater fn.
    const patch = useCallback((next: Partial<TDraft> | ((d: TDraft) => TDraft)) => {
        setDraft((prev) =>
            typeof next === "function"
                ? (next as (d: TDraft) => TDraft)(prev)
                : { ...prev, ...(next as Partial<TDraft>) }
        );
    }, []);

    // ---- per-section binding accessor ----

    const bind = useCallback(
        (key: TKey, canEdit: boolean): SectionBinding<TDraft> => {
            const keys = sectionKeys[key] ?? [];
            const inPayload = keys.some((k) => k in (payload as object));
            const reason = blockedReason(key);
            return {
                key,
                canEdit,
                isEditing: open === key,
                saving,
                canSave: inPayload && !reason,
                blockedReason: reason,
                open: () => openSection(key),
                cancel: cancelSection,
                save: () => void saveSection(key),
                draft,
                patch,
            };
        },
        [
            sectionKeys,
            payload,
            blockedReason,
            open,
            saving,
            openSection,
            cancelSection,
            saveSection,
            draft,
            patch,
        ]
    );

    // ---- always-inline items binding ----

    const itemsCanSave = "items" in (payload as object);
    const items: ItemsBinding<TDraft> = useMemo(
        () => ({
            draft,
            patch,
            maxByItemId: wiring.availability?.maxByItemId,
            maxByAssetId: wiring.availability?.maxByAssetId,
            canSave: itemsCanSave,
            saving,
            save: () => void saveSection("items"),
        }),
        [draft, patch, wiring.availability, itemsCanSave, saving, saveSection]
    );

    // ref kept so callers can read the latest draft imperatively if needed (e.g.
    // nav guards) without re-subscribing.
    const draftRef = useRef(draft);
    draftRef.current = draft;

    return {
        draft,
        setWiring,
        bandError,
        anyOpen: open !== null,
        bind,
        items,
    };
}

// ---- shallow equality helpers for the wiring update guard ----

function sameFeasibility(
    a: FeasibilityWiring | null | undefined,
    b: FeasibilityWiring | null | undefined
): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        a.userDateFeasible === b.userDateFeasible &&
        a.blocks === b.blocks &&
        a.minDate === b.minDate &&
        sameHelperProps(a.helperProps, b.helperProps)
    );
}

/** Compare `helperProps` by VALUE, not reference. The feasibility companion now
 *  memoizes its return, but the wiring guard must not depend on the caller doing
 *  so — a reference-only check here was the root of the order-edit infinite update
 *  loop (React #185): the companion's helperProps was a fresh literal every render,
 *  so this guard always reported "changed" and `setWiringState` committed on every
 *  render, re-running the page's setWiring effect forever. Scalars are ===; the
 *  array/object fields (blockingItems, issues, config) come from react-query data
 *  with structural sharing, so reference equality there is a sound value signal. */
function sameHelperProps(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
    const x = a as Record<string, unknown>;
    const y = b as Record<string, unknown>;
    // Scalar fields: strict equality.
    const scalarKeys: string[] = [
        "helperEnabled",
        "isLoading",
        "floorDate",
        "floorDatetime",
        "userEventDate",
        "userDateFeasible",
        "config",
        "hasChecked",
        "isChecking",
        "floorDatetimeForUseDate",
        "timezone",
    ];
    for (const k of scalarKeys) {
        if (x[k] !== y[k]) return false;
    }
    // Array fields (blockingItems, issues): compare by CONTENT, not reference.
    // `interpretFeasibilityPreview` returns a fresh `.filter()` array for
    // blockingItems on every call when the user has picked a date, but the element
    // objects come from react-query data (structurally shared), so element identity
    // is a sound value signal even when the wrapper array is new each render.
    if (!sameArrayByIdentity(x.blockingItems, y.blockingItems)) return false;
    if (!sameArrayByIdentity(x.issues, y.issues)) return false;
    return true;
}

function sameArrayByIdentity(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function sameAvailability(
    a: AvailabilityWiring | null | undefined,
    b: AvailabilityWiring | null | undefined
): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return sameRecord(a.maxByItemId, b.maxByItemId) && sameRecord(a.maxByAssetId, b.maxByAssetId);
}

function sameRecord(a: Record<string, number>, b: Record<string, number>): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (const k of ak) {
        if (a[k] !== b[k]) return false;
    }
    return true;
}
