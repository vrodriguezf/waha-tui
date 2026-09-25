import { InputRenderable, Renderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"
import { expect, test } from "bun:test"

import { EmojiPicker } from "~/components/EmojiPicker"
import { appState } from "~/state/AppState"
import { setRenderer } from "~/state/RendererContext"

test("emoji searches release replaced grids and category tabs", async () => {
  const baseline = Renderable.renderablesByNumber.size
  const { renderer, renderOnce } = await createTestRenderer({ width: 100, height: 35 })
  setRenderer(renderer)
  appState.reset()
  appState.setEmojiPicker({ visible: true })
  try {
    const picker = EmojiPicker()!
    renderer.root.add(picker)
    await renderOnce()
    const input = picker.getChildren()[0].getChildren()[0] as InputRenderable
    expect(input).toBeInstanceOf(InputRenderable)
    const liveBefore = Renderable.renderablesByNumber.size
    for (let i = 0; i < 20; i++) {
      input.value = "smile"
      input.value = ""
      await renderOnce()
      expect(Renderable.renderablesByNumber.size).toBe(liveBefore)
    }
  } finally {
    renderer.destroy()
    appState.reset()
  }
  expect(Renderable.renderablesByNumber.size).toBe(baseline)
})
