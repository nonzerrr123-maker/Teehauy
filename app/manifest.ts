import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Teehauy - ตีเลขฝัน",
    short_name: "Teehauy",
    description: "ตีความความฝัน เก็บประวัติ และดูสถิติใน Teehauy",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#06060C",
    theme_color: "#06060C",
    lang: "th",
    categories: ["entertainment", "utilities"],
  };
}
