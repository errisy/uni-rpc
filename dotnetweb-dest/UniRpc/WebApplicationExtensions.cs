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

        public static byte[] Serialize(this BaseMessage message)
        {
            return JsonSerializer.SerializeToUtf8Bytes(message);
        }
        
        public static T GetProperty<T>(this JsonElement element, string name)
        {
            return JsonSerializer.Deserialize<T>(element.GetProperty(name).GetRawText());
        }

        public static object GetPropertyByReflection(this JsonElement element, string name)
        {
            var typeName = element.GetProperty(name).GetProperty("__reflection").GetString();
            return JsonSerializer.Deserialize(element.GetProperty(name).GetRawText(), Type.GetType(typeName));
        }
        
        public static JsonElement AsElement<T>(this T value)
        {
            return JsonSerializer.Deserialize<JsonElement>(JsonSerializer.Serialize(value));
        }

        public static BaseMessage ReturnMessage<T>(this BaseMessage item, T value)
        {
            return new BaseMessage
            {
                Id = item.Id,
                Service = item.Service,
                Method = item.Method,
                GenericArguments = item.GenericArguments,
                Payload = value.AsElement()
            };
        }
    }
}
