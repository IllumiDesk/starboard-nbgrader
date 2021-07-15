import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

import { StarboardEmbed } from "starboard-wrap";
import { StarboardNotebookIFrameOptions } from "starboard-wrap/dist/embed";
import { convertStarboardStringToJupyterString, convertJupyterStringToStarboardString } from "jupystar";
import { prependPluginLoaderMetadata, preprocessGraderCellsForJupystar, upgradeNBGraderCells } from "../format/converter";
import { GraderPluginMode } from "../plugin/state";

export interface GraderNotebookWrapOptions {
  embedOptions: Partial<StarboardNotebookIFrameOptions>;
  pluginOptions: {
    /**
     * URL to starboard-grader plugin
     */
    pluginUrl: string;
    jupyterBaseUrl: string;
    mode: GraderPluginMode;
  };
}

export function convertStarboardGraderNotebookContentToIpynb(notebookContent: string): string {
  return convertStarboardStringToJupyterString(preprocessGraderCellsForJupystar(notebookContent));
}

@customElement("grader-wrap")
export class GraderNotebookWrap extends LitElement {
  private currentIpynbContent: string;
  private opts: GraderNotebookWrapOptions;

  createRenderRoot() {
    return this;
  }

  private embed?: StarboardEmbed;

  constructor(opts: GraderNotebookWrapOptions) {
    super();
    this.opts = opts;
    this.currentIpynbContent = "";

    const originalContentUpdateMessageCallback = this.opts.embedOptions.onContentUpdateMessage || function () {};
    // We wrap the content update message callback so that we can keep `this.currentIpynbContent` in sync.
    this.opts.embedOptions.onContentUpdateMessage = (payload) => {
      this.currentIpynbContent = this.convertToIpynb(payload.content);
      originalContentUpdateMessageCallback(payload);
    };
  }

  public setIpynbContent(ipynbString: string) {
    this.currentIpynbContent = upgradeNBGraderCells(convertJupyterStringToStarboardString(ipynbString)) as string;
    this.opts.embedOptions.notebookContent = prependPluginLoaderMetadata(this.currentIpynbContent, this.opts.pluginOptions);
    this.createEmbed();
  }

  private convertToIpynb(notebookContent: string) {
    return convertStarboardGraderNotebookContentToIpynb(notebookContent);
  }

  public downloadIpynbFile(filename: string) {
    if (!this.embed) {
      throw new Error("No embed is currently visible, can not download content file");
    }
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(this.currentIpynbContent));
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // Create or re-create if already exists.
  public createEmbed() {
    if (this.embed) {
      this.embed.dispose();
      this.embed.remove();
    }
    this.embed = new StarboardEmbed(this.opts.embedOptions);
    this.appendChild(this.embed);
  }

  public render() {
    return html``;
  }
}
