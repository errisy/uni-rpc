using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Reactive.Subjects;

namespace UniRpc.WebApplication
{
    public class BaseMessage
    {
        public string Id { get; set; }
        public string Service { get; set; }
        public string Method { get; set; }
        public string[] GenericArguments { get; set; }
        public JsonElement Payload { get; set; }
    }
}
