import { Renderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"
import { expect, spyOn, test } from "bun:test"

import * as client from "~/client"
import { createRenderApp } from "~/router"
import { appState } from "~/state/AppState"
import { setRenderer } from "~/state/RendererContext"
import { chatListManager } from "~/views/ChatListManager"
import {
  destroyConversationScrollBox,
  focusMessageInput,
  getConversationScrollTop,
  scrollConversation,
} from "~/views/ConversationView"

test("typing in a conversation preserves the draft across reactive renders", async () => {
  const typing = spyOn(client, "sendTypingState").mockResolvedValue(undefined)
  const baseline = Renderable.renderablesByNumber.size
  const { renderer, renderOnce, mockInput, resize } = await createTestRenderer({
    width: 144,
    height: 46,
  })
  setRenderer(renderer)
  appState.reset()
  appState.setCurrentSession("test")
  appState.setChats([
    { id: "test@c.us", name: "Test chat", picture: null, lastMessage: {}, _chat: {} },
  ])
  appState.setCurrentChat("test@c.us")
  appState.setCurrentView("conversation")
  appState.setHasMoreMessages("test@c.us", false)
  appState.setMessages(
    "test@c.us",
    Array.from({ length: 50 }, (_, index) => ({
      id: `message-${index}`,
      timestamp: 1_700_000_000 + index,
      fromMe: false,
      from: "test@c.us",
      body: `Synthetic message ${index}`,
      hasMedia: false,
      to: "me@c.us",
      mediaUrl: "",
      source: "app" as const,
      ack: 1,
      ackName: "SERVER" as const,
      _data: {},
    }))
  )
  const renderApp = createRenderApp(renderer)
  const unsubscribe = appState.subscribe(() => renderApp())
  try {
    renderApp()
    await renderOnce()
    focusMessageInput()
    const liveBefore = Renderable.renderablesByNumber.size
    const inputBefore = renderer.currentFocusedRenderable
    scrollConversation(-5)
    await renderOnce()
    const scrollBefore = getConversationScrollTop()
    expect(scrollBefore).toBeGreaterThan(0)
    // Background state updates still redraw the screen while the user is idle.
    for (let i = 0; i < 100; i++) {
      appState.setChatPresence(null)
      await renderOnce()
    }
    expect(Renderable.renderablesByNumber.size).toBe(liveBefore)
    expect(getConversationScrollTop()).toBe(scrollBefore)
    expect(renderer.currentFocusedRenderable).toBe(inputBefore)
    resize(120, 40)
    renderApp(true)
    await renderOnce()
    resize(144, 46)
    renderApp(true)
    await renderOnce()
    await mockInput.typeText("hello".repeat(60))
    await renderOnce()
    expect(appState.getState().messageInput).toBe("hello".repeat(60))
    expect(renderer.currentFocusedRenderable).toBe(inputBefore)
    expect(Renderable.renderablesByNumber.size).toBeLessThanOrEqual(liveBefore + 5)
    // Destroying a focused input on navigation must not re-enter rendering.
    appState.setCurrentView("settings")
    await renderOnce()
    appState.setCurrentView("conversation")
    await renderOnce()
    focusMessageInput()
    await mockInput.typeText("!")
    expect(appState.getState().messageInput).toBe("!" + "hello".repeat(60))
    expect(Renderable.renderablesByNumber.size).toBeLessThanOrEqual(liveBefore + 5)
  } finally {
    unsubscribe()
    destroyConversationScrollBox()
    chatListManager.destroy()
    renderer.destroy()
    appState.reset()
    typing.mockRestore()
  }
  expect(Renderable.renderablesByNumber.size).toBe(baseline)
}, 15_000)
