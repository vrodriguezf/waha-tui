import { Renderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"
import { expect, test } from "bun:test"

import { DialogContainerRenderable } from "~/components/ui/dialog"
import { ToasterRenderable } from "~/components/ui/toast"
import { createRenderApp } from "~/router"
import { appState } from "~/state/AppState"
import { setRenderer } from "~/state/RendererContext"

test("full redraws release old screens, retain overlays, and defer nested renders", async () => {
  const baseline = Renderable.renderablesByNumber.size
  const { renderer, renderOnce } = await createTestRenderer({ width: 100, height: 35 })
  setRenderer(renderer)
  appState.reset()
  appState.setCurrentView("chats")
  const renderApp = createRenderApp(renderer)
  try {
    renderApp(true)
    await renderOnce()
    const liveBefore = Renderable.renderablesByNumber.size
    const overlays = renderer.root
      .getChildren()
      .filter(
        (child) => child instanceof ToasterRenderable || child instanceof DialogContainerRenderable
      )
    expect(overlays).toHaveLength(2)
    for (let i = 0; i < 100; i++) {
      const oldScreen = renderer.root.getChildren().find((child) => !overlays.includes(child))!
      let destroyed = 0
      oldScreen.on("destroyed", () => {
        destroyed++
        renderApp(true)
      })
      renderApp(true)
      await renderOnce()
      expect(destroyed).toBe(1)
      expect(oldScreen.isDestroyed).toBe(true)
      expect(Renderable.renderablesByNumber.size).toBe(liveBefore)
      for (const overlay of overlays) {
        expect(overlay.isDestroyed).toBe(false)
        expect(overlay.parent).toBe(renderer.root)
      }
    }
  } finally {
    renderer.destroy()
    appState.reset()
  }
  expect(Renderable.renderablesByNumber.size).toBe(baseline)
})
