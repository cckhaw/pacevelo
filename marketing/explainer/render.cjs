// Renders the explainer to MP4, frame by frame.
//
//   npm i --no-save playwright-core     (plus an ffmpeg binary with libx264)
//   node marketing/explainer/render.cjs [--fps 30] [--out pacevelo-explainer.mp4] [--audio music.wav]
//   node marketing/explainer/render.cjs --stills 3,15,24   # PNG previews only
//
// Env: CHROMIUM (browser executable), FFMPEG (ffmpeg executable).
const { chromium } = require("playwright-core");
const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const fps = Number(opt("fps", 30));
const out = path.resolve(opt("out", path.join(__dirname, "pacevelo-explainer.mp4")));
const audio = opt("audio", null);
const stills = opt("stills", null);
const ffmpeg = process.env.FFMPEG || "ffmpeg";

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto("file://" + path.join(__dirname, "index.html") + "?render");
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => PV.DURATION);
  const shoot = async (t, type = "jpeg") => {
    await page.evaluate((t) => window.renderAt(t), t);
    return page.screenshot({ type, quality: type === "jpeg" ? 92 : undefined });
  };

  if (stills) {
    for (const t of stills.split(",").map(Number)) {
      const file = path.resolve(opt("stills-dir", "."), `still-${String(t).replace(".", "_")}.png`);
      require("fs").writeFileSync(file, await shoot(t, "png"));
      console.log(file);
    }
    await browser.close();
    return;
  }

  const ff = spawn(ffmpeg, [
    "-y", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
    ...(audio ? ["-i", audio, "-c:a", "aac", "-b:a", "160k", "-shortest"] : []),
    "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
  ], { stdio: ["pipe", "inherit", "inherit"] });

  const total = Math.round(duration * fps);
  for (let i = 0; i < total; i++) {
    const buf = await shoot(i / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    if (i % (fps * 5) === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await browser.close();
  console.log("wrote", out);
})();
