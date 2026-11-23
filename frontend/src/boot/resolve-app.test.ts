import { appKindOf, resolveAppTarget } from "./resolve-app";

const at = (url: string) => {
  const parsed = new URL(url);
  return { hostname: parsed.hostname, host: parsed.host, pathname: parsed.pathname };
};

describe("resolveAppTarget", () => {
  const platform = "localhost";

  it.each([
    ["http://localhost:5173/admin", { kind: "admin" }],
    ["http://localhost:5173/admin/users", { kind: "admin" }],
    // Admin wins on any host, so staff can sign in from a brand domain too.
    ["http://northern-trails.localhost:5173/admin", { kind: "admin" }],
  ])("routes %s to the admin portal", (url, expected) => {
    expect(resolveAppTarget(at(url), platform)).toEqual(expected);
  });

  it("serves the directory at the platform root", () => {
    expect(resolveAppTarget(at("http://localhost:5173/"), platform)).toEqual({
      kind: "platform",
    });
    expect(
      resolveAppTarget(at("http://localhost:5173/administrator"), platform).kind,
    ).toBe("platform");
  });

  it("uses path mode for /s/{slug} on the platform host", () => {
    expect(
      resolveAppTarget(at("http://localhost:5173/s/northern-trails/about"), platform),
    ).toEqual({
      kind: "storefront",
      slug: "northern-trails",
      basename: "/s/northern-trails",
    });
    expect(
      resolveAppTarget(at("http://localhost:5173/s/northern-trails"), platform).kind,
    ).toBe("storefront");
  });

  it("does not accept malformed slugs in path mode", () => {
    expect(resolveAppTarget(at("http://localhost:5173/s/Bad--Slug"), platform).kind).toBe(
      "platform",
    );
  });

  it("asks the API to resolve any other host", () => {
    expect(
      resolveAppTarget(at("http://northern-trails.localhost:5173/menu"), platform),
    ).toEqual({
      kind: "storefront-host",
      host: "northern-trails.localhost:5173",
    });
    expect(
      resolveAppTarget(at("https://www.brand.example/"), "platform.example"),
    ).toEqual({
      kind: "storefront-host",
      host: "www.brand.example",
    });
  });

  it("treats www and 127.0.0.1 as the platform host", () => {
    expect(
      resolveAppTarget(at("https://www.platform.example/"), "platform.example").kind,
    ).toBe("platform");
    expect(resolveAppTarget(at("http://127.0.0.1:5173/"), platform).kind).toBe(
      "platform",
    );
  });

  it("maps targets to an app kind for theming", () => {
    expect(appKindOf({ kind: "storefront-host", host: "x" })).toBe("storefront");
    expect(appKindOf({ kind: "admin" })).toBe("admin");
  });
});
