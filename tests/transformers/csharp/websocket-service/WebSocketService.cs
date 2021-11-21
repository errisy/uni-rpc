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
            Services.Add(service.__reflection, service);
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
                .Subscribe(async message =>
                {
                    if (Services.ContainsKey(message.Service))
                    {
                        var type = Services[message.Service];
                        var returnMessage = await Services[message.Service].__invoke(message);
                        sending.OnNext(returnMessage.Serialize());
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
    }
}
