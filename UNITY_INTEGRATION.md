# Unity Integration Guide — Sasmita Aksara Projection System

## Arsitektur Komunikasi

```
[Website Sasmita Aksara]
        │
        │ HTTP INSERT
        ▼
[Supabase PostgreSQL]
        │
        │ Realtime WebSocket (postgres_changes)
        ▼
[Unity Application]
        │
        │ Render trigger
        ▼
[Projection Mapping Output]
```

---

## Setup di Unity

### 1. Dependensi

Tambahkan package berikut via **Unity Package Manager** atau manual:

- **Supabase C# SDK** (unofficial): https://github.com/supabase-community/supabase-csharp  
  Atau gunakan **WebSocket** langsung (lihat opsi 2 di bawah)
- **Newtonsoft.Json** (untuk parsing JSON)

---

### 2. Struktur Data Tabel Supabase

#### A. Tabel `cards` (Master Data Kartu)
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `INTEGER (PK)` | ID Kartu (1 s.d. 5) |
| `nama_kartu` | `TEXT` | Nama kartu (Sang Sri, Sang Lungguh, dst) |
| `deskripsi` | `TEXT` | Makna / deskripsi kartu |

#### B. Tabel `users` (Pengunjung Baru dari Web)
| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | `UUID (PK)` | ID unik pengunjung |
| `created_at` | `TIMESTAMPTZ` | Waktu submit kalkulasi |
| `nama_latin` | `TEXT` | Nama lengkap pengunjung |
| `nama_panggilan` | `TEXT` | Nama panggilan pengunjung |
| `id_kartu` | `INTEGER (FK)` | Relasi ke `cards.id` (1 - 5) |
| `url_kartu` | `TEXT` | Link gambar kartu PNG di storage `CardPetangen` |

---
http://localhost:8000.
### 3. Opsi A — Supabase C# SDK (Direkomendasikan)

```csharp
using Supabase;
using Supabase.Realtime;
using Supabase.Realtime.PostgresChanges;
using UnityEngine;

public class SasmitaRealtimeListener : MonoBehaviour
{
    [Header("Supabase Config")]
    [SerializeField] private string supabaseUrl = "https://YOUR_PROJECT.supabase.co";
    [SerializeField] private string supabaseAnonKey = "YOUR_ANON_KEY";

    private Supabase.Client _supabase;

    async void Start()
    {
        var options = new SupabaseOptions
        {
            AutoConnectRealtime = true,
        };

        _supabase = new Supabase.Client(supabaseUrl, supabaseAnonKey, options);
        await _supabase.InitializeAsync();

        // Subscribe ke tabel petangan_submissions
        var channel = _supabase.Realtime.Channel("petangan_realtime");
        channel.Register<PetanganSubmission>(PostgresChangesOptions.ListenType.Inserts,
            new PostgresChangesOptions { Schema = "public", Table = "petangan_submissions" });

        channel.AddPostgresChangeHandler(PostgresChangesOptions.ListenType.Inserts,
            (sender, change) =>
            {
                var data = change.Model<PetanganSubmission>();
                if (data != null)
                {
                    // Dispatch ke Unity main thread
                    UnityMainThreadDispatcher.Instance.Enqueue(() =>
                    {
                        OnNewSubmission(data);
                    });
                }
            });

        await channel.Subscribe();
        Debug.Log("[Sasmita] Realtime listener aktif.");
    }

    void OnNewSubmission(PetanganSubmission data)
    {
        Debug.Log($"[Sasmita] Nama: {data.NamaLatin} | Hasil: {data.HasilKey} | Neptu: {data.TotalNeptu}");

        // Trigger animasi projection mapping berdasarkan hasil
        ProjectionController.Instance.TriggerAnimation(data.HasilKey, data.NamaLatin, data.AksaraJawa);
    }

    async void OnDestroy()
    {
        if (_supabase?.Realtime != null)
            await _supabase.Realtime.Disconnect();
    }
}

[System.Serializable]
public class PetanganSubmission
{
    [JsonProperty("id")]          public string Id { get; set; }
    [JsonProperty("created_at")] public string CreatedAt { get; set; }
    [JsonProperty("nama_latin")] public string NamaLatin { get; set; }
    [JsonProperty("aksara_jawa")] public string AksaraJawa { get; set; }
    [JsonProperty("total_neptu")] public int TotalNeptu { get; set; }
    [JsonProperty("sisa_bagi")]  public int SisaBagi { get; set; }
    [JsonProperty("hasil_key")]  public string HasilKey { get; set; }
    [JsonProperty("hasil_nama")] public string HasilNama { get; set; }
    [JsonProperty("hasil_arti")] public string HasilArti { get; set; }
    [JsonProperty("metode")]     public string Metode { get; set; }
}
```

