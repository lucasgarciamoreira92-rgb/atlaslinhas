using System.Diagnostics;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace AtlasLinhas;

internal static class Program
{
    private const string AppVersion = "0.1.0";
    private const string AppResource = "AtlasLinhas.app.zip";
    private const string NodeResource = "AtlasLinhas.node.exe";
    private static readonly byte[] SeedMarker = BuildMarker();

    [STAThread]
    private static void Main()
    {
        using var mutex = new Mutex(true, "Local\\AtlasLinhas.UnicaInstancia", out var first);
        if (!first)
        {
            OpenBrowser();
            return;
        }

        ApplicationConfiguration.Initialize();
        try
        {
            var root = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "AtlasLinhas");
            var runtime = Path.Combine(root, "runtime", AppVersion);
            var data = Path.Combine(root, "dados");
            EnsureRuntime(runtime);
            ImportInitialData(data);
            using var context = new AtlasContext(runtime, data);
            Application.Run(context);
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message, "Atlas Linhas", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private static void EnsureRuntime(string runtime)
    {
        var ready = Path.Combine(runtime, ".ready");
        if (File.Exists(ready)) return;
        var parent = Directory.GetParent(runtime)!.FullName;
        Directory.CreateDirectory(parent);
        var staging = runtime + "." + Guid.NewGuid().ToString("N") + ".tmp";
        Directory.CreateDirectory(staging);
        try
        {
            using (var app = Assembly.GetExecutingAssembly().GetManifestResourceStream(AppResource)
                ?? throw new InvalidOperationException("Os arquivos do Atlas não foram incorporados ao executável."))
                ZipFile.ExtractToDirectory(app, staging);
            using (var node = Assembly.GetExecutingAssembly().GetManifestResourceStream(NodeResource)
                ?? throw new InvalidOperationException("O Node.js não foi incorporado ao executável."))
            using (var output = File.Create(Path.Combine(staging, "node.exe"))) node.CopyTo(output);
            File.WriteAllText(Path.Combine(staging, ".ready"), AppVersion);
            if (Directory.Exists(runtime)) Directory.Delete(runtime, true);
            Directory.Move(staging, runtime);
        }
        catch
        {
            if (Directory.Exists(staging)) Directory.Delete(staging, true);
            throw;
        }
    }

    private static void ImportInitialData(string data)
    {
        if (File.Exists(Path.Combine(data, "atlas-linhas.sqlite"))) return;
        var encrypted = ReadAppendedSeed();
        if (encrypted is null) return;
        if (Directory.Exists(data) && Directory.EnumerateFileSystemEntries(data).Any())
            throw new InvalidOperationException("A pasta de dados do Windows já contém arquivos. A importação foi interrompida para não substituir informações.");
        using var prompt = new PasswordDialog();
        if (prompt.ShowDialog() != DialogResult.OK) throw new InvalidOperationException("A importação dos dados foi cancelada.");

        byte[] clear;
        try { clear = DecryptSeed(encrypted, prompt.Password); }
        catch (CryptographicException) { throw new InvalidOperationException("A senha do pacote de migração está incorreta."); }
        var package = JsonSerializer.Deserialize<SeedPackage>(clear) ?? throw new InvalidOperationException("Pacote de dados inválido.");
        if (package.Version != 1 || package.Files.Count == 0) throw new InvalidOperationException("Pacote de dados incompatível.");

        var staging = data + "." + Guid.NewGuid().ToString("N") + ".tmp";
        Directory.CreateDirectory(staging);
        try
        {
            foreach (var item in package.Files)
            {
                var relative = item.Path.Replace('/', Path.DirectorySeparatorChar);
                var target = Path.GetFullPath(Path.Combine(staging, relative));
                if (!target.StartsWith(Path.GetFullPath(staging) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException("O pacote contém um caminho inválido.");
                Directory.CreateDirectory(Path.GetDirectoryName(target)!);
                File.WriteAllBytes(target, Convert.FromBase64String(item.Data));
            }
            if (!File.Exists(Path.Combine(staging, "atlas-linhas.sqlite"))) throw new InvalidOperationException("O banco não está presente no pacote.");
            Directory.CreateDirectory(Path.GetDirectoryName(data)!);
            if (Directory.Exists(data)) Directory.Delete(data);
            Directory.Move(staging, data);
        }
        catch
        {
            if (Directory.Exists(staging)) Directory.Delete(staging, true);
            throw;
        }
        finally { CryptographicOperations.ZeroMemory(clear); }
    }

    private static byte[]? ReadAppendedSeed()
    {
        var executable = Environment.ProcessPath ?? throw new InvalidOperationException("Não foi possível localizar o executável.");
        using var stream = File.OpenRead(executable);
        const int footerSize = 40;
        if (stream.Length < footerSize) return null;
        stream.Seek(-footerSize, SeekOrigin.End);
        using var reader = new BinaryReader(stream, Encoding.UTF8, true);
        var length = reader.ReadUInt64();
        var marker = reader.ReadBytes(32);
        if (!marker.SequenceEqual(SeedMarker) || length == 0 || length > (ulong)(stream.Length - footerSize)) return null;
        stream.Seek(-(long)length - footerSize, SeekOrigin.End);
        return reader.ReadBytes(checked((int)length));
    }

    private static byte[] DecryptSeed(byte[] envelopeBytes, string password)
    {
        var envelope = JsonSerializer.Deserialize<SeedEnvelope>(envelopeBytes) ?? throw new CryptographicException();
        if (envelope.Version != 1) throw new CryptographicException();
        var salt = Convert.FromBase64String(envelope.Salt);
        var nonce = Convert.FromBase64String(envelope.Nonce);
        var tag = Convert.FromBase64String(envelope.Tag);
        var ciphertext = Convert.FromBase64String(envelope.Ciphertext);
        var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, 600_000, HashAlgorithmName.SHA256, 32);
        try
        {
            var clear = new byte[ciphertext.Length];
            using var aes = new AesGcm(key, 16);
            aes.Decrypt(nonce, ciphertext, tag, clear, Encoding.UTF8.GetBytes("AtlasLinhas-Windows-v1"));
            return clear;
        }
        finally { CryptographicOperations.ZeroMemory(key); }
    }

    private static byte[] BuildMarker()
    {
        var marker = new byte[32];
        Encoding.ASCII.GetBytes("ATLAS_LINHAS_SEED_V1").CopyTo(marker, 0);
        return marker;
    }

    private static void OpenBrowser() => Process.Start(new ProcessStartInfo("http://localhost:4310") { UseShellExecute = true });

    private sealed class AtlasContext : ApplicationContext
    {
        private readonly Process server;
        private readonly string shutdownFile;
        private readonly NotifyIcon tray;

        public AtlasContext(string runtime, string data)
        {
            shutdownFile = Path.Combine(Path.GetTempPath(), "atlas-linhas-shutdown-" + Guid.NewGuid().ToString("N"));
            var info = new ProcessStartInfo(Path.Combine(runtime, "node.exe"), Path.Combine(runtime, "local-dist", "server.mjs"))
            {
                WorkingDirectory = runtime,
                UseShellExecute = false,
                CreateNoWindow = true
            };
            info.Environment["ATLAS_DATA_DIR"] = data;
            info.Environment["ATLAS_ASSISTANT_ENABLED"] = File.Exists(Path.Combine(data, "atlinhas.enabled")) ? "1" : "0";
            info.Environment["ATLAS_PARENT_PID"] = Environment.ProcessId.ToString();
            info.Environment["ATLAS_SHUTDOWN_FILE"] = shutdownFile;
            server = Process.Start(info) ?? throw new InvalidOperationException("Não foi possível iniciar o Atlas Linhas.");
            server.EnableRaisingEvents = true;
            server.Exited += (_, _) => BeginInvokeExit();

            var menu = new ContextMenuStrip();
            menu.Items.Add("Abrir Atlas Linhas", null, (_, _) => OpenBrowser());
            menu.Items.Add("Encerrar", null, (_, _) => ExitThread());
            tray = new NotifyIcon { Icon = SystemIcons.Application, Text = "Atlas Linhas", ContextMenuStrip = menu, Visible = true };
            tray.DoubleClick += (_, _) => OpenBrowser();
            _ = OpenWhenReady();
        }

        private async Task OpenWhenReady()
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(1) };
            for (var attempt = 0; attempt < 60 && !server.HasExited; attempt++)
            {
                try { using var response = await client.GetAsync("http://localhost:4310/"); if (response.IsSuccessStatusCode) { OpenBrowser(); return; } }
                catch { }
                await Task.Delay(250);
            }
            if (!server.HasExited) MessageBox.Show("O Atlas demorou para iniciar. Abra novamente pelo ícone ao lado do relógio.", "Atlas Linhas");
        }

        private void BeginInvokeExit()
        {
            if (Application.OpenForms.Count > 0) Application.OpenForms[0].BeginInvoke(ExitThread);
            else ExitThread();
        }

        protected override void ExitThreadCore()
        {
            tray.Visible = false;
            tray.Dispose();
            try { File.WriteAllText(shutdownFile, "encerrar"); server.WaitForExit(5000); }
            catch { }
            if (!server.HasExited) try { server.Kill(true); } catch { }
            try { File.Delete(shutdownFile); } catch { }
            server.Dispose();
            base.ExitThreadCore();
        }
    }

