import { describe, expect, it } from "vitest";
import { cloudinaryThumb } from "./imageUpload";

describe("cloudinaryThumb", () => {
  it("pide a Cloudinary una miniatura del ancho indicado", () => {
    expect(cloudinaryThumb("https://res.cloudinary.com/x/image/upload/v1/feeg/a.jpg", 300)).toBe(
      "https://res.cloudinary.com/x/image/upload/c_fill,w_300,q_auto,f_auto/v1/feeg/a.jpg"
    );
  });
  it("deja intactas las URLs que no son de Cloudinary", () => {
    expect(cloudinaryThumb("https://example.com/a.jpg", 300)).toBe("https://example.com/a.jpg");
  });
});
