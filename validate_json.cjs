const fs = require("fs");

try {
  const content = fs.readFileSync("settings.json", "utf8");
  // Same stripper
  let json = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
  json = json.replace(/,(\s*\]\})/g, "$1");

  JSON.parse(json);
  console.log("Valid JSON");
} catch (e) {
  const match = e.message.match(/position (\d+)/);
  if (match) {
      const pos = parseInt(match[1]);
      const content = fs.readFileSync("settings.json", "utf8");
      // Re-strip to match positions
      let json = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");
      json = json.replace(/,(\s*\]\})/g, "$1");
      
      const start = Math.max(0, pos - 50);
      const end = Math.min(json.length, pos + 50);
      console.log("Error context:");
      console.log(json.substring(start, end));
      console.log("Error at: " + json[pos]);
  } else {
      console.log(e.message);
  }
}