### 3. Opsi B — WebSocket Native (Tanpa SDK Eksternal)

```csharp
using System;
using System.Text;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using UnityEngine;
using Newtonsoft.Json.Linq;

public class SasmitaWebSocketListener : MonoBehaviour
{
    [SerializeField] private string supabaseUrl = "https://YOUR_PROJECT.supabase.co";
    [SerializeField] private string supabaseAnonKey = "YOUR_ANON_KEY";

    private ClientWebSocket _ws;
    private CancellationTokenSource _cts;

    async void Start()
    {
        await ConnectWebSocket();
    }

    async Task ConnectWebSocket()
    {
        _cts = new CancellationTokenSource();
        _ws  = new ClientWebSocket();

        // Ubah https:// → wss://
        string wsUrl = supabaseUrl.Replace("https://", "wss://") + "/realtime/v1/websocket?apikey=" + supabaseAnonKey;

        try
        {
            await _ws.ConnectAsync(new Uri(wsUrl), _cts.Token);
            Debug.Log("[Sasmita WS] Connected.");

            await SendPhoenixJoin();
            _ = ListenLoop();
        }
        catch (Exception ex)
        {
            Debug.LogError("[Sasmita WS] Connection error: " + ex.Message);
        }
    }

    async Task SendPhoenixJoin()
    {
        // Join Phoenix channel untuk postgres_changes
        var joinMsg = new JObject
        {
            ["topic"] = "realtime:public:petangan_submissions",
            ["event"] = "phx_join",
            ["payload"] = new JObject
            {
                ["config"] = new JObject
                {
                    ["broadcast"] = new JObject { ["self"] = false },
                    ["presence"] = new JObject { ["key"] = "" },
                    ["postgres_changes"] = new JArray
                    {
                        new JObject
                        {
                            ["event"] = "INSERT",
                            ["schema"] = "public",
                            ["table"] = "petangan_submissions"
                        }
                    }
                }
            },
            ["ref"] = "1"
        };

        var bytes = Encoding.UTF8.GetBytes(joinMsg.ToString());
        await _ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, _cts.Token);
    }

    async Task ListenLoop()
    {
        var buffer = new byte[4096];
        while (_ws.State == WebSocketState.Open && !_cts.IsCancellationRequested)
        {
            var result = await _ws.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);
            var json = Encoding.UTF8.GetString(buffer, 0, result.Count);

            try
            {
                var msg = JObject.Parse(json);
                var eventType = msg["event"]?.ToString();
                var payload   = msg["payload"];

                if (eventType == "postgres_changes" && payload?["data"]?["type"]?.ToString() == "INSERT")
                {
                    var record = payload["data"]["record"];
                    var namaLatin = record["nama_latin"]?.ToString();
                    var aksaraJawa = record["aksara_jawa"]?.ToString();
                    var hasilKey  = record["hasil_key"]?.ToString();

                    // Main thread dispatch
                    UnityMainThreadDispatcher.Instance.Enqueue(() =>
                    {
                        ProjectionController.Instance.TriggerAnimation(hasilKey, namaLatin, aksaraJawa);
                    });
                }
            }
            catch { /* Ignore parse errors (heartbeat, etc.) */ }
        }
    }

    void OnDestroy()
    {
        _cts?.Cancel();
        _ws?.Dispose();
    }
}
```

---

## ProjectionController.cs — Contoh Animasi Handler

