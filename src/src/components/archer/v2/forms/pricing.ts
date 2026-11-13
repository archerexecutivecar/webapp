// DISPLAY-ONLY estimate figures copied from the approved design.
// Authoritative pricing, fees, stop charges and minimums live in Laravel and must be
// re-validated server-side on submit. Never trust these totals.

export type Cls = "exec" | "first";
export type Size = "sedan" | "suv" | "van";

export const HR: Record<Cls, Record<Size, number[]>> = {
  exec: { sedan: [70, 90, 130, 215], suv: [80, 100, 140, 190], van: [175, 195, 235, 390] },
  first: { sedan: [80, 100, 140, 235], suv: [100, 120, 160, 210], van: [225, 245, 285, 475] },
};
export const PP: Record<Cls, Record<Size, number[] | null>> = {
  exec: { sedan: [145, 170, 215, 270], suv: [155, 180, 225, 280], van: null },
  first: { sedan: [155, 180, 225, 280], suv: [200, 220, 260, 310], van: null },
};
export const CC = [45, 60, 75, 125];
export const FEE = 10;
export const STOP = 20;

export const money = (n: number) => "$" + n.toLocaleString("en-US");

export const M: Record<Cls, Record<Size, string>> = {
  exec: { sedan: "Chevrolet Traverse", suv: "Chevrolet Suburban", van: "Mercedes-Benz Sprinter" },
  first: { sedan: "Lincoln Aviator", suv: "Cadillac Escalade", van: "Executive Sprinter" },
};
export const SZ: Record<Size, string> = { sedan: "Mid-size SUV", suv: "Full-size SUV", van: "Sprinter" };
export const CLS_NAME: Record<Cls, string> = { exec: "Executive Class", first: "1st Class" };
export const SIZES: Size[] = ["sedan", "suv", "van"];
