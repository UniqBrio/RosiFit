/**
 * requests/2026-09-08-member-delete-confirm-yes-no.md
 *
 * WHICH OF A CONFIRMATION'S TWO BUTTONS IS THE FILLED ONE.
 *
 * `ConfirmDialog` drew the confirm button filled in the accent and the cancel
 * button as an outline, always -- so a dialog asking "send this to 42 people?"
 * and a dialog asking "delete her and every attendance record she has?" put
 * the emphasis in exactly the same place. On the second kind that is the wrong
 * place: the filled button is the one a thumb finds first, and the answer it
 * finds cannot be undone from the app.
 *
 * So a destructive confirmation inverts it -- the SAFE answer is the filled
 * one, the destructive answer is an outline lettered in the danger ink. Asked
 * for in those terms by the repo owner on 08-Sep-2026: "highlight no with dark
 * background".
 *
 * WHY THIS IS A FUNCTION AND NOT TWO TERNARIES IN THE RENDER BODY: it is the
 * one thing about the change that can silently invert. A ternary that gets
 * flipped while somebody is tidying the styles beside it would fill the delete
 * button and outline the keep button -- a dialog that still says the right
 * words and points at the wrong answer, which no source-matching spec would
 * notice and no typecheck would fail. Here it is asserted under node, both
 * directions, in confirmEmphasis.test.ts.
 */

/** Which answer the dialog puts its weight behind. */
export type ConfirmEmphasis =
  /** the default, and every non-destructive dialog: the confirm button */
  | 'confirm'
  /** a destructive dialog: the cancel button, the one that changes nothing */
  | 'cancel';

/** How one of the two buttons is painted. Mapped to tokens in Sheet.tsx. */
export type ConfirmButtonStyle =
  /** filled in the accent -- the app's ordinary primary button */
  | 'accent'
  /** filled in `safeFill`, bordered so the fill has a drawn edge in both themes */
  | 'safe'
  /** unfilled, `fgStrong` label -- the app's ordinary secondary button */
  | 'outline'
  /** unfilled, `danger` label: available, and not competing for the thumb */
  | 'outline-danger';

/**
 * The pair, decided in one place. Exactly one of the two is ever filled --
 * two filled buttons is a dialog with no recommended answer, and none is a
 * dialog with no shape.
 */
export function confirmButtonStyles(emphasis: ConfirmEmphasis):
  { cancel: ConfirmButtonStyle; confirm: ConfirmButtonStyle } {
  return emphasis === 'cancel'
    ? { cancel: 'safe', confirm: 'outline-danger' }
    : { cancel: 'outline', confirm: 'accent' };
}

/** True for the two styles that paint a fill behind their label. */
export function isFilled(style: ConfirmButtonStyle): boolean {
  return style === 'accent' || style === 'safe';
}
