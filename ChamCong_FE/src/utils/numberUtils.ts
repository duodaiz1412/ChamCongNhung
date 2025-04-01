export const shortenNumber = (value?: number) => {
  if (typeof value !== "number" || isNaN(value)) {
    return "0";
  }

  let res: number = value;
  let unit: string = "";
  if (value >= 1000_000_000) {
    res = value / 1000_000_000;
    unit = "T";
  } else if (value >= 1000_000) {
    res = value / 1000_000;
    unit = "Tr";
  } else if (value >= 1000) {
    res = value / 1000;
    unit = "N";
  }
  return res.toLocaleString("en-US", {maximumFractionDigits: 1}) + unit;
};
