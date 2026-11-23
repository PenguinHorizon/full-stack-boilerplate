import { storefrontHref } from "./links";

describe("storefrontHref", () => {
  it("stays relative on the platform host", () => {
    expect(
      storefrontHref(
        "northern-trails",
        { hostname: "localhost", port: "5173", protocol: "http:" },
        "localhost",
      ),
    ).toBe("/s/northern-trails");
  });

  it("points at the platform host from anywhere else", () => {
    expect(
      storefrontHref(
        "northern-trails",
        { hostname: "order.northerntrails.pk", port: "", protocol: "https:" },
        "platform.example",
      ),
    ).toBe("https://platform.example/s/northern-trails");
  });
});
