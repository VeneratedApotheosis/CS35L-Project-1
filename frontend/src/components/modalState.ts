// The app opens native dialogs through Modal. Keep a count by element so
// notifications resume only after the last dialog has closed.
const openDialogs = new Set<HTMLDialogElement>()
const listeners = new Set<(open: boolean) => void>()

export function trackModal(dialog: HTMLDialogElement) {
  openDialogs.add(dialog)
  for (const listener of listeners) listener(true)
  return () => {
    if (!openDialogs.delete(dialog)) return
    if (openDialogs.size === 0) for (const listener of listeners) listener(false)
  }
}

export function subscribeModalState(listener: (open: boolean) => void) {
  listeners.add(listener)
  listener(openDialogs.size > 0)
  return () => { listeners.delete(listener) }
}
