using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing.Printing;
using System.IO;
using System.IO.Ports;
using System.Net;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace NgeprintAgentWin7
{
    class RawPrinterHelper
    {
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        public class DOCINFOW
        {
            [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
            [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
            [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
        }

        [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
        public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

        [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
        public static extern bool ClosePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
        public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOW di);

        [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
        public static extern bool EndDocPrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
        public static extern bool StartPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
        public static extern bool EndPagePrinter(IntPtr hPrinter);

        [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
        public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

        public static bool SendBytesToPrinter(string printerName, byte[] bytes)
        {
            IntPtr hPrinter = IntPtr.Zero;
            IntPtr pUnmanaged = IntPtr.Zero;
            try
            {
                if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
                    return false;

                DOCINFOW di = new DOCINFOW
                {
                    pDocName = "Ngeprint Receipt 58mm",
                    pDataType = "RAW"
                };

                if (!StartDocPrinter(hPrinter, 1, di))
                    return false;

                if (!StartPagePrinter(hPrinter))
                {
                    EndDocPrinter(hPrinter);
                    return false;
                }

                pUnmanaged = Marshal.AllocCoTaskMem(bytes.Length);
                Marshal.Copy(bytes, 0, pUnmanaged, bytes.Length);
                int written = 0;
                bool ok = WritePrinter(hPrinter, pUnmanaged, bytes.Length, out written);

                EndPagePrinter(hPrinter);
                EndDocPrinter(hPrinter);
                return ok;
            }
            finally
            {
                if (pUnmanaged != IntPtr.Zero) Marshal.FreeCoTaskMem(pUnmanaged);
                if (hPrinter != IntPtr.Zero) ClosePrinter(hPrinter);
            }
        }
    }

    class Program
    {
        static string ServerUrl = "https://ngeprint.gellona.web.id";
        static string AgentKey = "";
        static int PollMs = 3000;
        static bool DryRun = false;
        static string LocalThermalPrinter = "";
        static bool LocalAutoReceipt = false;
        static string CustomSumatraPath = "";
        static string MachineHash = "";
        static readonly JavaScriptSerializer Json = new JavaScriptSerializer { MaxJsonLength = 20 * 1024 * 1024 };

        static void Main(string[] args)
        {
            // Force TLS 1.2 on Windows 7 SP1 / .NET 4.x
            try
            {
                ServicePointManager.SecurityProtocol =
                    (SecurityProtocolType)3072 | // Tls12
                    (SecurityProtocolType)768 |  // Tls11
                    SecurityProtocolType.Tls;
            }
            catch { }

            Console.OutputEncoding = Encoding.UTF8;
            Console.Title = "Ngeprint Print Agent (Windows 7/8/10/11)";

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            LoadDotEnv(Path.Combine(baseDir, ".env"));
            ParseArgs(args);

            if (string.IsNullOrEmpty(AgentKey))
            {
                Console.WriteLine("[ERROR] AGENT_KEY belum diatur di file .env!");
                Console.WriteLine("Pastikan file .env berada satu folder dengan NgeprintAgent-Win7.exe.");
                Console.WriteLine("Tekan Enter untuk keluar...");
                Console.ReadLine();
                return;
            }

            MachineHash = ComputeMachineHash();
            string sumatra = FindSumatraPdf(baseDir);

            Console.WriteLine("============================================================");
            Console.WriteLine("  NGEPRINT PRINT AGENT — WINDOWS 7 / 8 / 10 / 11 (Ringan)");
            Console.WriteLine("  by Gellona Teknologi");
            Console.WriteLine("============================================================");
            Console.WriteLine("Server   : " + ServerUrl);
            Console.WriteLine("Mode     : " + (DryRun ? "DRY-RUN (Simulasi)" : "LIVE (Cetak Nyata)"));
            Console.WriteLine("Sumatra  : " + (string.IsNullOrEmpty(sumatra) ? "Fallback Windows Shell" : sumatra));
            Console.WriteLine("Polling  : " + PollMs + " ms");
            Console.WriteLine("Biarkan jendela ini terbuka (boleh di-minimize).");
            Console.WriteLine("------------------------------------------------------------");

            DateTime lastHeartbeat = DateTime.MinValue;
            HashSet<string> processingIds = new HashSet<string>();

            while (true)
            {
                try
                {
                    if ((DateTime.UtcNow - lastHeartbeat).TotalSeconds >= 10)
                    {
                        SendHeartbeat();
                        lastHeartbeat = DateTime.UtcNow;
                    }

                    PollAndProcessJobs(sumatra, processingIds);
                }
                catch (Exception ex)
                {
                    Log("WARN", "Gangguan koneksi: " + ex.Message);
                }

                Thread.Sleep(PollMs);
            }
        }

        static void LoadDotEnv(string envPath)
        {
            if (!File.Exists(envPath)) return;
            try
            {
                foreach (string rawLine in File.ReadAllLines(envPath, Encoding.UTF8))
                {
                    string line = rawLine.Trim();
                    if (string.IsNullOrEmpty(line) || line.StartsWith("#")) continue;
                    int eq = line.IndexOf('=');
                    if (eq <= 0) continue;
                    string k = line.Substring(0, eq).Trim();
                    string v = line.Substring(eq + 1).Trim().Trim('"', '\'');

                    if (k == "SERVER_URL" || k == "NGEPRINT_URL" || k == "QRPRINT_URL")
                    {
                        if (!string.IsNullOrEmpty(v)) ServerUrl = v.TrimEnd('/');
                    }
                    else if (k == "AGENT_KEY" || k == "NGEPRINT_AGENT_KEY" || k == "QRPRINT_AGENT_KEY")
                    {
                        AgentKey = v;
                    }
                    else if (k == "POLL_INTERVAL_MS")
                    {
                        int ms;
                        if (int.TryParse(v, out ms) && ms >= 1500) PollMs = ms;
                    }
                    else if (k == "DRY_RUN")
                    {
                        DryRun = v.Equals("true", StringComparison.OrdinalIgnoreCase);
                    }
                    else if (k == "THERMAL_PRINTER_NAME")
                    {
                        LocalThermalPrinter = v;
                    }
                    else if (k == "AUTO_PRINT_RECEIPT")
                    {
                        LocalAutoReceipt = v.Equals("true", StringComparison.OrdinalIgnoreCase);
                    }
                    else if (k == "SUMATRA_PDF_PATH")
                    {
                        CustomSumatraPath = v;
                    }
                }
            }
            catch { }
        }

        static void ParseArgs(string[] args)
        {
            foreach (string a in args)
            {
                if (a.StartsWith("--url=")) ServerUrl = a.Substring(6).TrimEnd('/');
                else if (a.StartsWith("--key=")) AgentKey = a.Substring(6);
                else if (a == "--dry-run") DryRun = true;
                else if (a == "--live") DryRun = false;
            }
        }

        static string ComputeMachineHash()
        {
            string raw = Environment.MachineName + "|" + Environment.UserDomainName + "|" + Environment.OSVersion.VersionString;
            using (SHA256 sha = SHA256.Create())
            {
                byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < hash.Length; i++) sb.Append(hash[i].ToString("x2"));
                return sb.ToString();
            }
        }

        static List<string> GetInstalledPrinters()
        {
            List<string> list = new List<string>();
            try
            {
                foreach (string p in PrinterSettings.InstalledPrinters)
                {
                    if (!string.IsNullOrEmpty(p)) list.Add(p);
                }
            }
            catch { }
            return list;
        }

        static string FindSumatraPdf(string baseDir)
        {
            List<string> candidates = new List<string>();
            if (!string.IsNullOrEmpty(CustomSumatraPath)) candidates.Add(CustomSumatraPath);
            candidates.Add(Path.Combine(baseDir, "SumatraPDF.exe"));
            candidates.Add(Path.Combine(baseDir, "bin\\SumatraPDF.exe"));
            candidates.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SumatraPDF\\SumatraPDF.exe"));
            candidates.Add(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "SumatraPDF\\SumatraPDF.exe"));
            string pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)");
            if (!string.IsNullOrEmpty(pf86)) candidates.Add(Path.Combine(pf86, "SumatraPDF\\SumatraPDF.exe"));

            foreach (string c in candidates)
            {
                if (!string.IsNullOrEmpty(c) && File.Exists(c)) return c;
            }
            return "";
        }

        static HttpWebRequest CreateRequest(string url, string method)
        {
            HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
            req.Method = method;
            req.Timeout = 20000;
            req.ReadWriteTimeout = 30000;
            req.Headers["x-agent-key"] = AgentKey;
            req.Headers["x-machine-hash"] = MachineHash;
            req.UserAgent = "NgeprintAgentWin7/1.0";
            return req;
        }

        static string HttpPostJson(string url, object payload)
        {
            HttpWebRequest req = CreateRequest(url, "POST");
            req.ContentType = "application/json; charset=utf-8";
            byte[] data = Encoding.UTF8.GetBytes(Json.Serialize(payload));
            req.ContentLength = data.Length;
            using (Stream s = req.GetRequestStream()) s.Write(data, 0, data.Length);
            using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
            using (StreamReader sr = new StreamReader(res.GetResponseStream(), Encoding.UTF8))
            {
                return sr.ReadToEnd();
            }
        }

        static string HttpGetString(string url)
        {
            HttpWebRequest req = CreateRequest(url, "GET");
            using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
            using (StreamReader sr = new StreamReader(res.GetResponseStream(), Encoding.UTF8))
            {
                return sr.ReadToEnd();
            }
        }

        static byte[] HttpGetBytes(string url)
        {
            HttpWebRequest req = CreateRequest(url, "GET");
            using (HttpWebResponse res = (HttpWebResponse)req.GetResponse())
            using (Stream s = res.GetResponseStream())
            using (MemoryStream ms = new MemoryStream())
            {
                byte[] buf = new byte[8192];
                int n;
                while ((n = s.Read(buf, 0, buf.Length)) > 0) ms.Write(buf, 0, n);
                return ms.ToArray();
            }
        }

        static void SendHeartbeat()
        {
            List<string> printers = GetInstalledPrinters();
            HttpPostJson(ServerUrl + "/api/agent/heartbeat", new { printers = printers });
            Log("OK", "Heartbeat terkirim (" + printers.Count + " printer terdeteksi)");
        }

        static string Str(Dictionary<string, object> d, string key, string fallback = "")
        {
            if (d == null || !d.ContainsKey(key) || d[key] == null) return fallback;
            return Convert.ToString(d[key]);
        }

        static int IntVal(Dictionary<string, object> d, string key, int fallback = 0)
        {
            if (d == null || !d.ContainsKey(key) || d[key] == null) return fallback;
            int val;
            return int.TryParse(Convert.ToString(d[key]), out val) ? val : fallback;
        }

        static bool BoolVal(Dictionary<string, object> d, string key)
        {
            if (d == null || !d.ContainsKey(key) || d[key] == null) return false;
            bool val;
            return bool.TryParse(Convert.ToString(d[key]), out val) && val;
        }

        static void PollAndProcessJobs(string sumatraPath, HashSet<string> processingIds)
        {
            string raw = HttpGetString(ServerUrl + "/api/agent/jobs");
            var root = Json.Deserialize<Dictionary<string, object>>(raw);
            if (root == null || !root.ContainsKey("jobs") || root["jobs"] == null) return;

            string shopName = Str(root, "shopName", "Ngeprint");
            string shopAddress = Str(root, "shopAddress", "");
            string serverThermal = Str(root, "thermalPrinter", "");
            bool serverAutoReceipt = BoolVal(root, "autoPrintReceipt");

            string activeThermal = !string.IsNullOrEmpty(serverThermal) ? serverThermal : LocalThermalPrinter;
            bool activeAutoReceipt = serverAutoReceipt || LocalAutoReceipt;

            ArrayList jobs = root["jobs"] as ArrayList;
            if (jobs == null || jobs.Count == 0) return;

            foreach (object item in jobs)
            {
                var job = item as Dictionary<string, object>;
                if (job == null) continue;

                string id = Str(job, "id");
                string jobCode = Str(job, "jobCode");
                if (string.IsNullOrEmpty(id) || processingIds.Contains(id)) continue;

                processingIds.Add(id);
                string tempFile = "";
                try
                {
                    string fileName = Str(job, "fileName", "dokumen.pdf");
                    string mimeType = Str(job, "mimeType", "application/pdf");
                    string targetPrinter = Str(job, "targetPrinter", "Default Printer");
                    string colorMode = Str(job, "colorMode", "BW");
                    string paperSize = Str(job, "paperSize", "A4");
                    string pageRange = Str(job, "pageRange", "ALL");
                    bool duplex = BoolVal(job, "duplex");
                    int copies = Math.Max(1, IntVal(job, "copies", 1));

                    Log("JOB", "Memproses " + jobCode + " (" + fileName + ") -> " + targetPrinter);
                    HttpPostJson(ServerUrl + "/api/agent/jobs/" + id + "/status", new { status = "PRINTING" });

                    byte[] fileBytes = HttpGetBytes(ServerUrl + "/api/jobs/" + id + "/file");
                    string ext = mimeType == "application/pdf" ? ".pdf"
                        : mimeType == "image/png" ? ".png"
                        : mimeType == "image/jpeg" ? ".jpg" : ".pdf";

                    tempFile = Path.Combine(Path.GetTempPath(), "ngeprint-" + jobCode + "-" + Guid.NewGuid().ToString("N").Substring(0, 6) + ext);
                    File.WriteAllBytes(tempFile, fileBytes);

                    if (!DryRun)
                    {
                        ExecutePrint(tempFile, targetPrinter, sumatraPath, colorMode, paperSize, duplex, copies, pageRange);
                    }
                    else
                    {
                        Log("DRY", "Simulasi cetak selesai untuk " + jobCode);
                    }

                    if (activeAutoReceipt && !string.IsNullOrEmpty(activeThermal))
                    {
                        try
                        {
                            byte[] escpos = BuildReceiptEscPos(shopName, shopAddress, job);
                            SendThermalReceipt(activeThermal, escpos);
                            Log("STRUK", "Struk 58mm terkirim ke " + activeThermal);
                        }
                        catch (Exception tex)
                        {
                            Log("WARN", "Gagal cetak struk 58mm: " + tex.Message);
                        }
                    }

                    HttpPostJson(ServerUrl + "/api/agent/jobs/" + id + "/status", new { status = "COMPLETED" });
                    Log("DONE", "Selesai dicetak & file dihapus: " + jobCode);
                }
                catch (Exception ex)
                {
                    Log("ERR", "Gagal memproses " + jobCode + ": " + ex.Message);
                }
                finally
                {
                    if (!string.IsNullOrEmpty(tempFile) && File.Exists(tempFile))
                    {
                        try { File.Delete(tempFile); } catch { }
                    }
                    processingIds.Remove(id);
                }
            }
        }

        static void ExecutePrint(
            string filePath,
            string targetPrinter,
            string sumatraPath,
            string colorMode,
            string paperSize,
            bool duplex,
            int copies,
            string pageRange)
        {
            string printerArg = (string.IsNullOrEmpty(targetPrinter) || targetPrinter == "Default Printer")
                ? new PrinterSettings().PrinterName
                : targetPrinter;

            if (!string.IsNullOrEmpty(sumatraPath) && File.Exists(sumatraPath))
            {
                List<string> settings = new List<string>();
                settings.Add("fit");
                settings.Add((colorMode == "COLOR" || colorMode == "AUTO") ? "color" : "monochrome");
                settings.Add(duplex ? "duplex" : "simplex");
                if (copies > 1) settings.Add(copies + "x");
                if (paperSize == "F4") settings.Add("paper=Legal");
                else if (paperSize == "A4") settings.Add("paper=A4");

                string args = string.Format(
                    "-silent -print-to \"{0}\" -print-settings \"{1}\" \"{2}\"",
                    printerArg.Replace("\"", ""),
                    string.Join(",", settings.ToArray()),
                    filePath
                );

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = sumatraPath,
                    Arguments = args,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (Process p = Process.Start(psi))
                {
                    if (p != null) p.WaitForExit(45000);
                }
            }
            else
            {
                // Fallback Windows Shell PrintTo (works on all Windows versions including Win 7)
                for (int i = 0; i < copies; i++)
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = filePath,
                        Verb = "printto",
                        Arguments = "\"" + printerArg.Replace("\"", "") + "\"",
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden,
                        UseShellExecute = true
                    };
                    using (Process p = Process.Start(psi))
                    {
                        if (p != null) p.WaitForExit(15000);
                    }
                }
            }
        }

        static void SendThermalReceipt(string target, byte[] bytes)
        {
            string clean = target.Trim();
            if (clean.StartsWith("COM", StringComparison.OrdinalIgnoreCase))
            {
                string portName = clean.TrimEnd(':');
                using (SerialPort sp = new SerialPort(portName, 9600, Parity.None, 8, StopBits.One))
                {
                    sp.WriteTimeout = 8000;
                    sp.Open();
                    sp.Write(bytes, 0, bytes.Length);
                    Thread.Sleep(250);
                }
            }
            else
            {
                if (!RawPrinterHelper.SendBytesToPrinter(clean, bytes))
                    throw new Exception("OpenPrinter/WritePrinter gagal untuk " + clean);
            }
        }

        static byte[] BuildReceiptEscPos(string shopName, string shopAddress, Dictionary<string, object> job)
        {
            List<byte> b = new List<byte>();
            Action<byte[]> raw = (arr) => b.AddRange(arr);
            Action<string> line = (s) =>
            {
                string clean = SanitizeAscii(s);
                b.AddRange(Encoding.ASCII.GetBytes(clean));
                b.Add(0x0a);
            };

            string jobCode = Str(job, "jobCode", "-");
            string cust = Str(job, "customerName", "Pelanggan");
            string file = Str(job, "fileName", "Dokumen");
            int pages = IntVal(job, "pageCount", 1);
            int copies = IntVal(job, "copies", 1);
            string paper = Str(job, "paperSize", "A4");
            string color = Str(job, "colorMode", "BW");
            string pay = Str(job, "paymentMethod", "QRIS");
            int total = IntVal(job, "totalPrice", 0);

            raw(new byte[] { 0x1b, 0x40 }); // ESC @
            raw(new byte[] { 0x1b, 0x61, 1 }); // Center
            raw(new byte[] { 0x1b, 0x45, 1 }); // Bold
            line(shopName);
            raw(new byte[] { 0x1b, 0x45, 0 });
            if (!string.IsNullOrEmpty(shopAddress)) line(shopAddress.Length > 32 ? shopAddress.Substring(0, 32) : shopAddress);
            line("Nota Cetak - Ngeprint");
            line("--------------------------------");
            line("KODE ANTREAN");
            raw(new byte[] { 0x1b, 0x45, 1, 0x1d, 0x21, 0x11 }); // Double
            line(jobCode);
            raw(new byte[] { 0x1d, 0x21, 0x00, 0x1b, 0x45, 0 });
            line("--------------------------------");
            raw(new byte[] { 0x1b, 0x61, 0 }); // Left
            line(PadRow("Tanggal", DateTime.Now.ToString("dd/MM/yy HH:mm")));
            line(PadRow("Nama", cust));
            line("File: " + (file.Length > 26 ? file.Substring(0, 26) : file));
            line(PadRow("Rincian", pages + " hal x" + copies + " " + paper));
            line(PadRow("Warna", color == "COLOR" ? "Warna" : (color == "AUTO" ? "Otomatis" : "Hitam Putih")));
            line("--------------------------------");
            line(PadRow("Metode", pay + " (LUNAS)"));
            raw(new byte[] { 0x1b, 0x45, 1 });
            line(PadRow("TOTAL", "Rp " + total.ToString("N0")));
            raw(new byte[] { 0x1b, 0x45, 0 });
            line("--------------------------------");
            raw(new byte[] { 0x1b, 0x61, 1 });
            line("Terima kasih telah mencetak.");
            line("File dihapus otomatis.");
            raw(new byte[] { 0x1b, 0x64, 4 }); // Feed 4
            raw(new byte[] { 0x1d, 0x56, 66, 0 }); // Cut
            return b.ToArray();
        }

        static string SanitizeAscii(string input)
        {
            if (string.IsNullOrEmpty(input)) return "";
            StringBuilder sb = new StringBuilder();
            foreach (char c in input)
            {
                if (c >= 32 && c <= 126) sb.Append(c);
                else sb.Append(' ');
            }
            return sb.ToString().Trim();
        }

        static string PadRow(string left, string right)
        {
            string l = SanitizeAscii(left);
            string r = SanitizeAscii(right);
            int gap = 32 - l.Length - r.Length;
            if (gap >= 1) return l + new string(' ', gap) + r;
            int maxL = Math.Max(4, 32 - r.Length - 1);
            return l.Substring(0, Math.Min(l.Length, maxL)) + " " + r;
        }

        static void Log(string tag, string msg)
        {
            Console.WriteLine("[" + DateTime.Now.ToString("HH:mm:ss") + "] [" + tag + "] " + msg);
        }
    }
}
