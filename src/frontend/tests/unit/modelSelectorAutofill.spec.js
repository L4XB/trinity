// @vitest-environment jsdom
/**
 * #2796 — the model picker must not read as a login field.
 *
 * `ModelSelector.vue` is a bare `<input type="text">` with no `name` and no
 * `autocomplete`. On an origin where the operator saved the Admin Login
 * (username fixed as `admin`), a password manager's heuristic fill can put
 * `admin` into it; `ChatPanel.vue` then persists that to
 * `localStorage.trinity_chat_model` and sends it as `model` on every message
 * until the box is retyped. Reported on a live instance: four failed runs
 * across two episodes, `model_used='admin'`.
 *
 * The rendered attributes are the whole fix, so this file MOUNTS the component
 * (the per-file jsdom opt-in `vitest.config.js` describes, first used by
 * `portalThemeSwitch.spec.js`) rather than scanning the SFC — a regex over the
 * source cannot tell an attribute that renders from one in a comment.
 *
 * What it does NOT prove: that a given password manager honours these. That is
 * a human check in a browser with the extension installed.
 */
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ModelSelector from '../../src/components/ModelSelector.vue'

const field = (props = {}) => mount(ModelSelector, { props }).get('input')

describe('the model picker opts out of credential autofill (#2796)', () => {
  it('names the field, and not with a credential name', () => {
    const name = field().attributes('name')
    expect(name).toBeTruthy()
    expect(name).not.toMatch(/user|login|email|account/i)
  })

  it('declares autocomplete off', () => {
    expect(field().attributes('autocomplete')).toBe('off')
  })

  // `autocomplete="off"` alone is advisory — Chrome and the managers below
  // each document their own opt-out, and the instance in #2796 runs LastPass.
  it.each([
    ['data-lpignore', 'true'],     // LastPass
    ['data-1p-ignore', ''],        // 1Password
    ['data-bwignore', ''],         // Bitwarden
    ['data-form-type', 'other'],   // Dashlane
  ])('carries the %s opt-out', (attr, value) => {
    expect(field().attributes(attr)).toBe(value)
  })

  it('opts out on every surface the picker is used on, not just the Chat tab', () => {
    // Chat/Loops/Schedules/Tasks differ only by props (#2086 keeps one picker).
    for (const props of [{}, { compact: true }, { label: 'Model' }, { placeholder: 'Agent default' }]) {
      expect(field(props).attributes('autocomplete')).toBe('off')
      expect(field(props).attributes('data-lpignore')).toBe('true')
    }
  })

  it('still passes free text through unchanged', async () => {
    // The deliberate passthrough documented at ModelSelector.vue's PRESET_MODELS
    // comment (#2086): a typed id the picker does not list is still accepted.
    const w = mount(ModelSelector)
    await w.get('input').setValue('claude-sonnet-4-6[1m]')
    expect(w.emitted('update:modelValue').at(-1)).toEqual(['claude-sonnet-4-6[1m]'])
  })
})
