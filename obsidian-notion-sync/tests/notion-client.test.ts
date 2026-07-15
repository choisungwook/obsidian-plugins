import { describe, expect, it, vi } from "vitest";
import { chunkBlocks, markdownToBlocks, NotionBlock, RateLimiter } from "../src/notion-client";

describe("markdownToBlocks", () => {
  it("converts headings up to level 3", () => {
    const blocks = markdownToBlocks("# One\n## Two\n### Three");
    expect(blocks.map((b) => b.type)).toEqual(["heading_1", "heading_2", "heading_3"]);
  });

  it("converts lists and quotes", () => {
    const blocks = markdownToBlocks("- bullet\n1. numbered\n> quoted");
    expect(blocks.map((b) => b.type)).toEqual([
      "bulleted_list_item",
      "numbered_list_item",
      "quote",
    ]);
  });

  it("groups consecutive lines into one paragraph", () => {
    const blocks = markdownToBlocks("line one\nline two\n\nline three");
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("paragraph");
  });

  it("converts fenced code blocks with language", () => {
    const blocks = markdownToBlocks("```ts\nconst x = 1;\n```");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("code");
    expect((blocks[0] as any).code.language).toBe("ts");
    expect((blocks[0] as any).code.rich_text[0].text.content).toBe("const x = 1;");
  });

  it("closes an unterminated code fence at end of input", () => {
    const blocks = markdownToBlocks("```\nunfinished");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("code");
  });

  it("truncates rich text to the Notion limit", () => {
    const blocks = markdownToBlocks("x".repeat(3000));
    expect((blocks[0] as any).paragraph.rich_text[0].text.content).toHaveLength(2000);
  });
});

describe("chunkBlocks", () => {
  it("splits into chunks of at most 100 blocks", () => {
    const blocks = markdownToBlocks(Array.from({ length: 250 }, (_, i) => `- item ${i}`).join("\n"));
    const chunks = chunkBlocks(blocks as NotionBlock[]);
    expect(chunks.map((c) => c.length)).toEqual([100, 100, 50]);
  });
});

describe("RateLimiter", () => {
  it("spaces out consecutive calls by the configured interval", async () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter(334);
    const order: number[] = [];

    const run = Promise.all([
      limiter.wait().then(() => order.push(Date.now())),
      limiter.wait().then(() => order.push(Date.now())),
      limiter.wait().then(() => order.push(Date.now())),
    ]);

    await vi.runAllTimersAsync();
    await run;

    expect(order[1] - order[0]).toBeGreaterThanOrEqual(334);
    expect(order[2] - order[1]).toBeGreaterThanOrEqual(334);
    vi.useRealTimers();
  });
});
