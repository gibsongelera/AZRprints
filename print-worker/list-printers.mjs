import "dotenv/config";
import { execSync } from "node:child_process";

if (process.platform === "win32") {
  execSync(
    'powershell -NoProfile -Command "Get-Printer | Format-Table Name,DriverName,PortName"',
    { stdio: "inherit" },
  );
} else {
  execSync("lpstat -p -d 2>/dev/null || lpstat -a", { stdio: "inherit", shell: true });
}
