export type LaunchCourse = {
  launch_at?: string | null;
  presale_price_cents?: number | null;
  price_cents: number;
};

export function isPrelaunch(course: Pick<LaunchCourse, "launch_at">, now = Date.now()) {
  return !!course.launch_at && new Date(course.launch_at).getTime() > now;
}

export function currentPrice(course: LaunchCourse, now = Date.now()) {
  return isPrelaunch(course, now) && course.presale_price_cents != null
    ? course.presale_price_cents
    : course.price_cents;
}

export function launchDate(launchAt: string) {
  return new Date(launchAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
