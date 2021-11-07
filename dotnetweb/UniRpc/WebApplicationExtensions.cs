using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using System.Text.Json;

namespace UniRpc.WebApplication
{
    public static class WebApplicationExtensions
    {
        /// <summary>
        /// Receive a whole message from WebSocket
        /// </summary>
        /// <param name="websocket"></param>
        /// <returns></returns>
        public static async Task<byte[]> Receive(this WebSocket websocket)
        {
            var buffer = new byte[1024 * 4];
            bool reading = true;
            List<byte> list = new List<byte>();
            while (reading)
            {
                WebSocketReceiveResult result = await websocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                list.AddRange(buffer.Take(result.Count));
                reading = !result.EndOfMessage;
            }
            return list.ToArray();
        }

        public static T GetProperty<T>(this JsonElement element, string name)
        {
            return JsonSerializer.Deserialize<T>(element.GetProperty(name).GetRawText());
        }

        public static JsonElement AsElement<T>(this T value)
        {
            return JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(value));
        }
    }
}
