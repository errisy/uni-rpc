using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.WebSockets;
using System.Reactive.Subjects;
using System.Reactive.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Text;
using System.Text.Json;
using System.Net;

namespace UniRpc.WebApplication
{
    public class WebSocketService
    {
        Subject<byte[]> receiving = new Subject<byte[]>();
        Subject<byte[]> sending = new Subject<byte[]>();
        WebSocket websocket;
        HttpContext context;

        public bool Running { get; set; }

        protected Dictionary<string, WebSocketServiceBase> Services = new Dictionary<string, WebSocketServiceBase>();

        public WebSocketService RegisterService<T>(T service) where T : WebSocketServiceBase
        {
            Services.Add(service.__name, service);
            return this;
        }

        public WebSocketService(HttpContext context, WebSocket websocket)
        {
            this.context = context;
            this.websocket = websocket;
            Running = true;
            sending.Subscribe(async data =>
            {
                await this.websocket.SendAsync(new ArraySegment<byte>(data, 0, data.Length), WebSocketMessageType.Text, true, CancellationToken.None);
            });
            var incomingJson = receiving
                .Select(data => Encoding.UTF8.GetString(data))
                .Select(text =>
                {
                    try
                    {
                        var json = JsonSerializer.Deserialize<BaseMessage>(text);
                        return json;
                    }
                    catch (Exception ex)
                    {
                        return null;
                    }
                })
                .Where(json => json != null);

            incomingJson
                .Subscribe(message =>
                {
                    if (Services.ContainsKey(message.Service))
                    {
                        var type = Services[message.Service];
                        Services[message.Service].__invoke(message);
                    }
                });
        }

        public async Task KeepReceiving()
        {
            while (Running)
            {
                var message = await websocket.Receive();
                receiving.OnNext(message);
            }
        }

        void Echo(BodyBase obj)
        {
            sending.OnNext(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(obj)));
        }

        async Task KEGGApi(BodyBase obj)
        {
            WebClient webClient = new WebClient();
            var text = await webClient.DownloadStringTaskAsync(new Uri($"http://rest.kegg.jp/{obj.Method}/{obj.value}"));
            obj.value = text;
            sending.OnNext(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(obj)));
        }
    }
}