    private sealed class PasswordDialog : Form
    {
        private readonly TextBox input = new() { UseSystemPasswordChar = true, Width = 300 };
        public string Password => input.Text;
        public PasswordDialog()
        {
            Text = "Importar dados do Atlas";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            StartPosition = FormStartPosition.CenterScreen;
            MaximizeBox = false;
            MinimizeBox = false;
            ClientSize = new Size(370, 155);
            Controls.Add(new Label { Text = "Digite a senha criada para a migração dos dados:", AutoSize = true, Location = new Point(25, 22) });
            input.Location = new Point(25, 52);
            Controls.Add(input);
            var ok = new Button { Text = "Importar", DialogResult = DialogResult.OK, Location = new Point(185, 100), Width = 90 };
            var cancel = new Button { Text = "Cancelar", DialogResult = DialogResult.Cancel, Location = new Point(280, 100), Width = 75 };
            Controls.Add(ok); Controls.Add(cancel); AcceptButton = ok; CancelButton = cancel;
        }
    }

    private sealed record SeedPackage([property: JsonPropertyName("version")] int Version, [property: JsonPropertyName("files")] List<SeedFile> Files);
    private sealed record SeedFile([property: JsonPropertyName("path")] string Path, [property: JsonPropertyName("data")] string Data);
    private sealed record SeedEnvelope(
        [property: JsonPropertyName("version")] int Version,
        [property: JsonPropertyName("salt")] string Salt,
        [property: JsonPropertyName("nonce")] string Nonce,
        [property: JsonPropertyName("tag")] string Tag,
        [property: JsonPropertyName("ciphertext")] string Ciphertext);
}
