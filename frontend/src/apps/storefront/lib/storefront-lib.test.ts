import { describe, expect, it } from "vitest";
import { firstParagraph, parseInline, parseRichText } from "./rich-text";
import { joinAddress } from "./wording";

describe("rich text", () => {
  it("parses headings, paragraphs and lists", () => {
    const blocks = parseRichText(
      "Intro line\nwraps here.\n\n## Our guides\n\n- **Local** always\n- Small groups",
    );
    expect(blocks).toEqual([
      { kind: "p", inlines: [{ kind: "text", text: "Intro line wraps here." }] },
      { kind: "h2", text: "Our guides" },
      {
        kind: "ul",
        items: [
          [
            { kind: "bold", text: "Local" },
            { kind: "text", text: " always" },
          ],
          [{ kind: "text", text: "Small groups" }],
        ],
      },
    ]);
  });

  it("keeps only safe links", () => {
    expect(
      parseInline("Email [us](mailto:a@b.test) or [x](javascript:alert(1))"),
    ).toEqual([
      { kind: "text", text: "Email " },
      { kind: "link", text: "us", href: "mailto:a@b.test" },
      { kind: "text", text: " or " },
      { kind: "text", text: "[x](javascript:alert(1)" },
      { kind: "text", text: ")" },
    ]);
  });

  it("summarises the first paragraph for meta descriptions", () => {
    expect(firstParagraph("## Title\n\nWe cook **slowly**.")).toBe("We cook slowly.");
    expect(firstParagraph("a".repeat(200), 20)).toHaveLength(20);
  });
});

describe("addresses", () => {
  it("leaves out parts already in the address", () => {
    expect(joinAddress("1 Example Road, Saddar", "Saddar", "Islamabad")).toBe(
      "1 Example Road, Saddar, Islamabad",
    );
    expect(joinAddress("7 Garden Walk", null, " Lahore ")).toBe("7 Garden Walk, Lahore");
  });
});
