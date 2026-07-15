import { vi } from "vitest";

export const requestUrl = vi.fn();

export class Notice {
  constructor(public message?: string, public timeout?: number) {}
  setMessage(message: string): void {
    this.message = message;
  }
  hide(): void {}
}

export class Plugin {}
export class PluginSettingTab {}
export class Setting {}
export class TFile {}
export class Vault {}
export class App {}