```csharp
using UnityEngine;

public class ProjectionController : MonoBehaviour
{
    public static ProjectionController Instance;

    [Header("Animation Controllers")]
    [SerializeField] private Animator projectionAnimator;
    [SerializeField] private TMPro.TextMeshPro nameDisplay;
    [SerializeField] private TMPro.TextMeshPro aksaraDisplay;

    [Header("Theme Materials")]
    [SerializeField] private Material matLanang;
    [SerializeField] private Material matManten;
    [SerializeField] private Material matRampas;
    [SerializeField] private Material matSri;
    [SerializeField] private Material matLungguh;
    [SerializeField] private Material matGedhong;
    [SerializeField] private Material matLara;
    [SerializeField] private Material matPati;

    private void Awake()
    {
        if (Instance == null) Instance = this;
    }

    public void TriggerAnimation(string hasilKey, string namaLatin, string aksaraJawa)
    {
        Debug.Log($"[Projection] Trigger: {hasilKey} | {namaLatin}");

        // Update text
        if (nameDisplay)  nameDisplay.text  = namaLatin.ToUpper();
        if (aksaraDisplay) aksaraDisplay.text = aksaraJawa;

        // Trigger animator state berdasarkan hasil
        switch (hasilKey?.ToLower())
        {
            case "lanang":
                projectionAnimator?.SetTrigger("PlayLanang");
                ApplyTheme(matLanang);
                break;
            case "manten":
                projectionAnimator?.SetTrigger("PlayManten");
                ApplyTheme(matManten);
                break;
            case "rampas":
                projectionAnimator?.SetTrigger("PlayRampas");
                ApplyTheme(matRampas);
                break;
            case "sri":
                projectionAnimator?.SetTrigger("PlaySri");
                ApplyTheme(matSri);
                break;
            case "lungguh":
                projectionAnimator?.SetTrigger("PlayLungguh");
                ApplyTheme(matLungguh);
                break;
            case "gedhong":
                projectionAnimator?.SetTrigger("PlayGedhong");
                ApplyTheme(matGedhong);
                break;
            case "lara":
                projectionAnimator?.SetTrigger("PlayLara");
                ApplyTheme(matLara);
                break;
            case "pati":
                projectionAnimator?.SetTrigger("PlayPati");
                ApplyTheme(matPati);
                break;
        }
    }

    private void ApplyTheme(Material mat)
    {
        if (mat == null) return;
        // Apply ke renderer projection mesh
        var renderer = GetComponent<Renderer>();
        if (renderer) renderer.material = mat;
    }
}
```

---

## Data Payload yang Diterima Unity

Setiap kali pengunjung submit di website, Unity menerima payload ini:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-10-13T18:00:00+07:00",
  "nama_latin": "Farrel Dio Imansyah",
  "aksara_jawa": "ꦥꦫꦼꦭ꧀ ꦢꦶꦴ ꦆꦩꦤ꧀ꦱꦪꦃ",
  "total_neptu": 127,
  "sisa_bagi": 1,
  "hasil_key": "lanang",
  "hasil_nama": "Jarak Lanang",
  "hasil_arti": "Kemenangan, kedigdayaan, damai",
  "metode": "poerwadarminta",
  "session_id": "sess_abc123xyz"
}
```

### Mapping `hasil_key` → Animasi Unity

| `hasil_key` | Tema Warna | Animasi Disarankan |
|-------------|------------|-------------------|
| `lanang`    | Emas/Kuning | Sinar matahari, wayang berdiri gagah |
| `manten`    | Hijau/Merah muda | Bunga mekar, tembang romantis |
| `rampas`    | Merah/Oranye | Ombak, api bergelombang |
| `sri`       | Kuning cerah | Hujan emas, kemakmuran |
| `lungguh`   | Biru/Perak | Singgasana, gemintang |
| `gedhong`   | Ungu/Emas | Gedung megah, cahaya kristal |
| `lara`      | Oranye/Merah | Api ujian, phoenix |
| `pati`      | Abu/Silver | Bulan sabit, transformasi |

---

## Polling Alternatif (Tanpa Realtime)

Jika Realtime sulit dikonfigurasi, Unity bisa polling via REST API:

```csharp
IEnumerator PollSupabase()
{
    while (true)
    {
        yield return new WaitForSeconds(2f); // Poll setiap 2 detik

        string url = $"{supabaseUrl}/rest/v1/petangan_submissions" +
                     "?select=*&order=created_at.desc&limit=1";

        using var request = UnityWebRequest.Get(url);
        request.SetRequestHeader("apikey", supabaseAnonKey);
        request.SetRequestHeader("Authorization", $"Bearer {supabaseAnonKey}");

        yield return request.SendWebRequest();

        if (request.result == UnityWebRequest.Result.Success)
        {
            var json = request.downloadHandler.text;
            // Parse dan trigger animasi
        }
    }
}
```

---

*Unity Integration Guide — Sasmita Aksara Projection System — 2026*
