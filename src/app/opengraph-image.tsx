import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "Кварта — кофе для вашего утра. Свежая обжарка в Минске.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = await readFile(join(process.cwd(), "assets/fonts/Pliant-700.ttf"));
const coffee = await readFile(join(process.cwd(), "assets/plates/coffee-still-life.png"), "base64");

export default function SocialImage() {
  return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#FCEDE3", color: "#2b0c09", padding: "52px", fontFamily: "Pliant" }}>
    <div style={{ display: "flex", flexDirection: "column", width: "49%", justifyContent: "space-between" }}>
      <div style={{ display: "flex", fontSize: 54, fontWeight: 700 }}>КВАРТА</div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 65, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-2px" }}><span>Ваше утро</span><span>начинается</span><span>с кофе.</span></div>
      <div style={{ display: "flex", fontSize: 25 }}>Свежая обжарка · Минск</div>
    </div>
    {/* A local data URL keeps the build independent of image hosting. */}
    <img src={`data:image/png;base64,${coffee}`} alt="" width={570} height={393} style={{ alignSelf: "center" }} />
  </div>, { ...size, fonts: [{ name: "Pliant", data: font, style: "normal", weight: 700 }] });
}
