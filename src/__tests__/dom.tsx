import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { vi } from "vitest";
export function dom() {
  const container = document.createElement("div");
  document.body.append(container);
  let root: Root | undefined;
  return {
    container,
    async render(element: ReactNode) {
      root ??= createRoot(container);
      await act(async () => { root?.render(element); });
    },
    async unmount() { await act(async () => root?.unmount()); root = undefined; container.remove(); },
  };
}
export async function type(input: HTMLInputElement, value: string) {
  await act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
export async function key(input: HTMLInputElement, value: string) {
  await act(async () => { input.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true })); });
}
export async function click(element: Element | null) {
  if (!element) throw new Error("Missing clickable element");
  await act(async () => { element.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}
export async function tick(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
