import { reactive } from 'vue'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  destructive: boolean
  resolve: ((v: boolean) => void) | null
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  destructive: false,
  resolve: null,
})

export function useConfirm() {
  function confirm(opts: { title: string; message: string; confirmLabel?: string; destructive?: boolean }): Promise<boolean> {
    return new Promise((resolve) => {
      state.title = opts.title
      state.message = opts.message
      state.confirmLabel = opts.confirmLabel ?? 'Confirm'
      state.destructive = opts.destructive ?? false
      state.resolve = resolve
      state.open = true
    })
  }

  function onConfirm() {
    state.open = false
    state.resolve?.(true)
    state.resolve = null
  }

  function onCancel() {
    state.open = false
    state.resolve?.(false)
    state.resolve = null
  }

  return { confirm, confirmState: state, onConfirm, onCancel }
}
