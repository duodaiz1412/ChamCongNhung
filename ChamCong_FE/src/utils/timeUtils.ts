import moment from "moment";

export function convertDuration(duration?: number) {
  if (!duration) return "-";
  if (duration < 60) return `${duration} phút`;
  const hours = Math.floor(duration / 60);
  const remainingMinutes = duration % 60;
  return remainingMinutes === 0
    ? `${hours} giờ`
    : `${hours} giờ ${remainingMinutes} phút`;
}

export const convertPlayerTime = (time?: number) => {
  if (!time) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export function convertSongDuration(duration?: number) {
  if (!duration) return "-";
  const minutes = Math.ceil((duration % 3600) / 60);
  const seconds = Math.ceil(duration % 60);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

export function convertDate(date?: string | Date) {
  if (!date) return "-";
  const momentDate = moment(date);
  return `${momentDate.date()}, th${momentDate.month() + 1}, ${momentDate.year()}`;
}

export function convertNumber(num?: number): string {
  if (typeof num !== "number" || isNaN(num)) return "-";
  return num.toLocaleString("vi-VN");
}

export function convertDateTime(date?: string | Date) {
  if (!date) return "-";
  const momentDate = moment(date);
  return `${momentDate.format("HH:mm")} - ${momentDate.date()} tháng ${momentDate.month() + 1}, ${momentDate.year()}`;
}
