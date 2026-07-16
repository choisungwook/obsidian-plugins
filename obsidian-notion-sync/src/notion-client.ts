import { requestUrl } from "obsidian";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const MAX_BLOCKS_PER_REQUEST = 100;
const MAX_RICH_TEXT_LENGTH = 2000;

export class RateLimiter {
  private nextAvailable = 0;

  constructor(private intervalMs: number) {}

  async wait(): Promise<void> {
    const now = Date.now();
    const scheduled = Math.max(now, this.nextAvailable);
    this.nextAvailable = scheduled + this.intervalMs;
    const delay = scheduled - now;
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export interface NotionBlock {
  object: "block";
  type: string;
  [key: string]: unknown;
}

function richText(text: string) {
  return [{ type: "text", text: { content: text.slice(0, MAX_RICH_TEXT_LENGTH) } }];
}

export function markdownToBlocks(markdown: string): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  const lines = markdown.split("\n");
  let paragraph: string[] = [];
  let codeLines: string[] | null = null;
  let codeLanguage = "plain text";

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: richText(paragraph.join("\n")) },
    });
    paragraph = [];
  };

  for (const line of lines) {
    if (codeLines !== null) {
      if (line.trimEnd() === "```") {
        blocks.push({
          object: "block",
          type: "code",
          code: { rich_text: richText(codeLines.join("\n")), language: codeLanguage },
        });
        codeLines = null;
      } else {
        codeLines.push(line);
      }
      continue;
    }

    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      flushParagraph();
      codeLines = [];
      codeLanguage = fence[1] || "plain text";
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const type = `heading_${level}`;
      blocks.push({
        object: "block",
        type,
        [type]: { rich_text: richText(heading[2]) },
      });
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: { rich_text: richText(bullet[1]) },
      });
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: { rich_text: richText(numbered[1]) },
      });
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push({
        object: "block",
        type: "quote",
        quote: { rich_text: richText(quote[1]) },
      });
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  if (codeLines !== null) {
    blocks.push({
      object: "block",
      type: "code",
      code: { rich_text: richText(codeLines.join("\n")), language: codeLanguage },
    });
  }
  flushParagraph();
  return blocks;
}

export function chunkBlocks(blocks: NotionBlock[]): NotionBlock[][] {
  const chunks: NotionBlock[][] = [];
  for (let i = 0; i < blocks.length; i += MAX_BLOCKS_PER_REQUEST) {
    chunks.push(blocks.slice(i, i + MAX_BLOCKS_PER_REQUEST));
  }
  return chunks;
}

export interface OAuthTokenResponse {
  access_token: string;
  workspace_name?: string;
}

export class NotionClient {
  private limiter: RateLimiter;

  constructor(private token: string, limiter?: RateLimiter) {
    this.limiter = limiter ?? new RateLimiter(334);
  }

  private async request(method: string, path: string, body?: unknown): Promise<any> {
    await this.limiter.wait();
    const response = await requestUrl({
      url: `${NOTION_API}${path}`,
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      throw: false,
    });
    if (response.status >= 400) {
      const message = response.json?.message ?? response.text;
      throw new Error(`Notion API ${response.status}: ${message}`);
    }
    return response.json;
  }

  async createPage(parentPageId: string, title: string, blocks: NotionBlock[]): Promise<string> {
    const chunks = chunkBlocks(blocks);
    const page = await this.request("POST", "/pages", {
      parent: { page_id: parentPageId },
      properties: {
        title: { title: [{ type: "text", text: { content: title } }] },
      },
      children: chunks[0] ?? [],
    });
    for (const chunk of chunks.slice(1)) {
      await this.request("PATCH", `/blocks/${page.id}/children`, { children: chunk });
    }
    return page.id;
  }

  async updatePage(pageId: string, title: string, blocks: NotionBlock[]): Promise<void> {
    await this.request("PATCH", `/pages/${pageId}`, {
      properties: {
        title: { title: [{ type: "text", text: { content: title } }] },
      },
    });
    await this.clearChildren(pageId);
    for (const chunk of chunkBlocks(blocks)) {
      await this.request("PATCH", `/blocks/${pageId}/children`, { children: chunk });
    }
  }

  async archivePage(pageId: string): Promise<void> {
    await this.request("PATCH", `/pages/${pageId}`, { archived: true });
  }

  private async clearChildren(pageId: string): Promise<void> {
    let cursor: string | undefined;
    const ids: string[] = [];
    do {
      const query = cursor
        ? `?start_cursor=${encodeURIComponent(cursor)}&page_size=100`
        : "?page_size=100";
      const result = await this.request("GET", `/blocks/${pageId}/children${query}`);
      for (const block of result.results ?? []) {
        ids.push(block.id);
      }
      cursor = result.has_more ? result.next_cursor : undefined;
    } while (cursor);
    for (const id of ids) {
      await this.request("DELETE", `/blocks/${id}`);
    }
  }
}

export async function exchangeOAuthCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<OAuthTokenResponse> {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await requestUrl({
    url: `${NOTION_API}/oauth/token`,
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    throw: false,
  });
  if (response.status >= 400) {
    const message = response.json?.error_description ?? response.json?.error ?? response.text;
    throw new Error(`OAuth token exchange failed (${response.status}): ${message}`);
  }
  return response.json;
}

export function buildAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
    state,
  });
  return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
}
