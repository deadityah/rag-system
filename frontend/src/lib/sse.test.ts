import { describe, it } from "node:test";
import assert from "node:assert";
import { SSEParser, type RawSSEEvent } from "./sse.ts";

describe("SSEParser", () => {
  it("parses a single standard SSE event", () => {
    const received: RawSSEEvent[] = [];
    const parser = new SSEParser((event) => received.push(event));

    parser.feed('event: token\ndata: {"text":"hello"}\n\n');

    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].event, "token");
    assert.strictEqual(received[0].data, '{"text":"hello"}');
  });

  it("parses multiple events in a single chunk", () => {
    const received: RawSSEEvent[] = [];
    const parser = new SSEParser((event) => received.push(event));

    const chunk =
      'event: sources\ndata: [{"filename":"doc.pdf"}]\n\n' +
      'event: token\ndata: {"text":"first"}\n\n' +
      'event: token\ndata: {"text":"second"}\n\n' +
      'event: done\ndata: {"latency_ms":120}\n\n';

    parser.feed(chunk);

    assert.strictEqual(received.length, 4);
    assert.strictEqual(received[0].event, "sources");
    assert.strictEqual(received[1].event, "token");
    assert.strictEqual(received[1].data, '{"text":"first"}');
    assert.strictEqual(received[2].event, "token");
    assert.strictEqual(received[2].data, '{"text":"second"}');
    assert.strictEqual(received[3].event, "done");
  });

  it("handles events split across multiple chunks", () => {
    const received: RawSSEEvent[] = [];
    const parser = new SSEParser((event) => received.push(event));

    // Split event name
    parser.feed("ev");
    assert.strictEqual(received.length, 0);
    parser.feed("ent: tok");
    assert.strictEqual(received.length, 0);
    parser.feed("en\n");
    assert.strictEqual(received.length, 0);

    // Split data
    parser.feed('data: {"te');
    assert.strictEqual(received.length, 0);
    parser.feed('xt":"split"}\n');
    assert.strictEqual(received.length, 0);

    // Split double newline delimiter
    parser.feed("\n");
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].event, "token");
    assert.strictEqual(received[0].data, '{"text":"split"}');
  });

  it("handles multi-line data payloads joined by newlines", () => {
    const received: RawSSEEvent[] = [];
    const parser = new SSEParser((event) => received.push(event));

    parser.feed("event: token\ndata: line 1\ndata: line 2\n\n");

    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].event, "token");
    assert.strictEqual(received[0].data, "line 1\nline 2");
  });

  it("ignores SSE comments", () => {
    const received: RawSSEEvent[] = [];
    const parser = new SSEParser((event) => received.push(event));

    parser.feed(": this is a comment or keep-alive ping\n\n");
    assert.strictEqual(received.length, 0);

    parser.feed('event: token\n: internal comment\ndata: {"text":"ok"}\n\n');
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].data, '{"text":"ok"}');
  });

  it("defaults event to message when event field is omitted", () => {
    const received: RawSSEEvent[] = [];
    const parser = new SSEParser((event) => received.push(event));

    parser.feed("data: default message\n\n");

    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].event, "message");
    assert.strictEqual(received[0].data, "default message");
  });

  it("handles CRLF (\\r\\n) and split \\r across chunk boundaries", () => {
    const received: RawSSEEvent[] = [];
    const parser = new SSEParser((event) => received.push(event));

    // End chunk 1 with \r
    parser.feed('event: token\r\ndata: {"text":"crlf"}\r');
    assert.strictEqual(received.length, 0);

    // Chunk 2 starts with \n\r\n (completing previous \r\n and providing empty line)
    parser.feed("\n\r\n");
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].event, "token");
    assert.strictEqual(received[0].data, '{"text":"crlf"}');
  });

  it("flushes remaining buffered event on flush()", () => {
    const received: RawSSEEvent[] = [];
    const parser = new SSEParser((event) => received.push(event));

    // Incomplete stream without final trailing empty line
    parser.feed('event: done\ndata: {"completed":true}');
    assert.strictEqual(received.length, 0);

    parser.flush();
    assert.strictEqual(received.length, 1);
    assert.strictEqual(received[0].event, "done");
    assert.strictEqual(received[0].data, '{"completed":true}');
  });
});
